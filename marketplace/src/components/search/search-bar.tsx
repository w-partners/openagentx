'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getClientLocale, getTranslations } from '@/i18n/client';

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [placeholder, setPlaceholder] = useState('Search agents...');
  const [searchLabel, setSearchLabel] = useState('Search');

  useEffect(() => {
    const locale = getClientLocale();
    const dict = getTranslations(locale);
    setPlaceholder(dict.common.searchPlaceholder);
    setSearchLabel(dict.common.search);
  }, []);

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      router.push(`/agents?q=${encodeURIComponent(query.trim())}`);
    }
  }, [query, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSearch();
    },
    [handleSearch],
  );

  return (
    <div className="flex w-full max-w-xl gap-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1"
      />
      <Button onClick={handleSearch}>{searchLabel}</Button>
    </div>
  );
}
