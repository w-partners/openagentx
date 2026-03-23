import type { Dictionary } from '@/i18n/config';

interface FooterProps {
  dict: Dictionary;
}

export function Footer({ dict }: FooterProps) {
  return (
    <footer className="border-t py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            {dict.footer.copyright}
          </p>
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
