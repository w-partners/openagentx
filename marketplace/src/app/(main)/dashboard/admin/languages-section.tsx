'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDict } from '@/i18n/client';

const ALL_LANGUAGES: { code: string; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'ko', name: '\uD55C\uAD6D\uC5B4', flag: '\u{1F1F0}\u{1F1F7}' },
  { code: 'ja', name: '\u65E5\u672C\u8A9E', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'zh', name: '\u7B80\u4F53\u4E2D\u6587', flag: '\u{1F1E8}\u{1F1F3}' },
  { code: 'es', name: 'Espa\u00F1ol', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'fr', name: 'Fran\u00E7ais', flag: '\u{1F1EB}\u{1F1F7}' },
];

export default function LanguagesSection() {
  const dict = useDict();
  const ap = dict.adminPanel as Record<string, Record<string, string>>;
  const ls = ap.languageSettings ?? {};
  const lt = ap.languages ?? {};

  const [enabledLangs, setEnabledLangs] = useState<string[]>(ALL_LANGUAGES.map((l) => l.code));
  const [defaultLang, setDefaultLang] = useState('en');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.enabled_languages) setEnabledLangs(d.settings.enabled_languages);
        if (d.settings?.default_language) setDefaultLang(d.settings.default_language);
      })
      .catch(() => {});
  }, []);

  const toggleLang = (code: string) => {
    if (code === defaultLang) return;
    setEnabledLangs((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code],
    );
  };

  const setAsDefault = (code: string) => {
    if (!enabledLangs.includes(code)) return;
    setDefaultLang(code);
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'enabled_languages', value: enabledLangs }),
      });
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'default_language', value: defaultLang }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{lt.title}</h2>
        <p className="text-muted-foreground">{lt.description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ALL_LANGUAGES.map((lang) => {
          const isEnabled = enabledLangs.includes(lang.code);
          const isDefault = defaultLang === lang.code;

          return (
            <Card
              key={lang.code}
              className={`transition-all ${
                !isEnabled ? 'opacity-60 border-dashed' : ''
              } ${isDefault ? 'ring-2 ring-primary' : ''}`}
            >
              <CardContent className="pt-4 pb-4 space-y-3">
                {/* Header: flag + name + badges */}
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{lang.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{lang.name}</span>
                      <span className="text-xs text-muted-foreground uppercase">{lang.code}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {isDefault && (
                        <Badge variant="default" className="text-xs">
                          {lt.isDefault || 'Default'}
                        </Badge>
                      )}
                      {!isEnabled && (
                        <Badge variant="destructive" className="text-xs">
                          {ls.blocked || lt.disabled || 'Blocked'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                  {/* Default radio */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="defaultLang"
                      checked={isDefault}
                      onChange={() => setAsDefault(lang.code)}
                      disabled={!isEnabled}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-xs text-muted-foreground">
                      {lt.setDefault || 'Default'}
                    </span>
                  </label>

                  {/* Enable/disable toggle */}
                  <button
                    onClick={() => toggleLang(lang.code)}
                    disabled={isDefault}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                    } ${isDefault ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={isDefault ? (ls.cannotDisableDefault || 'Cannot disable default language') : ''}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Warning for disabled */}
                {!isEnabled && (
                  <p className="text-xs text-destructive">
                    {ls.redirectWarning || 'Users accessing this language will be redirected to the default language.'}
                  </p>
                )}

                {/* Warning for default */}
                {isDefault && (
                  <p className="text-xs text-muted-foreground">
                    {ls.defaultNote || 'Default language cannot be disabled.'}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? dict.common.loading : dict.common.save}
        </Button>
        {saved && (
          <span className="text-sm text-green-600">{lt.saved}</span>
        )}
      </div>
    </div>
  );
}
