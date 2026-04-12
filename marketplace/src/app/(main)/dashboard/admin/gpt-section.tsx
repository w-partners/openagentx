'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

/* ─── Types ─── */
interface GPTConfig {
  name: string;
  description: string;
  instructions: string;
  logoUrl: string;
  privacyPolicyUrl: string;
  authType: string;
  apiBaseUrl: string;
  welcomeMessage: string;
  samplePrompts: string[];
}

const EMPTY_CONFIG: GPTConfig = {
  name: '',
  description: '',
  instructions: '',
  logoUrl: '',
  privacyPolicyUrl: '',
  authType: 'bearer',
  apiBaseUrl: 'https://openagentx.org',
  welcomeMessage: '',
  samplePrompts: [],
};

/* ─── GPT Basic Info ─── */
function GPTBasicInfo({
  config,
  onChange,
}: {
  config: GPTConfig;
  onChange: (patch: Partial<GPTConfig>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>GPT 기본 정보</CardTitle>
        <CardDescription>ChatGPT Custom GPT의 기본 설정을 관리합니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">이름</label>
          <Input
            value={config.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="OpenAgentX"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">설명</label>
          <textarea
            value={config.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="GPT 설명을 입력하세요"
            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">로고 URL</label>
          <Input
            value={config.logoUrl}
            onChange={(e) => onChange({ logoUrl: e.target.value })}
            placeholder="https://example.com/logo.png"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">개인정보처리방침 URL</label>
          <Input
            value={config.privacyPolicyUrl}
            onChange={(e) => onChange({ privacyPolicyUrl: e.target.value })}
            placeholder="https://openagentx.org/privacy"
          />
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── System Prompt ─── */
function GPTInstructions({
  config,
  onChange,
}: {
  config: GPTConfig;
  onChange: (patch: Partial<GPTConfig>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>시스템 프롬프트</CardTitle>
        <CardDescription>GPT의 행동 방식을 지시하는 Instructions 입니다</CardDescription>
      </CardHeader>
      <CardContent>
        <textarea
          value={config.instructions}
          onChange={(e) => onChange({ instructions: e.target.value })}
          placeholder="시스템 프롬프트를 입력하세요..."
          className="w-full min-h-[300px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </CardContent>
    </Card>
  );
}

/* ─── Welcome Message ─── */
function GPTWelcomeMessage({
  config,
  onChange,
}: {
  config: GPTConfig;
  onChange: (patch: Partial<GPTConfig>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>환영 메시지</CardTitle>
        <CardDescription>사용자가 GPT를 처음 열었을 때 표시되는 메시지</CardDescription>
      </CardHeader>
      <CardContent>
        <textarea
          value={config.welcomeMessage}
          onChange={(e) => onChange({ welcomeMessage: e.target.value })}
          placeholder="환영 메시지를 입력하세요..."
          className="w-full min-h-[150px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </CardContent>
    </Card>
  );
}

/* ─── Sample Prompts ─── */
function GPTSamplePrompts({
  config,
  onChange,
}: {
  config: GPTConfig;
  onChange: (patch: Partial<GPTConfig>) => void;
}) {
  const addPrompt = () => {
    onChange({ samplePrompts: [...config.samplePrompts, ''] });
  };

  const removePrompt = (index: number) => {
    onChange({ samplePrompts: config.samplePrompts.filter((_, i) => i !== index) });
  };

  const updatePrompt = (index: number, value: string) => {
    const updated = [...config.samplePrompts];
    updated[index] = value;
    onChange({ samplePrompts: updated });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>샘플 프롬프트</CardTitle>
        <CardDescription>GPT 대화 시작 시 추천되는 예시 프롬프트</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {config.samplePrompts.map((prompt, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground w-6 text-right">{i + 1}.</span>
            <Input
              value={prompt}
              onChange={(e) => updatePrompt(i, e.target.value)}
              placeholder="예시 프롬프트를 입력하세요"
              className="flex-1"
            />
            <Button
              variant="destructive"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => removePrompt(i)}
            >
              삭제
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addPrompt}>
          + 프롬프트 추가
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─── API Connection Info (Read Only) ─── */
function GPTApiInfo({ config }: { config: GPTConfig }) {
  const specUrl = `${config.apiBaseUrl}/api/v1/openapi.json`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API 연동 정보</CardTitle>
        <CardDescription>ChatGPT Actions 설정에 사용되는 정보 (읽기 전용)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">OpenAPI Spec URL</label>
          <div className="flex gap-2 items-center">
            <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono break-all">
              {specUrl}
            </code>
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(specUrl)}>
              복사
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">인증 방식</label>
          <div className="flex items-center gap-2">
            <Badge variant="default">Bearer Token</Badge>
            <span className="text-sm text-muted-foreground">
              사용자의 API Key (oax_로 시작)
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">API 베이스 URL</label>
          <code className="block rounded-md border bg-muted px-3 py-2 text-sm font-mono">
            {config.apiBaseUrl}
          </code>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Setup Guide ─── */
function GPTSetupGuide({ config }: { config: GPTConfig }) {
  const specUrl = `${config.apiBaseUrl}/api/v1/openapi.json`;

  const steps = [
    {
      title: '1. GPT 생성',
      content: 'chat.openai.com → GPTs → Create a GPT',
    },
    {
      title: '2. Configure 탭 설정',
      content: `- Name: ${config.name}\n- Description: ${config.description}\n- Instructions: 위에서 설정한 시스템 프롬프트 복사`,
    },
    {
      title: '3. Actions 추가',
      content: `Actions → Import from URL:\n- URL: ${specUrl}`,
    },
    {
      title: '4. 인증 설정',
      content:
        '- Type: API Key\n- Auth Type: Bearer\n- Key: 사용자의 OpenAgentX API Key (oax_xxx)\n  프로필 페이지에서 발급 가능',
    },
    {
      title: '5. 저장 및 배포',
      content: 'Save → Publish (Everyone / Anyone with a link)',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>ChatGPT Custom GPT 설정 가이드</CardTitle>
        <CardDescription>아래 단계를 따라 ChatGPT에서 Custom GPT를 설정하세요</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="rounded-md border p-4">
            <h4 className="text-sm font-bold mb-2">{step.title}</h4>
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">
              {step.content}
            </pre>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ─── Main GPT Section ─── */
export default function GPTSection() {
  const [config, setConfig] = useState<GPTConfig>(EMPTY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchConfig = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/gpt-config')
      .then((r) => r.json())
      .then((d) => {
        if (d.config) {
          setConfig({
            name: d.config.name ?? '',
            description: d.config.description ?? '',
            instructions: d.config.instructions ?? '',
            logoUrl: d.config.logoUrl ?? '',
            privacyPolicyUrl: d.config.privacyPolicyUrl ?? '',
            authType: d.config.authType ?? 'bearer',
            apiBaseUrl: d.config.apiBaseUrl ?? 'https://openagentx.org',
            welcomeMessage: d.config.welcomeMessage ?? '',
            samplePrompts: Array.isArray(d.config.samplePrompts) ? d.config.samplePrompts : [],
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleChange = (patch: Partial<GPTConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/gpt-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      if (res.ok) setSaved(true);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground py-8 text-center">로딩 중...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">GPT 관리</h2>
          <p className="text-muted-foreground">
            ChatGPT Custom GPT 설정을 관리합니다
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : saved ? '저장 완료' : '설정 저장'}
        </Button>
      </div>

      <GPTBasicInfo config={config} onChange={handleChange} />
      <GPTInstructions config={config} onChange={handleChange} />
      <GPTWelcomeMessage config={config} onChange={handleChange} />
      <GPTSamplePrompts config={config} onChange={handleChange} />
      <GPTApiInfo config={config} />
      <GPTSetupGuide config={config} />
    </div>
  );
}
