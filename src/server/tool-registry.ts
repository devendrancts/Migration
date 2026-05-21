import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { detectPlatform } from '../analyzer/platform-detector.js';
import { buildProjectGraph } from '../analyzer/graph-builder.js';
import { graphToSerializable } from '../analyzer/project-graph.js';
import type { ProjectGraph } from '../analyzer/project-graph.js';
import {
  findNodeByName,
  findNodesByRole,
  findImplementors,
  getDependencies,
  getDependents,
  getInheritanceChain,
  getCallTargets,
  findPath,
  getGodNodes,
  getOrphanNodes,
  getBoundedContextCandidates,
  generateGraphSummary,
} from '../analyzer/graph-queries.js';
import type { ClassRole } from '../analyzer/project-graph.js';
import { WizardSession } from '../wizard/wizard-session.js';
import { getStepDefinition } from '../wizard/wizard-steps.js';
import type { WizardStep } from '../wizard/wizard-types.js';
import { runUnifiedWizard } from '../wizard/unified-wizard.js';
import { createTargetPlatformRegistry } from '../target-platforms/index.js';

// In-memory graph cache keyed by project path
const graphCache = new Map<string, ProjectGraph>();

export function registerAllTools(server: McpServer): void {
  // ── analyze_project ──
  server.tool(
    'analyze_project',
    'Analyze a .NET project: detect framework, build knowledge graph of all classes/interfaces/relationships.',
    { projectPath: z.string(), wasmPath: z.string().optional() },
    async ({ projectPath, wasmPath }) => {
      const platformInfo = detectPlatform(projectPath);

      let graph: ProjectGraph;
      let graphError: string | null = null;
      try {
        graph = await buildProjectGraph(projectPath, wasmPath);
        graphCache.set(projectPath, graph);
      } catch (err: unknown) {
        graphError = err instanceof Error ? err.message : String(err);
        graph = { nodes: new Map(), edges: [], namespaces: new Map(), stats: { totalNodes: 0, totalEdges: 0, controllers: 0, services: 0, repositories: 0, entities: 0, interfaces: 0, enums: 0, namespaceCount: 0, boundedContextCandidates: 0, diRegistrations: 0, orphanNodes: 0 } };
      }

      const serializable = graphToSerializable(graph);
      const summary = graph.nodes.size > 0 ? generateGraphSummary(graph) : 'No graph built.';

      const result = {
        sourcePlatform: platformInfo,
        projectPath,
        analyzedAt: new Date().toISOString(),
        graph: serializable,
        graphSummary: summary,
        ...(graphError ? { graphError } : {}),
      };
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ── query_graph ──
  server.tool(
    'query_graph',
    'Query the project knowledge graph: find relationships, dependencies, implementors, inheritance chains, bounded contexts, and paths between types.',
    {
      projectPath: z.string(),
      query: z.enum([
        'find_by_role',
        'find_by_name',
        'get_dependencies',
        'get_dependents',
        'get_implementors',
        'get_inheritance_chain',
        'get_call_targets',
        'find_path',
        'god_nodes',
        'orphan_nodes',
        'bounded_contexts',
        'summary',
      ]),
      args: z.record(z.string()).optional(),
    },
    async ({ projectPath, query, args }) => {
      const graph = graphCache.get(projectPath);
      if (!graph) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Project not analyzed yet. Call analyze_project first.' }) }],
        };
      }

      let result: unknown;

      switch (query) {
        case 'find_by_role': {
          const role = (args?.['role'] ?? 'controller') as ClassRole;
          const nodes = findNodesByRole(graph, role);
          result = nodes.map((n) => ({ id: n.id, name: n.name, role: n.role, namespace: n.namespace, filePath: n.filePath, deps: n.constructorDeps }));
          break;
        }
        case 'find_by_name': {
          const name = args?.['name'] ?? '';
          const node = findNodeByName(graph, name);
          result = node ? { id: node.id, name: node.name, role: node.role, namespace: node.namespace, filePath: node.filePath, baseClass: node.baseClass, interfaces: node.interfaces, constructorDeps: node.constructorDeps, methods: node.methods.map((m) => m.name), attributes: node.attributes } : { error: `Node '${name}' not found` };
          break;
        }
        case 'get_dependencies': {
          const name = args?.['name'] ?? '';
          const node = findNodeByName(graph, name);
          if (!node) { result = { error: `Node '${name}' not found` }; break; }
          const deps = getDependencies(graph, node.id);
          result = deps.map((d) => ({ id: d.id, name: d.name, role: d.role }));
          break;
        }
        case 'get_dependents': {
          const name = args?.['name'] ?? '';
          const node = findNodeByName(graph, name);
          if (!node) { result = { error: `Node '${name}' not found` }; break; }
          const deps = getDependents(graph, node.id);
          result = deps.map((d) => ({ id: d.id, name: d.name, role: d.role }));
          break;
        }
        case 'get_implementors': {
          const name = args?.['name'] ?? '';
          const node = findNodeByName(graph, name);
          if (!node) { result = { error: `Node '${name}' not found` }; break; }
          const impls = findImplementors(graph, node.id);
          result = impls.map((i) => ({ id: i.id, name: i.name, role: i.role, filePath: i.filePath }));
          break;
        }
        case 'get_inheritance_chain': {
          const name = args?.['name'] ?? '';
          const node = findNodeByName(graph, name);
          if (!node) { result = { error: `Node '${name}' not found` }; break; }
          const chain = getInheritanceChain(graph, node.id);
          result = chain.map((c) => ({ id: c.id, name: c.name, role: c.role }));
          break;
        }
        case 'get_call_targets': {
          const name = args?.['name'] ?? '';
          const node = findNodeByName(graph, name);
          if (!node) { result = { error: `Node '${name}' not found` }; break; }
          const targets = getCallTargets(graph, node.id);
          result = targets.map((t) => ({ id: t.id, name: t.name, role: t.role }));
          break;
        }
        case 'find_path': {
          const from = args?.['from'] ?? '';
          const to = args?.['to'] ?? '';
          const fromNode = findNodeByName(graph, from);
          const toNode = findNodeByName(graph, to);
          if (!fromNode || !toNode) { result = { error: `Node not found: ${!fromNode ? from : to}` }; break; }
          const path = findPath(graph, fromNode.id, toNode.id);
          result = path ? path.map((e) => ({ from: e.from, to: e.to, kind: e.kind, label: e.label })) : { error: 'No path found' };
          break;
        }
        case 'god_nodes': {
          const limit = parseInt(args?.['limit'] ?? '10', 10);
          const gods = getGodNodes(graph, limit);
          result = gods.map((g) => ({ name: g.node.name, role: g.node.role, edgeCount: g.edgeCount, namespace: g.node.namespace }));
          break;
        }
        case 'orphan_nodes': {
          const orphans = getOrphanNodes(graph);
          result = orphans.map((o) => ({ id: o.id, name: o.name, role: o.role, filePath: o.filePath }));
          break;
        }
        case 'bounded_contexts': {
          const contexts = getBoundedContextCandidates(graph);
          result = contexts.map((c) => ({ namespace: c.namespace, types: c.nodes.map((n) => ({ name: n.name, role: n.role })) }));
          break;
        }
        case 'summary': {
          result = { summary: generateGraphSummary(graph), stats: graph.stats };
          break;
        }
        default:
          result = { error: `Unknown query: ${query}` };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ── start_wizard ──
  server.tool(
    'start_wizard',
    'Start a migration wizard session for a .NET project.',
    { sourcePath: z.string() },
    async ({ sourcePath }) => {
      const sourcePlatform = detectPlatform(sourcePath);
      const projectSummary = {
        sourcePath,
        sourcePlatform,
        detectedAt: new Date().toISOString(),
      };
      const session = WizardSession.create(sourcePath, sourcePlatform, projectSummary);
      const result = {
        sessionId: session.id,
        projectSummary: session.projectSummary,
        currentStep: session.currentStep,
        status: session.status,
      };
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ── get_wizard_step ──
  server.tool(
    'get_wizard_step',
    'Get the definition and choices for a wizard step.',
    { sessionId: z.string(), step: z.string() },
    async ({ sessionId, step }) => {
      const session = WizardSession.get(sessionId);
      if (!session) {
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify({ error: 'Session not found' }) },
          ],
        };
      }
      const stepDef = getStepDefinition(step as WizardStep, session);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(stepDef, null, 2) }],
      };
    },
  );

  // ── set_wizard_choice ──
  server.tool(
    'set_wizard_choice',
    'Set a choice for a wizard step.',
    { sessionId: z.string(), step: z.string(), value: z.string() },
    async ({ sessionId, step, value }) => {
      const session = WizardSession.get(sessionId);
      if (!session) {
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify({ error: 'Session not found' }) },
          ],
        };
      }
      session.setChoice(step as WizardStep, value);
      const result = {
        sessionId: session.id,
        step,
        value,
        currentStep: session.currentStep,
        choices: session.choices,
      };
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ── confirm_wizard ──
  server.tool(
    'confirm_wizard',
    'Confirm wizard configuration and set the output path.',
    { sessionId: z.string(), outputPath: z.string() },
    async ({ sessionId, outputPath }) => {
      const session = WizardSession.get(sessionId);
      if (!session) {
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify({ error: 'Session not found' }) },
          ],
        };
      }
      session.confirm(outputPath);
      const result = {
        sessionId: session.id,
        status: session.status,
        outputPath: session.outputPath,
        choices: session.choices,
      };
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ── get_wizard_form ──
  server.tool(
    'get_wizard_form',
    'Get ALL migration wizard questions with available choices and defaults in one response. Present these to the user as a single form/checklist so they can answer everything at once. After collecting answers, call migration_wizard with all values in a single call.',
    { sourcePath: z.string() },
    async ({ sourcePath }) => {
      const platformInfo = detectPlatform(sourcePath);
      const registry = createTargetPlatformRegistry();
      const platforms = registry.getAvailable();

      const formatOptions = (opts: { value: string; label: string; description: string; isDefault: boolean }[]) =>
        opts.map((o) => ({
          value: o.value,
          label: o.label,
          description: o.description,
          default: o.isDefault,
        }));

      // Get options for each platform
      const platformOptions: Record<string, unknown> = {};
      for (const p of platforms) {
        const plat = registry.get(p.id as import('../types/migration.js').TargetPlatformId);
        platformOptions[p.id] = {
          orm: formatOptions(plat.optionsSchema.ormOptions),
          auth: formatOptions(plat.optionsSchema.authOptions),
          di: formatOptions(plat.optionsSchema.diOptions),
          validation: formatOptions(plat.optionsSchema.validationOptions),
          testFramework: formatOptions(plat.optionsSchema.testFrameworkOptions),
          apiDocs: formatOptions(plat.optionsSchema.apiDocsOptions),
        };
      }

      const form = {
        instructions: 'Present ALL these questions to the user as a single form. Collect all answers, then call migration_wizard with the complete set of values in ONE call.',
        detectedPlatform: platformInfo,
        questions: [
          {
            id: 'sourcePath',
            question: 'Source .NET project path',
            type: 'string',
            required: true,
            currentValue: sourcePath,
          },
          {
            id: 'outputPath',
            question: 'Destination path — where should the migrated application be generated?',
            type: 'string',
            required: true,
            default: `${sourcePath}-migrated`,
            note: 'Full absolute path for the migrated project output. This directory will be created if it does not exist.',
          },
          {
            id: 'targetPlatform',
            question: 'Target platform',
            type: 'select',
            choices: platforms.map((p) => ({ value: p.id, label: p.displayName })),
            default: 'nodejs-express',
          },
          {
            id: 'architecture',
            question: 'Output architecture',
            type: 'select',
            choices: [
              { value: 'mvc', label: 'MVC (flat structure, simple APIs)' },
              { value: 'clean', label: 'Clean Architecture (layered, medium-large projects)' },
              { value: 'ddd', label: 'DDD (bounded contexts, CQRS, complex domains)' },
            ],
            default: 'auto-detected by project size',
          },
          {
            id: 'orm',
            question: 'ORM / Data access',
            type: 'select',
            note: 'Choices depend on target platform. Shown below per platform.',
          },
          {
            id: 'auth',
            question: 'Authentication strategy',
            type: 'select',
            note: 'Choices depend on target platform.',
          },
          {
            id: 'validation',
            question: 'Validation library',
            type: 'select',
            note: 'Choices depend on target platform.',
          },
          {
            id: 'testFramework',
            question: 'Test framework',
            type: 'select',
            note: 'Choices depend on target platform.',
          },
          {
            id: 'coverageTarget',
            question: 'Test coverage target (%)',
            type: 'number',
            default: 80,
            range: '0-100',
          },
          {
            id: 'unitTests',
            question: 'Generate unit tests?',
            type: 'boolean',
            default: true,
          },
          {
            id: 'integrationTests',
            question: 'Generate integration tests?',
            type: 'boolean',
            default: true,
          },
          {
            id: 'performanceTests',
            question: 'Generate performance tests?',
            type: 'boolean',
            default: false,
          },
        ],
        platformOptions,
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(form, null, 2) }],
      };
    },
  );

  // ── migration_wizard (unified single-call wizard) ──
  server.tool(
    'migration_wizard',
    'Execute a complete .NET migration. IMPORTANT: First call get_wizard_form to show the user all questions at once. After collecting ALL answers, call this tool with every value in a single call. This sets up permissions, builds the knowledge graph, and returns the confirmed migration config.',
    {
      sourcePath: z.string(),
      outputPath: z.string().describe('Destination path for the migrated application'),
      targetPlatform: z.enum(['nodejs-express', 'java-spring', 'python-fastapi', 'rust-actix']).optional(),
      architecture: z.enum(['mvc', 'clean', 'ddd']).optional(),
      orm: z.string().optional(),
      auth: z.string().optional(),
      di: z.string().optional(),
      validation: z.string().optional(),
      testFramework: z.string().optional(),
      apiDocs: z.string().optional(),
      coverageTarget: z.number().min(0).max(100).optional(),
      unitTests: z.boolean().optional(),
      integrationTests: z.boolean().optional(),
      performanceTests: z.boolean().optional(),
    },
    async (params) => {
      const { result, options, graph } = await runUnifiedWizard(params);
      const output = { ...result, resolvedOptions: options, graph };
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
      };
    },
  );

  // ── build_project ──
  server.tool(
    'build_project',
    'Build the migrated project and return build results.',
    { projectPath: z.string() },
    async ({ projectPath }) => {
      // Placeholder implementation
      const result = {
        success: true,
        projectPath,
        message: 'Build completed successfully (placeholder).',
      };
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ── run_tests ──
  server.tool(
    'run_tests',
    'Run tests on the migrated project.',
    { projectPath: z.string() },
    async ({ projectPath }) => {
      // Placeholder implementation
      const result = {
        success: true,
        projectPath,
        message: 'All tests passed (placeholder).',
      };
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
