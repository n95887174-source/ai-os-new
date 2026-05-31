import type { DebateArgument, DebateParticipant } from '../../contracts/debate-types';

export interface CompiledNode {
  id: string;
  type: 'argument' | 'counter' | 'synthesis' | 'decision' | 'refinement';
  agentId: string;
  agentName: string;
  content: string;
  round: number;
  parentId: string | null;
  timestamp: number;
  weight: number;
}

export interface CompiledEdge {
  from: string;
  to: string;
  type: 'supports' | 'counters' | 'refines' | 'synthesizes';
}

export interface CompiledDAG {
  nodes: CompiledNode[];
  edges: CompiledEdge[];
  rounds: number;
  participantIds: string[];
}

export class DebateCompiler {
  compile(
    arguments_: DebateArgument[],
    participants: DebateParticipant[],
  ): CompiledDAG {
    const nameMap = new Map(participants.map(p => [p.id, p.name]));
    const roleMap = new Map(participants.map(p => [p.id, p.role]));

    const nodes: CompiledNode[] = arguments_.map(arg => ({
      id: arg.id,
      type: this.classifyNodeType(arg, arguments_),
      agentId: arg.agentId,
      agentName: nameMap.get(arg.agentId) || arg.agentId,
      content: arg.content,
      round: arg.round,
      parentId: arg.parentId || null,
      timestamp: arg.timestamp,
      weight: arg.confidence,
    }));

    const edges: CompiledEdge[] = [];
    for (const node of nodes) {
      if (node.parentId) {
        const parent = nodes.find(n => n.id === node.parentId);
        if (parent) {
          edges.push({
            from: parent.id,
            to: node.id,
            type: this.inferEdgeType(parent, node, roleMap),
          });
        }
      }
    }

    const rounds = Math.max(0, ...nodes.map(n => n.round));
    const participantIds = [...new Set(nodes.map(n => n.agentId))];

    return { nodes, edges, rounds, participantIds };
  }

  replay(dag: CompiledDAG, fromRound: number, toRound: number): CompiledNode[] {
    return dag.nodes
      .filter(n => n.round >= fromRound && n.round <= toRound)
      .sort((a, b) => a.round - b.round || a.timestamp - b.timestamp);
  }

  getImpactScores(dag: CompiledDAG): Map<string, number> {
    const scores = new Map<string, number>();
    for (const node of dag.nodes) {
      const outgoing = dag.edges.filter(e => e.from === node.id).length;
      const incoming = dag.edges.filter(e => e.to === node.id).length;
      scores.set(node.id, node.weight * 0.4 + outgoing * 0.3 + incoming * 0.3);
    }
    return scores;
  }

  private classifyNodeType(
    arg: DebateArgument,
    allArgs: DebateArgument[],
  ): CompiledNode['type'] {
    if (arg.parentId) {
      const parent = allArgs.find(a => a.id === arg.parentId);
      if (parent && parent.agentId !== arg.agentId) return 'counter';
      return 'refinement';
    }
    if (arg.round === 0) return 'argument';
    return 'argument';
  }

  private inferEdgeType(
    parent: CompiledNode,
    child: CompiledNode,
    roleMap: Map<string, string>,
  ): CompiledEdge['type'] {
    if (parent.agentId === child.agentId) return 'refines';
    const parentRole = roleMap.get(parent.agentId);
    const childRole = roleMap.get(child.agentId);
    if (parentRole !== childRole && parentRole !== 'neutral' && childRole !== 'neutral') {
      return 'counters';
    }
    return 'supports';
  }
}
