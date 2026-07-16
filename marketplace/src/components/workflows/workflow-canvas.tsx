'use client';

import { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Connection,
  Controls,
  Edge,
  MarkerType,
  Node,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  Handle,
  Position,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';

export interface WfNode {
  id: string;
  type: 'input' | 'agent' | 'prompt' | 'output' | 'condition';
  position: { x: number; y: number };
  data: { slug?: string; label?: string; [k: string]: unknown };
}
export interface WfEdge {
  from: string;
  to: string;
}
export interface WfDefinition {
  nodes: WfNode[];
  edges: WfEdge[];
}

const NODE_COLORS: Record<string, string> = {
  input: 'border-blue-500 bg-blue-50 dark:bg-blue-950',
  prompt: 'border-purple-500 bg-purple-50 dark:bg-purple-950',
  agent: 'border-green-500 bg-green-50 dark:bg-green-950',
  output: 'border-orange-500 bg-orange-50 dark:bg-orange-950',
  condition: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950',
};

const NODE_LABELS: Record<string, string> = {
  input: '입력',
  prompt: '프롬프트',
  agent: '에이전트',
  output: '출력',
  condition: '조건',
};

interface CustomNodeData {
  label?: string;
  slug?: string;
  nodeType: string;
  stepStatus?: string;
}

function CustomNode({ data }: NodeProps<CustomNodeData>) {
  const t = data.nodeType;
  const cls = NODE_COLORS[t] ?? 'border-gray-400';
  const isSource = t !== 'output';
  const isTarget = t !== 'input';
  return (
    <div className={`px-3 py-2 rounded-md border-2 min-w-[140px] text-center ${cls}`}>
      {isTarget && <Handle type="target" position={Position.Left} />}
      <div className="text-[10px] font-mono uppercase opacity-70">{NODE_LABELS[t] ?? t}</div>
      <div className="text-sm font-medium">{data.label ?? data.slug ?? t}</div>
      {data.slug && t !== 'input' && t !== 'output' && (
        <div className="text-[10px] text-muted-foreground mt-1 font-mono">{data.slug}</div>
      )}
      {data.stepStatus && (
        <div
          className={`text-[10px] mt-1 ${
            data.stepStatus === 'success'
              ? 'text-green-600'
              : data.stepStatus === 'error'
                ? 'text-red-600'
                : 'text-gray-500'
          }`}
        >
          ● {data.stepStatus}
        </div>
      )}
      {isSource && <Handle type="source" position={Position.Right} />}
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

interface CanvasProps {
  definition: WfDefinition;
  readOnly?: boolean;
  stepStatuses?: Record<string, string>;
  onChange?: (def: WfDefinition) => void;
  onSelectNode?: (node: WfNode | null) => void;
}

function toRfNodes(def: WfDefinition, stepStatuses?: Record<string, string>): Node[] {
  return def.nodes.map((n) => ({
    id: n.id,
    type: 'custom',
    position: n.position ?? { x: 0, y: 0 },
    data: {
      label: n.data?.label ?? n.id,
      slug: n.data?.slug,
      nodeType: n.type,
      stepStatus: stepStatuses?.[n.id],
    },
  }));
}

function toRfEdges(def: WfDefinition): Edge[] {
  return def.edges.map((e, i) => ({
    id: `e-${i}-${e.from}-${e.to}`,
    source: e.from,
    target: e.to,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed },
  }));
}

function CanvasInner({ definition, readOnly, stepStatuses, onChange, onSelectNode }: CanvasProps) {
  const initialNodes = useMemo(() => toRfNodes(definition, stepStatuses), [definition, stepStatuses]);
  const initialEdges = useMemo(() => toRfEdges(definition), [definition]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync when external definition changes (e.g. parent reloads)
  useEffect(() => {
    setNodes(toRfNodes(definition, stepStatuses));
    setEdges(toRfEdges(definition));
  }, [definition, stepStatuses, setNodes, setEdges]);

  const emit = useCallback(
    (rfNodes: Node[], rfEdges: Edge[]) => {
      if (!onChange) return;
      const nodesOut: WfNode[] = rfNodes.map((n) => {
        const matched = definition.nodes.find((x) => x.id === n.id);
        const t = (matched?.type ?? (n.data as CustomNodeData).nodeType ?? 'prompt') as WfNode['type'];
        const data = matched?.data ?? {};
        return {
          id: n.id,
          type: t,
          position: { x: n.position.x, y: n.position.y },
          data: {
            ...data,
            label: (n.data as CustomNodeData).label,
            slug: (n.data as CustomNodeData).slug,
          },
        };
      });
      const edgesOut: WfEdge[] = rfEdges.map((e) => ({ from: e.source, to: e.target }));
      onChange({ nodes: nodesOut, edges: edgesOut });
    },
    [onChange, definition.nodes],
  );

  const handleConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target) return;
      const next = addEdge(
        { ...c, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
        edges,
      );
      setEdges(next);
      emit(nodes, next);
    },
    [edges, nodes, setEdges, emit],
  );

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={(changes) => {
          onNodesChange(changes);
          // emit position changes
          if (onChange) {
            // best-effort: sync after a tick
            setTimeout(() => emit(nodes, edges), 0);
          }
        }}
        onEdgesChange={(changes) => {
          onEdgesChange(changes);
          if (onChange) setTimeout(() => emit(nodes, edges), 0);
        }}
        onConnect={handleConnect}
        onNodeClick={(_, node) => {
          if (onSelectNode) {
            const matched = definition.nodes.find((x) => x.id === node.id) ?? null;
            onSelectNode(matched);
          }
        }}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        fitView
      >
        <Background gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export function WorkflowCanvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
