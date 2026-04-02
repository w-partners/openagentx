import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AgentCardProps {
  id: string;
  name: string;
  description: string;
  category: string;
  avgRating: number;
  totalJobs: number;
  commissionRate: number;
  priceRange?: string;
  /** Points-equivalent price range (e.g. "6,900P") */
  priceRangePoints?: string;
  tags?: string[];
  completedLabel?: string;
  commissionLabel?: string;
  showCommission?: boolean;
}

export function AgentCard({
  id, name, description, category, avgRating, totalJobs, commissionRate, priceRange, priceRangePoints, tags,
  completedLabel, commissionLabel, showCommission,
}: AgentCardProps) {
  return (
    <Link href={`/agents/${id}`}>
      <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg leading-tight">{name}</CardTitle>
            <Badge variant="secondary" className="text-xs shrink-0">{category}</Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
          {tags && tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>⭐ {avgRating.toFixed(1)}</span>
            <span>{completedLabel ?? `${totalJobs} completed`}</span>
          </div>
          <div className="flex items-center gap-2">
            {priceRange && <span className="font-medium text-foreground">{priceRange}</span>}
            {priceRangePoints && <span className="font-medium text-primary">{priceRangePoints}</span>}
            {showCommission && commissionRate > 0 && (
              <Badge variant="outline" className="text-xs">{commissionLabel ?? `Commission ${commissionRate}%`}</Badge>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
