'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDict } from '@/i18n/client';

/* ─── Types ─── */
interface PageConfig {
  enabled: boolean;
  accessLevel: 'public' | 'loginRequired' | 'adminOnly';
  showInNav: boolean;
  seoTitle: string;
  seoDescription: string;
  [key: string]: unknown;
}

type PageConfigs = Record<string, PageConfig>;

/* ─── Default configs per page ─── */
const DEFAULT_PAGE_CONFIGS: PageConfigs = {
  agents: {
    enabled: true, accessLevel: 'public', showInNav: true,
    seoTitle: '', seoDescription: '',
    defaultSort: 'ranking_score', itemsPerPage: 12, enableSearch: true,
  },
  bounties: {
    enabled: true, accessLevel: 'public', showInNav: true,
    seoTitle: '', seoDescription: '',
    maxBudget: 10000, allowNewBounties: true,
  },
  auctions: {
    enabled: true, accessLevel: 'loginRequired', showInNav: true,
    seoTitle: '', seoDescription: '',
    defaultDuration: 72, minBidFee: 1,
  },
  matching: {
    enabled: true, accessLevel: 'loginRequired', showInNav: true,
    seoTitle: '', seoDescription: '',
    defaultUrgency: 'normal', connectionFeeRange: [0.5, 10],
  },
  chains: {
    enabled: true, accessLevel: 'loginRequired', showInNav: true,
    seoTitle: '', seoDescription: '',
    maxSteps: 10,
  },
  chat: {
    enabled: true, accessLevel: 'public', showInNav: false,
    seoTitle: '', seoDescription: '',
    welcomeBonus: 1.00,
  },
  dashboard: {
    enabled: true, accessLevel: 'loginRequired', showInNav: true,
    seoTitle: '', seoDescription: '',
  },
  about: {
    enabled: true, accessLevel: 'public', showInNav: true,
    seoTitle: '', seoDescription: '',
  },
  docs: {
    enabled: true, accessLevel: 'public', showInNav: true,
    seoTitle: '', seoDescription: '',
  },
  profile: {
    enabled: true, accessLevel: 'loginRequired', showInNav: false,
    seoTitle: '', seoDescription: '',
  },
  builders: {
    enabled: true, accessLevel: 'public', showInNav: true,
    seoTitle: '', seoDescription: '',
  },
};

/* ─── Page-specific fields ─── */
const PAGE_SPECIFIC_FIELDS: Record<string, { key: string; type: 'number' | 'boolean' | 'select' | 'range'; label: string; options?: string[] }[]> = {
  agents: [
    { key: 'defaultSort', type: 'select', label: 'defaultSort', options: ['ranking_score', 'rating', 'created_at', 'name'] },
    { key: 'itemsPerPage', type: 'number', label: 'itemsPerPage' },
    { key: 'enableSearch', type: 'boolean', label: 'enableSearch' },
  ],
  bounties: [
    { key: 'maxBudget', type: 'number', label: 'maxBudget' },
    { key: 'allowNewBounties', type: 'boolean', label: 'allowNewBounties' },
  ],
  auctions: [
    { key: 'defaultDuration', type: 'number', label: 'defaultDuration' },
    { key: 'minBidFee', type: 'number', label: 'minBidFee' },
  ],
  matching: [
    { key: 'defaultUrgency', type: 'select', label: 'defaultUrgency', options: ['low', 'normal', 'high', 'urgent'] },
  ],
  chains: [
    { key: 'maxSteps', type: 'number', label: 'maxSteps' },
  ],
  chat: [
    { key: 'welcomeBonus', type: 'number', label: 'welcomeBonus' },
  ],
};

const ACCESS_LEVELS = ['public', 'loginRequired', 'adminOnly'] as const;

export default function PagesSection() {
  const dict = useDict();
  const ap = dict.adminPanel as Record<string, Record<string, string>>;
  const ps = ap.pageSettings ?? {};
  const pt = ap.pages ?? {};

  const [configs, setConfigs] = useState<PageConfigs>(DEFAULT_PAGE_CONFIGS);
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.page_configs) {
          const merged: PageConfigs = {};
          for (const page of Object.keys(DEFAULT_PAGE_CONFIGS)) {
            merged[page] = { ...DEFAULT_PAGE_CONFIGS[page], ...d.settings.page_configs[page] };
          }
          setConfigs(merged);
        }
      })
      .catch(() => {});
  }, []);

  const updateConfig = (page: string, key: string, value: unknown) => {
    setConfigs((prev) => ({
      ...prev,
      [page]: { ...prev[page], [key]: value },
    }));
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'page_configs', value: configs }),
      });
      // Also sync enabled_pages for backward compatibility
      const enabledPages = Object.entries(configs)
        .filter(([, c]) => c.enabled)
        .map(([p]) => p);
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'enabled_pages', value: enabledPages }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (page: string) => {
    setExpandedPage((prev) => (prev === page ? null : page));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{pt.title}</h2>
        <p className="text-muted-foreground">{pt.description}</p>
      </div>

      <div className="space-y-2">
        {Object.entries(configs).map(([page, config]) => (
          <Card key={page} className="overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleExpand(page)}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold capitalize">{page}</span>
                <Badge variant={config.enabled ? 'default' : 'secondary'} className="text-xs">
                  {config.enabled ? (ps.enabled || 'ON') : (ps.disabled || 'OFF')}
                </Badge>
                {config.showInNav && (
                  <Badge variant="outline" className="text-xs">
                    {ps.nav || 'Nav'}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {ps[config.accessLevel] || config.accessLevel}
                </Badge>
              </div>
              <span className="text-muted-foreground text-sm">
                {expandedPage === page ? '\u25B2' : '\u25BC'}
              </span>
            </div>

            {expandedPage === page && (
              <CardContent className="border-t pt-4 space-y-4">
                {/* Common settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Enabled toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">{ps.enablePage || 'Enable Page'}</label>
                    <button
                      onClick={() => updateConfig(page, 'enabled', !config.enabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.enabled ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* Show in Nav toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">{ps.showInNav || 'Show in Navigation'}</label>
                    <button
                      onClick={() => updateConfig(page, 'showInNav', !config.showInNav)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.showInNav ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.showInNav ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* Access Level */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{ps.accessLevel || 'Access Level'}</label>
                    <select
                      value={config.accessLevel}
                      onChange={(e) => updateConfig(page, 'accessLevel', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border rounded-md bg-background"
                    >
                      {ACCESS_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {ps[level] || level}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SEO fields */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{ps.seoTitle || 'SEO Title'}</label>
                  <input
                    type="text"
                    value={(config.seoTitle as string) || ''}
                    onChange={(e) => updateConfig(page, 'seoTitle', e.target.value)}
                    placeholder={ps.seoTitlePlaceholder || 'Leave empty for default'}
                    className="w-full px-3 py-1.5 text-sm border rounded-md bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{ps.seoDescription || 'SEO Description'}</label>
                  <input
                    type="text"
                    value={(config.seoDescription as string) || ''}
                    onChange={(e) => updateConfig(page, 'seoDescription', e.target.value)}
                    placeholder={ps.seoDescPlaceholder || 'Leave empty for default'}
                    className="w-full px-3 py-1.5 text-sm border rounded-md bg-background"
                  />
                </div>

                {/* Page-specific fields */}
                {PAGE_SPECIFIC_FIELDS[page] && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-3">
                      {ps.pageSpecific || 'Page-Specific Settings'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {PAGE_SPECIFIC_FIELDS[page].map((field) => (
                        <div key={field.key}>
                          {field.type === 'boolean' ? (
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">
                                {ps[field.label] || field.label}
                              </label>
                              <button
                                onClick={() => updateConfig(page, field.key, !config[field.key])}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  config[field.key] ? 'bg-primary' : 'bg-muted-foreground/30'
                                }`}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  config[field.key] ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                              </button>
                            </div>
                          ) : field.type === 'select' ? (
                            <div className="space-y-1">
                              <label className="text-sm font-medium">
                                {ps[field.label] || field.label}
                              </label>
                              <select
                                value={String(config[field.key] ?? '')}
                                onChange={(e) => updateConfig(page, field.key, e.target.value)}
                                className="w-full px-3 py-1.5 text-sm border rounded-md bg-background"
                              >
                                {field.options?.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <label className="text-sm font-medium">
                                {ps[field.label] || field.label}
                              </label>
                              <input
                                type="number"
                                value={Number(config[field.key] ?? 0)}
                                onChange={(e) => updateConfig(page, field.key, parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-1.5 text-sm border rounded-md bg-background"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? dict.common.loading : dict.common.save}
        </Button>
        {saved && (
          <span className="text-sm text-green-600">{pt.saved}</span>
        )}
      </div>
    </div>
  );
}
