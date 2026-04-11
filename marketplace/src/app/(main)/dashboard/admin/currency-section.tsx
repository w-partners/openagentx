'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDict } from '@/i18n/client';
import {
  type Currency,
  type CurrencyConfig,
  ALL_CURRENCIES,
  CURRENCY_SYMBOLS,
  DEFAULT_CURRENCY_CONFIG,
  getMarkupPercent,
} from '@/lib/utils/currency';
import {
  type PointConfig,
  type PaymentMode,
  DEFAULT_POINT_CONFIG,
} from '@/lib/utils/points';

const REFRESH_OPTIONS = [
  { value: 3600, label: '1' },
  { value: 21600, label: '6' },
  { value: 86400, label: '24' },
];

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  ko: '한국어',
  ja: '日本語',
  zh: '中文',
  es: 'Español',
  fr: 'Français',
};

export default function CurrencySection() {
  const dict = useDict();
  const ap = dict.adminPanel as Record<string, Record<string, string>>;
  const ct = ap.currency ?? {};

  const [config, setConfig] = useState<CurrencyConfig>(DEFAULT_CURRENCY_CONFIG);
  const [pointConfig, setPointConfig] = useState<PointConfig>(DEFAULT_POINT_CONFIG);
  const [liveRates, setLiveRates] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.settings?.currency_config) {
          setConfig({ ...DEFAULT_CURRENCY_CONFIG, ...data.settings.currency_config });
        }
        if (data.settings?.point_config) {
          setPointConfig({ ...DEFAULT_POINT_CONFIG, ...data.settings.point_config });
        }
      })
      .catch(() => {});

    fetch('/api/admin/settings/exchange-rates')
      .then((r) => r.json())
      .then((data) => { if (data.rates) setLiveRates(data.rates); })
      .catch(() => {});
  }, []);

  const toggleCurrency = (c: Currency) => {
    setConfig((prev) => {
      const isEnabled = prev.availableCurrencies.includes(c);
      const next = isEnabled
        ? prev.availableCurrencies.filter((x) => x !== c)
        : [...prev.availableCurrencies, c];
      if (next.length === 0) return prev;
      const defaultCurrency = next.includes(prev.defaultCurrency) ? prev.defaultCurrency : next[0];
      return { ...prev, availableCurrencies: next, defaultCurrency };
    });
  };

  const previews = useMemo(() => {
    const results: Record<string, string> = {};
    for (const c of ['USD', 'KRW', 'EUR', 'JPY'] as Currency[]) {
      const rate = liveRates[c] ?? 0;
      if (!rate) { results[c] = 'No rate data'; continue; }
      const base = 10 * rate;
      const pct = getMarkupPercent(c, config);
      const final = base * (1 + pct / 100);
      const sym = CURRENCY_SYMBOLS[c];
      const baseFmt = c === 'KRW' || c === 'JPY' ? `${sym}${Math.round(base).toLocaleString()}` : `${sym}${base.toFixed(2)}`;
      const finalFmt = c === 'KRW' || c === 'JPY' ? `${sym}${Math.round(final).toLocaleString()}` : `${sym}${final.toFixed(2)}`;
      results[c] = `$10 → ${finalFmt} (rate: ${baseFmt} + ${pct}% markup)`;
    }
    return results;
  }, [liveRates, config]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const [res1, res2] = await Promise.all([
        fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'currency_config', value: config }),
        }),
        fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'point_config', value: pointConfig }),
        }),
      ]);
      if (res1.ok && res2.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{ct.title ?? 'Currency Settings'}</h2>

      {/* Available Currencies */}
      <Card>
        <CardHeader><CardTitle className="text-lg">{ct.availableCurrencies ?? 'Available Currencies'}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">{ct.minOneCurrency ?? 'At least one currency must be enabled'}</p>
          <div className="flex flex-wrap gap-3">
            {ALL_CURRENCIES.map((c) => {
              const isOnly = config.availableCurrencies.length === 1 && config.availableCurrencies.includes(c);
              return (
                <label key={c} className={`flex items-center gap-2 rounded-md border px-4 py-2 cursor-pointer transition-colors ${config.availableCurrencies.includes(c) ? 'bg-primary/10 border-primary' : 'hover:bg-accent'}`}>
                  <input type="checkbox" checked={config.availableCurrencies.includes(c)} onChange={() => toggleCurrency(c)} disabled={isOnly} className="rounded" />
                  <span className="font-mono text-sm">{CURRENCY_SYMBOLS[c]}</span>
                  <span className="text-sm">{c}</span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Default Display Currency */}
      <Card>
        <CardHeader><CardTitle className="text-lg">{ct.defaultCurrency ?? 'Default Display Currency'}</CardTitle></CardHeader>
        <CardContent>
          <select value={config.defaultCurrency} onChange={(e) => setConfig((prev) => ({ ...prev, defaultCurrency: e.target.value as Currency }))} className="rounded-md border px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-foreground [&>option]:bg-white dark:[&>option]:bg-zinc-900 [&>option]:text-foreground">
            {config.availableCurrencies.map((c) => (<option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>))}
          </select>
        </CardContent>
      </Card>

      {/* Exchange Rate — Auto Only */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Exchange Rate (Auto via CoinGecko)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">{ct.autoRefresh ?? 'Auto Refresh Interval'}</label>
              <select value={config.autoRefreshInterval} onChange={(e) => setConfig((prev) => ({ ...prev, autoRefreshInterval: parseInt(e.target.value, 10) }))} className="rounded-md border px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-foreground [&>option]:bg-white dark:[&>option]:bg-zinc-900 [&>option]:text-foreground">
                {REFRESH_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label} {ct.hours ?? 'hours'}</option>))}
              </select>
            </div>
            <div className="text-sm text-muted-foreground">
              {Object.entries(liveRates).map(([c, rate]) => (
                <span key={c} className="mr-4">$1 = {CURRENCY_SYMBOLS[c as Currency] ?? ''}{typeof rate === 'number' ? (c === 'KRW' || c === 'JPY' ? Math.round(rate).toLocaleString() : rate.toFixed(4)) : '?'} {c}</span>
              ))}
              {Object.keys(liveRates).length === 0 && 'Loading rates...'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Markup Percentage */}
      <Card>
        <CardHeader><CardTitle className="text-lg">{ct.markup ?? 'Exchange Markup'}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Global Markup</label>
              <input type="number" step="0.1" min="0" max="100" value={config.globalMarkupPercent} onChange={(e) => setConfig((prev) => ({ ...prev, globalMarkupPercent: parseFloat(e.target.value) || 0 }))} className="rounded-md border px-3 py-2 text-sm w-24 bg-background" />
              <span className="text-sm">%</span>
              <span className="text-xs text-muted-foreground">(applied to all currencies unless overridden)</span>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="text-sm font-medium">Per-Currency Override (leave empty to use global)</div>
              {(['USD', 'KRW', 'EUR', 'JPY'] as Currency[]).map((c) => (
                <div key={c} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm w-16">{CURRENCY_SYMBOLS[c]} {c}</span>
                    <input type="number" step="0.1" min="0" max="100" value={config.currencyMarkupPercent[c] ?? ''} placeholder={`${config.globalMarkupPercent}% (global)`} onChange={(e) => {
                      const val = e.target.value;
                      setConfig((prev) => {
                        const next = { ...prev.currencyMarkupPercent };
                        if (val === '' || val === undefined) { delete next[c]; } else { next[c] = parseFloat(val) || 0; }
                        return { ...prev, currencyMarkupPercent: next };
                      });
                    }} className="rounded-md border px-2 py-1 text-sm w-28 bg-background" />
                    <span className="text-sm">%</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{ct.preview ?? 'Preview'}: {previews[c]}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language-Currency Mapping */}
      <Card>
        <CardHeader><CardTitle className="text-lg">{ct.languageCurrencyMap ?? 'Language-Currency Mapping'}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(LANGUAGE_LABELS).map(([lang, label]) => (
              <div key={lang} className="flex items-center gap-3">
                <span className="text-sm font-medium w-28">{label} ({lang})</span>
                <select value={config.languageCurrencyMap?.[lang] ?? 'USD'} onChange={(e) => setConfig((prev) => ({ ...prev, languageCurrencyMap: { ...prev.languageCurrencyMap, [lang]: e.target.value } }))} className="rounded-md border px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-foreground [&>option]:bg-white dark:[&>option]:bg-zinc-900 [&>option]:text-foreground">
                  {ALL_CURRENCIES.map((c) => (<option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>))}
                </select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Show Original Price */}
      <Card>
        <CardHeader><CardTitle className="text-lg">{ct.showOriginalPrice ?? 'Show Original USD Price'}</CardTitle></CardHeader>
        <CardContent>
          <label className="flex items-center gap-3">
            <button type="button" role="switch" aria-checked={config.showOriginalPrice} onClick={() => setConfig((prev) => ({ ...prev, showOriginalPrice: !prev.showOriginalPrice }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.showOriginalPrice ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.showOriginalPrice ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm">{config.showOriginalPrice ? 'ON' : 'OFF'}</span>
          </label>
        </CardContent>
      </Card>

      {/* Payment Mode */}
      <Card>
        <CardHeader><CardTitle className="text-lg">{ct.paymentMode ?? 'Payment Mode'}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">{ct.paymentModeDesc ?? 'Select which payment methods are available'}</p>
          <div className="flex flex-wrap gap-3">
            {(['usdc', 'points', 'both'] as PaymentMode[]).map((mode) => (
              <label key={mode} className={`flex items-center gap-2 rounded-md border px-4 py-2 cursor-pointer transition-colors ${pointConfig.paymentMode === mode ? 'bg-primary/10 border-primary' : 'hover:bg-accent'}`}>
                <input type="radio" name="paymentMode" checked={pointConfig.paymentMode === mode} onChange={() => setPointConfig((prev) => ({ ...prev, paymentMode: mode }))} />
                <span className="text-sm">{mode === 'usdc' ? (ct.modeUsdc ?? 'USD Only') : mode === 'points' ? (ct.modePoints ?? 'Points Only') : (ct.modeBoth ?? 'Both (USD + Points)')}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Point System Toggle */}
      <Card>
        <CardHeader><CardTitle className="text-lg">{ct.pointSystem ?? 'Point System'}</CardTitle></CardHeader>
        <CardContent>
          <label className="flex items-center gap-3">
            <button type="button" role="switch" aria-checked={pointConfig.enabled} onClick={() => setPointConfig((prev) => ({ ...prev, enabled: !prev.enabled }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pointConfig.enabled ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${pointConfig.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm">{pointConfig.enabled ? 'ON' : 'OFF'}</span>
          </label>
        </CardContent>
      </Card>

      {/* Point Exchange Rates */}
      {pointConfig.enabled && (
        <Card>
          <CardHeader><CardTitle className="text-lg">{ct.pointExchangeRates ?? 'Point Exchange Rates'}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">1 {'{currency}'} = N Points (KRW 1:1 fixed)</p>
            <div className="space-y-3">
              {Object.entries(pointConfig.exchangeRates).map(([currency, rate]) => (
                <div key={currency} className="flex items-center gap-3">
                  <span className="font-mono text-sm w-16">{currency}</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={rate}
                    disabled={currency === 'KRW'}
                    onChange={(e) => setPointConfig((prev) => ({
                      ...prev,
                      exchangeRates: { ...prev.exchangeRates, [currency]: parseFloat(e.target.value) || 0 },
                    }))}
                    className="rounded-md border px-2 py-1 text-sm w-28 bg-background disabled:opacity-50"
                  />
                  <span className="text-xs text-muted-foreground">P per 1 {currency}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Point Charge Markup */}
      {pointConfig.enabled && (
        <Card>
          <CardHeader><CardTitle className="text-lg">{ct.pointMarkup ?? 'Point Charge Markup'}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">{ct.pointMarkupDesc ?? 'Fee percentage applied when charging points'}</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={pointConfig.chargeMarkupPercent}
                onChange={(e) => setPointConfig((prev) => ({ ...prev, chargeMarkupPercent: parseFloat(e.target.value) || 0 }))}
                className="rounded-md border px-3 py-2 text-sm w-24 bg-background"
              />
              <span className="text-sm">%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>{saving ? '...' : ct.save ?? 'Save'}</Button>
        {saved && <span className="text-sm text-green-600">{ct.saved ?? 'Saved!'}</span>}
      </div>
    </div>
  );
}
