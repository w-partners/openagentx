'use client';

import { useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WorkflowCanvas, type WfDefinition, type WfNode } from './workflow-canvas';

const NODE_PALETTE: { type: WfNode['type']; label: string; defaultData: Record<string, unknown> }[] = [
  { type: 'input', label: '입력 노드', defaultData: { label: '입력' } },
  { type: 'prompt', label: '프롬프트 노드', defaultData: { slug: '', label: '프롬프트' } },
  { type: 'agent', label: '에이전트 노드', defaultData: { slug: '', label: '에이전트' } },
  { type: 'output', label: '출력 노드', defaultData: { label: '출력' } },
];

export interface WorkflowEditorState {
  name: string;
  description: string;
  definition: WfDefinition;
  category: string;
  is_public: boolean;
}

interface Props {
  initial: WorkflowEditorState;
  saving: boolean;
  onSave: (next: WorkflowEditorState) => Promise<void> | void;
}

export function WorkflowEditor({ initial, saving, onSave }: Props) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [category, setCategory] = useState(initial.category);
  const [isPublic, setIsPublic] = useState(initial.is_public);
  const [definition, setDefinition] = useState<WfDefinition>(initial.definition);
  const [selected, setSelected] = useState<WfNode | null>(null);

  const handleAddNode = useCallback(
    (type: WfNode['type']) => {
      const id = `${type}-${Date.now().toString(36).slice(-4)}`;
      const x = 120 + Math.random() * 400;
      const y = 80 + Math.random() * 300;
      const palette = NODE_PALETTE.find((p) => p.type === type)!;
      const newNode: WfNode = {
        id,
        type,
        position: { x, y },
        data: { ...palette.defaultData },
      };
      setDefinition((prev) => ({
        nodes: [...prev.nodes, newNode],
        edges: prev.edges,
      }));
    },
    [],
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selected) return;
    setDefinition((prev) => ({
      nodes: prev.nodes.filter((n) => n.id !== selected.id),
      edges: prev.edges.filter((e) => e.from !== selected.id && e.to !== selected.id),
    }));
    setSelected(null);
  }, [selected]);

  const handleUpdateSelected = useCallback(
    (patch: Partial<WfNode['data']>) => {
      if (!selected) return;
      setDefinition((prev) => ({
        nodes: prev.nodes.map((n) =>
          n.id === selected.id ? { ...n, data: { ...n.data, ...patch } } : n,
        ),
        edges: prev.edges,
      }));
      setSelected({ ...selected, data: { ...selected.data, ...patch } });
    },
    [selected],
  );

  const handleSave = () => {
    onSave({ name, description, definition, category, is_public: isPublic });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">이름</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 코드 리뷰 파이프라인" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">카테고리</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="general" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">설명</label>
            <textarea
              className="w-full p-2 rounded-md border bg-background text-sm min-h-[60px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 워크플로우는..."
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            공개 (다른 사용자도 사용/실행 가능)
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[180px_1fr_240px]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">노드 팔레트</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {NODE_PALETTE.map((p) => (
              <Button
                key={p.type}
                variant="outline"
                className="w-full justify-start text-xs"
                onClick={() => handleAddNode(p.type)}
              >
                + {p.label}
              </Button>
            ))}
            <div className="pt-3 border-t mt-3">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                노드끼리 선으로 연결하면 데이터가 흐릅니다. 드래그로 위치 변경.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">캔버스</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[460px] border rounded">
              <WorkflowCanvas
                definition={definition}
                onChange={setDefinition}
                onSelectNode={setSelected}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">노드 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selected ? (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">ID</label>
                  <Input value={selected.id} readOnly className="font-mono text-xs" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">타입</label>
                  <Input value={selected.type} readOnly className="font-mono text-xs" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">레이블</label>
                  <Input
                    value={(selected.data?.label as string) ?? ''}
                    onChange={(e) => handleUpdateSelected({ label: e.target.value })}
                  />
                </div>
                {(selected.type === 'prompt' || selected.type === 'agent') && (
                  <div>
                    <label className="text-xs text-muted-foreground">
                      {selected.type === 'prompt' ? '프롬프트 slug' : '에이전트 slug'}
                    </label>
                    <Input
                      value={(selected.data?.slug as string) ?? ''}
                      onChange={(e) => handleUpdateSelected({ slug: e.target.value })}
                      placeholder={selected.type === 'prompt' ? 'review-bot' : 'researcher'}
                      className="font-mono text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      /{selected.type === 'prompt' ? 'ko/prompts' : 'ko/agents'}/&lt;slug&gt;
                    </p>
                  </div>
                )}
                <Button variant="destructive" size="sm" className="w-full" onClick={handleDeleteSelected}>
                  노드 삭제
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">캔버스에서 노드를 클릭하세요</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : '💾 저장'}
        </Button>
      </div>
    </div>
  );
}
