import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { detectPlatform } from '../analyzer/platform-detector.js';
import { WizardSession } from '../wizard/wizard-session.js';
import { getStepDefinition } from '../wizard/wizard-steps.js';
import type { WizardStep } from '../wizard/wizard-types.js';

export function registerAllTools(server: McpServer): void {
  // ── analyze_project ──
  server.tool(
    'analyze_project',
    'Analyze a .NET project to detect framework version, patterns, and dependencies.',
    { projectPath: z.string() },
    async ({ projectPath }) => {
      const platformInfo = detectPlatform(projectPath);
      const result = {
        sourcePlatform: platformInfo,
        projectPath,
        analyzedAt: new Date().toISOString(),
      };
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
