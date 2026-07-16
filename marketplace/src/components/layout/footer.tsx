import Link from 'next/link';
import type { Dictionary, Locale } from '@/i18n/config';

interface FooterProps {
  dict: Dictionary;
  version?: string;
  locale?: Locale;
}

export function Footer({ dict, version, locale }: FooterProps) {
  const prefix = locale ? `/${locale}` : '';
  const isKo = locale === 'ko';
  const guideCta = isKo ? '사용 시작하기' : 'Get Started';
  const guideHint = isKo
    ? '6가지 방법 중 나에게 맞는 방식 고르기'
    : 'Pick the way that fits you — 6 options';

  return (
    <footer className="border-t py-8">
      <div className="mx-auto max-w-7xl px-4">
        {/* Guide CTA banner */}
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-base font-bold">{guideCta}</p>
            <p className="text-xs text-muted-foreground">{guideHint}</p>
          </div>
          <Link
            href={`${prefix}/guide`}
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {guideCta} &rarr;
          </Link>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {dict.footer.copyright}
            </p>
            <span className="text-xs font-mono text-muted-foreground/50">
              v{version}
            </span>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href={`${prefix}/guide`} className="hover:text-foreground transition-colors font-medium text-foreground">
              {isKo ? '가이드' : 'Guide'}
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">{dict.footer.terms}</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">{dict.footer.privacy}</Link>
            <Link href="/refund" className="hover:text-foreground transition-colors">{dict.footer.refund}</Link>
            <a href="mailto:contact@openagentx.org" className="hover:text-foreground transition-colors">{dict.footer.contact}</a>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground/70 text-center">
            {dict.footer.businessInfo}
          </p>
        </div>
      </div>
    </footer>
  );
}
