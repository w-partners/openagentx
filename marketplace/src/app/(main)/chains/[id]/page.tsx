'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDict } from '@/i18n/client';

const STEP_TYPE_LABELS: Record<string, string> = {
  fixed: 'Fixed Price',
  auction: 'Reverse Auction',
  matching: 'Live Matching',
  fulfill: 'AI Processing',
};

const STEP_TYPE_COLORS: Record<string, string> = {
  fixed: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  auction: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  matching: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  fulfill: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

const CHAIN_STATUS_LABELS: Record<string, string> = {
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

interface StepDef {
  name: string;
  type: string;
  category: string;
  description: string;
  auto_trigger: boolean;
  config: Record<string, unknown>;
}

interface StepResult {
  step_index: number;
  status: string;
  result_data?: Record<string, unknown>;
  cost?: number;
  started_at?: string;
  completed_at?: string;
  error?: string;
}

interface ChainData {
  id: string;
  name?: string;
  flow_name?: string;
  description?: string | null;
  category?: string;
  flow_category?: string;
  steps?: StepDef[];
  flow_steps?: StepDef[];
  is_public?: boolean;
  total_uses?: number;
  created_at?: string;
  // Instance fields
  status?: string;
  current_step?: number;
  step_results?: StepResult[];
  total_cost?: number;
  started_at?: string;
  completed_at?: string | null;
  error_message?: string | null;
}

export default function ChainDetailPage() {
  const dict = useDict();
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<ChainData | null>(null);
  const [dataType, setDataType] = useState<'flow' | 'instance'>('flow');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(() => {
    setLoading(true);
    fetch(`/api/chains?id=${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
          setDataType(res.type ?? 'flow');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadData();
    // Auto-refresh for running instances
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleStart = async () => {
    setStarting(true);
    setError('');
    try {
      const res = await fetch('/api/chains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', flow_id: id }),
      });
      const json = await res.json();
      if (json.success && json.data?.id) {
        window.location.href = `/chains/${json.data.id}`;
      } else {
        setError(json.error ?? dict.chainDetail.startFailed);
      }
    } catch {
      setError(dict.common.networkError);
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">{dict.common.loading}</div>;
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{dict.chainDetail.chainNotFound}</p>
        <Link href="/chains"><Button variant="outline">{dict.common.backToList}</Button></Link>
      </div>
    );
  }

  const steps: StepDef[] = (() => {
    const raw = data.steps ?? data.flow_steps;
    if (!raw) return [];
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  })();

  const stepResults: StepResult[] = (() => {
    if (!data.step_results) return [];
    return typeof data.step_results === 'string'
      ? JSON.parse(data.step_results as unknown as string)
      : data.step_results;
  })();

  const isInstance = dataType === 'instance';
  const flowName = data.name ?? data.flow_name ?? dict.chainDetail.chain;
  const category = data.category ?? data.flow_category ?? '';

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Link href="/chains" className="text-sm text-muted-foreground hover:text-foreground">
          {dict.chainDetail.backToList}
        </Link>
        {!isInstance && (
          <Button onClick={handleStart} disabled={starting}>
            {starting ? dict.chainDetail.starting : dict.chainDetail.startChain}
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold">{flowName}</h1>
          {isInstance && data.status && (
            <Badge className={
              data.status === 'running' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
              data.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
              'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            }>
              {CHAIN_STATUS_LABELS[data.status] ?? data.status}
            </Badge>
          )}
        </div>
        {data.description && <p className="text-muted-foreground">{data.description}</p>}
        <div className="flex gap-3 text-sm text-muted-foreground">
          <span>{dict.categories[category as keyof typeof dict.categories] ?? category}</span>
          {!isInstance && data.total_uses !== undefined && (
            <span>{dict.chainDetail.timesUsed.replace('{count}', String(data.total_uses))}</span>
          )}
          {isInstance && data.total_cost !== undefined && (
            <span>{dict.chainDetail.totalCostLabel.replace('{cost}', Number(data.total_cost).toFixed(2))}</span>
          )}
        </div>
        {isInstance && data.error_message && (
          <p className="text-sm text-red-500">{dict.chainDetail.errorLabel.replace('{message}', data.error_message)}</p>
        )}
      </div>

      {/* Step Progress */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{dict.chainDetail.steps.replace('{count}', String(steps.length))}</h2>
        <div className="space-y-3">
          {steps.map((step, i) => {
            const result = stepResults[i];
            const stepStatus = result?.status ?? 'pending';

            let statusIcon = '[ ]';
            let statusClass = 'border-border';
            if (isInstance) {
              if (stepStatus === 'completed') {
                statusIcon = '[v]';
                statusClass = 'border-green-500 bg-green-50 dark:bg-green-950';
              } else if (stepStatus === 'running') {
                statusIcon = '[...]';
                statusClass = 'border-blue-500 bg-blue-50 dark:bg-blue-950';
              } else if (stepStatus === 'failed') {
                statusIcon = '[x]';
                statusClass = 'border-red-500 bg-red-50 dark:bg-red-950';
              }
            }

            return (
              <Card key={i} className={`border-2 ${statusClass}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-mono w-10 shrink-0">{statusIcon}</span>
                      <div>
                        <CardTitle className="text-base">
                          {dict.chainDetail.stepN.replace('{n}', String(i + 1)).replace('{name}', step.name)}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {step.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={STEP_TYPE_COLORS[step.type] ?? ''}>
                        {STEP_TYPE_LABELS[step.type] ?? step.type}
                      </Badge>
                      <Badge variant="outline">
                        {dict.categories[step.category as keyof typeof dict.categories] ?? step.category}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                {isInstance && result && (
                  <CardContent className="pt-0">
                    <div className="text-sm space-y-1">
                      {result.cost !== undefined && result.cost > 0 && (
                        <p>{dict.chainDetail.costLabel.replace('{cost}', result.cost.toFixed(2))}</p>
                      )}
                      {result.started_at && (
                        <p className="text-xs text-muted-foreground">
                          {dict.chainDetail.startedAt} {new Date(result.started_at).toLocaleString()}
                        </p>
                      )}
                      {result.completed_at && (
                        <p className="text-xs text-muted-foreground">
                          {dict.chainDetail.completedAt} {new Date(result.completed_at).toLocaleString()}
                        </p>
                      )}
                      {result.error && (
                        <p className="text-xs text-red-500">{dict.chainDetail.errorLabel.replace('{message}', result.error)}</p>
                      )}
                      {result.result_data && Object.keys(result.result_data).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            {dict.chainDetail.viewResultData}
                          </summary>
                          <pre className="mt-1 p-2 bg-accent rounded text-xs overflow-x-auto max-h-40">
                            {JSON.stringify(result.result_data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </CardContent>
                )}
                {!isInstance && (
                  <CardContent className="pt-0">
                    <div className="text-xs text-muted-foreground space-y-1">
                      {step.auto_trigger && <span>{dict.chainDetail.autoExecution}</span>}
                      {'max_price' in step.config && step.config.max_price ? <span> | {dict.chainDetail.maxPriceLabel.replace('{price}', String(step.config.max_price))}</span> : null}
                      {'timeout_minutes' in step.config && step.config.timeout_minutes ? <span> | {dict.chainDetail.timeoutLabel.replace('{minutes}', String(step.config.timeout_minutes))}</span> : null}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Connection lines between steps */}
      {steps.length >= 2 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {steps.map((step, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                {i > 0 && <span>&rarr;</span>}
                <span className="bg-accent rounded px-2 py-0.5">{step.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
