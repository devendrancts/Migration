// ─────────────────────────────────────────────────────────
// Graph Query Helpers
// High-level queries over the ProjectGraph for skills and tools.
// ─────────────────────────────────────────────────────────

import type { ProjectGraph, GraphNode, GraphEdge, GraphEdgeKind, ClassRole } from './project-graph.js';

// ── Node Lookups ──

export function getNode(graph: ProjectGraph, id: string): GraphNode | undefined {
  return graph.nodes.get(id);
}

export function findNodeByName(graph: ProjectGraph, name: string): GraphNode | undefined {
  for (const node of graph.nodes.values()) {
    if (node.name === name) return node;
  }
  return undefined;
}

export function findNodesByRole(graph: ProjectGraph, role: ClassRole): GraphNode[] {
  return Array.from(graph.nodes.values()).filter((n) => n.role === role);
}

export function findNodesByKind(graph: ProjectGraph, kind: GraphNode['kind']): GraphNode[] {
  return Array.from(graph.nodes.values()).filter((n) => n.kind === kind);
}

export function findNodesByNamespace(graph: ProjectGraph, namespace: string): GraphNode[] {
  return Array.from(graph.nodes.values()).filter((n) => n.namespace === namespace);
}

export function findNodesByAttribute(graph: ProjectGraph, attribute: string): GraphNode[] {
  return Array.from(graph.nodes.values()).filter((n) =>
    n.attributes.some((a) => a.toLowerCase().includes(attribute.toLowerCase())),
  );
}

// ── Edge Queries ──

export function getEdgesFrom(graph: ProjectGraph, nodeId: string, kind?: GraphEdgeKind): GraphEdge[] {
  return graph.edges.filter((e) => e.from === nodeId && (!kind || e.kind === kind));
}

export function getEdgesTo(graph: ProjectGraph, nodeId: string, kind?: GraphEdgeKind): GraphEdge[] {
  return graph.edges.filter((e) => e.to === nodeId && (!kind || e.kind === kind));
}

// ── Relationship Queries ──

/** Get all classes that inherit from a given base class */
export function findSubclasses(graph: ProjectGraph, baseClassId: string): GraphNode[] {
  return getEdgesTo(graph, baseClassId, 'inherits')
    .map((e) => graph.nodes.get(e.from))
    .filter((n): n is GraphNode => n !== undefined);
}

/** Get the full inheritance chain (walk up) */
export function getInheritanceChain(graph: ProjectGraph, nodeId: string): GraphNode[] {
  const chain: GraphNode[] = [];
  let current = nodeId;

  while (current) {
    const parentEdge = graph.edges.find((e) => e.from === current && e.kind === 'inherits');
    if (!parentEdge) break;

    const parentNode = graph.nodes.get(parentEdge.to);
    if (!parentNode || chain.some((n) => n.id === parentNode.id)) break; // prevent cycles

    chain.push(parentNode);
    current = parentEdge.to;
  }

  return chain;
}

/** Get all classes that implement a given interface */
export function findImplementors(graph: ProjectGraph, interfaceId: string): GraphNode[] {
  return getEdgesTo(graph, interfaceId, 'implements')
    .map((e) => graph.nodes.get(e.from))
    .filter((n): n is GraphNode => n !== undefined);
}

/** Get all dependencies injected into a class (constructor params) */
export function getDependencies(graph: ProjectGraph, nodeId: string): GraphNode[] {
  return getEdgesFrom(graph, nodeId, 'injects')
    .map((e) => graph.nodes.get(e.to))
    .filter((n): n is GraphNode => n !== undefined);
}

/** Get all classes that depend on (inject) a given type */
export function getDependents(graph: ProjectGraph, nodeId: string): GraphNode[] {
  return getEdgesTo(graph, nodeId, 'injects')
    .map((e) => graph.nodes.get(e.from))
    .filter((n): n is GraphNode => n !== undefined);
}

/** Get all types that a class calls (method invocations) */
export function getCallTargets(graph: ProjectGraph, nodeId: string): GraphNode[] {
  return getEdgesFrom(graph, nodeId, 'calls')
    .map((e) => graph.nodes.get(e.to))
    .filter((n): n is GraphNode => n !== undefined);
}

/** Get all types that call a given class */
export function getCallers(graph: ProjectGraph, nodeId: string): GraphNode[] {
  return getEdgesTo(graph, nodeId, 'calls')
    .map((e) => graph.nodes.get(e.from))
    .filter((n): n is GraphNode => n !== undefined);
}

/** Get all types referenced by a class (property types, method params, etc.) */
export function getReferences(graph: ProjectGraph, nodeId: string): GraphNode[] {
  return getEdgesFrom(graph, nodeId, 'references')
    .map((e) => graph.nodes.get(e.to))
    .filter((n): n is GraphNode => n !== undefined);
}

// ── Bounded Context Detection ──

/** Get namespace clusters that look like bounded contexts */
export function getBoundedContextCandidates(graph: ProjectGraph): { namespace: string; nodes: GraphNode[] }[] {
  const results: { namespace: string; nodes: GraphNode[] }[] = [];

  for (const cluster of graph.namespaces.values()) {
    if (!cluster.possibleBoundedContext) continue;

    const nodes = cluster.nodeIds
      .map((id) => graph.nodes.get(id))
      .filter((n): n is GraphNode => n !== undefined);

    results.push({ namespace: cluster.namespace, nodes });
  }

  return results;
}

// ── Path Finding ──

/** Find shortest path between two nodes (BFS) */
export function findPath(graph: ProjectGraph, fromId: string, toId: string): GraphEdge[] | null {
  if (fromId === toId) return [];

  const visited = new Set<string>();
  const queue: { nodeId: string; path: GraphEdge[] }[] = [{ nodeId: fromId, path: [] }];

  while (queue.length > 0) {
    const { nodeId, path } = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const outEdges = graph.edges.filter((e) => e.from === nodeId);
    for (const edge of outEdges) {
      if (edge.to === toId) return [...path, edge];
      if (!visited.has(edge.to)) {
        queue.push({ nodeId: edge.to, path: [...path, edge] });
      }
    }

    // Also traverse incoming edges for undirected search
    const inEdges = graph.edges.filter((e) => e.to === nodeId);
    for (const edge of inEdges) {
      if (edge.from === toId) return [...path, edge];
      if (!visited.has(edge.from)) {
        queue.push({ nodeId: edge.from, path: [...path, edge] });
      }
    }
  }

  return null;
}

// ── God Nodes (most connected) ──

export function getGodNodes(graph: ProjectGraph, limit = 10): { node: GraphNode; edgeCount: number }[] {
  const edgeCounts = new Map<string, number>();

  for (const edge of graph.edges) {
    edgeCounts.set(edge.from, (edgeCounts.get(edge.from) ?? 0) + 1);
    edgeCounts.set(edge.to, (edgeCounts.get(edge.to) ?? 0) + 1);
  }

  return Array.from(edgeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({ node: graph.nodes.get(id)!, edgeCount: count }))
    .filter((entry) => entry.node !== undefined);
}

// ── Orphans (disconnected nodes) ──

export function getOrphanNodes(graph: ProjectGraph): GraphNode[] {
  const connected = new Set<string>();
  for (const edge of graph.edges) {
    connected.add(edge.from);
    connected.add(edge.to);
  }
  return Array.from(graph.nodes.values()).filter((n) => !connected.has(n.id));
}

// ── Summary for MCP output ──

export function generateGraphSummary(graph: ProjectGraph): string {
  const s = graph.stats;
  const godNodes = getGodNodes(graph, 5);
  const contexts = getBoundedContextCandidates(graph);

  const lines = [
    `## Project Knowledge Graph`,
    ``,
    `**${s.totalNodes} nodes** · **${s.totalEdges} edges** · **${s.namespaceCount} namespaces**`,
    ``,
    `### Node Breakdown`,
    `| Role | Count |`,
    `|------|-------|`,
    `| Controllers | ${s.controllers} |`,
    `| Services | ${s.services} |`,
    `| Repositories | ${s.repositories} |`,
    `| Entities | ${s.entities} |`,
    `| Interfaces | ${s.interfaces} |`,
    `| Enums | ${s.enums} |`,
    `| DI Registrations | ${s.diRegistrations} |`,
    `| Orphan Nodes | ${s.orphanNodes} |`,
    ``,
    `### Most Connected (God Nodes)`,
    ...godNodes.map((g, i) => `${i + 1}. \`${g.node.name}\` (${g.node.role}) — ${g.edgeCount} edges`),
    ``,
  ];

  if (contexts.length > 0) {
    lines.push(`### Bounded Context Candidates`);
    for (const ctx of contexts) {
      const roles = ctx.nodes.map((n) => n.role).filter((r) => r !== 'unknown');
      lines.push(`- **${ctx.namespace}** — ${ctx.nodes.length} types (${[...new Set(roles)].join(', ')})`);
    }
  }

  return lines.join('\n');
}
