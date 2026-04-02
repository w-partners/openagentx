import type { Dictionary } from '@/i18n/config';

interface FooterProps {
  dict: Dictionary;
  version?: string;
}

export function Footer({ dict, version }: FooterProps) {

  return (
    <footer className="border-t py-8">
      <div className="mx-auto max-w-7xl px-4">
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
            <a href="#" className="hover:text-foreground transition-colors">{dict.footer.terms}</a>
            <a href="#" className="hover:text-foreground transition-colors">{dict.footer.privacy}</a>
            <a href="#" className="hover:text-foreground transition-colors">{dict.footer.contact}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
