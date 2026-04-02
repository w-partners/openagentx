import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SERVICE_CATEGORIES } from '@/lib/utils/constants';
import { getDictionary } from '@/i18n';

const BOUNTY_STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  open: 'default',
  pending_match: 'secondary',
  claimed: 'outline',
  fulfilled: 'secondary',
  cancelled: 'destructive',
};

// Demo bounties for SSR (replace with API fetch)
function getDemoBounties(t: Record<string, string>) {
  return [
    { id: '1', titleKey: 'bounty1Title', descKey: 'bounty1Desc', category: 'coding', budget_usdc: 500, status: 'open', deadline: '2026-04-15', created_at: '2026-03-20' },
    { id: '2', titleKey: 'bounty2Title', descKey: 'bounty2Desc', category: 'translation', budget_usdc: 300, status: 'pending_match', deadline: '2026-04-20', created_at: '2026-03-18' },
    { id: '3', titleKey: 'bounty3Title', descKey: 'bounty3Desc', category: 'marketing', budget_usdc: 400, status: 'claimed', deadline: null as string | null, created_at: '2026-03-15' },
    { id: '4', titleKey: 'bounty4Title', descKey: 'bounty4Desc', category: 'data_analysis', budget_usdc: 600, status: 'fulfilled', deadline: '2026-03-10', created_at: '2026-03-01' },
    { id: '5', titleKey: 'bounty5Title', descKey: 'bounty5Desc', category: 'crypto', budget_usdc: 800, status: 'open', deadline: '2026-05-01', created_at: '2026-03-21' },
  ].map((b) => ({ ...b, title: t[b.titleKey] ?? b.titleKey, description: t[b.descKey] ?? b.descKey }));
}

export default async function BountiesPage() {
  const dict = await getDictionary();
  const t = dict.bountiesPage;

  const demoBounties = getDemoBounties(t as unknown as Record<string, string>);

  const BOUNTY_STATUS_MAP: Record<string, string> = {
    open: t.statusOpen,
    pending_match: t.statusMatching,
    claimed: t.statusInProgress,
    fulfilled: t.statusCompleted,
    cancelled: t.statusCancelled,
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="text-muted-foreground">
          {t.description}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[dict.agentsPage.all, ...SERVICE_CATEGORIES.map((cat) => dict.categories[cat as keyof typeof dict.categories] ?? cat)].map((cat) => (
          <button
            key={cat}
            className="rounded-full border px-4 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(BOUNTY_STATUS_MAP).map(([key, label]) => (
          <button
            key={key}
            className="rounded-full border px-3 py-1 text-xs hover:bg-accent transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bounty list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {demoBounties.map((bounty) => {
          const statusLabel = BOUNTY_STATUS_MAP[bounty.status] ?? BOUNTY_STATUS_MAP.open;
          const statusVariant = BOUNTY_STATUS_VARIANTS[bounty.status] ?? 'default';
          const categoryLabel = dict.categories[bounty.category as keyof typeof dict.categories] ?? bounty.category;

          return (
            <a
              key={bounty.id}
              href={`/bounties/${bounty.id}`}
              className="block"
            >
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={statusVariant}>{statusLabel}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {categoryLabel}
                    </span>
                  </div>
                  <CardTitle className="mt-2">{bounty.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {bounty.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-primary">
                      ${bounty.budget_usdc.toLocaleString()}
                    </span>
                    {bounty.deadline && (
                      <span className="text-muted-foreground text-xs">
                        {t.deadline.replace('{date}', bounty.deadline)}
                      </span>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <span className="text-xs text-muted-foreground">
                    {t.postedOn.replace('{date}', bounty.created_at)}
                  </span>
                </CardFooter>
              </Card>
            </a>
          );
        })}
      </div>

      {/* CTA */}
      <div className="text-center py-8">
        <a
          href="/api/bounties"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t.registerBounty}
        </a>
      </div>
    </div>
  );
}
