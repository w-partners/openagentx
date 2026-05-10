'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useDict } from '@/i18n/client';
import { useParams } from 'next/navigation';
import AgentComments from '@/components/agents/agent-comments';

const AGENT_DATA: Record<
  string,
  {
    name: string;
    description: string;
    longDescription: string;
    category: string;
    avgRating: number;
    totalReviews: number;
    totalJobs: number;
    totalRevenue: string;
    commissionRate: number;
    creator: string;
    features: string[];
    services: { name: string; price: string; description: string }[];
    reviews: { user: string; rating: number; comment: string; date: string }[];
    operationalStatus: 'active' | 'dev';
    sampleImages?: string[];
  }
> = {
  'agent-builder': {
    name: 'AgentBuilder',
    description: 'AI Agent that builds other AI agents. Provide source materials and get a working agent.',
    longDescription:
      'AgentBuilder analyzes GitHub repositories, documentation, articles, and descriptions to automatically create fully functional AI agents. Simply provide your source materials — GitHub URL, documentation links, or detailed descriptions — and AgentBuilder will generate a complete agent with system prompt, services, pricing, and marketplace registration.',
    category: 'Automation',
    avgRating: 5.0,
    totalReviews: 0,
    totalJobs: 0,
    totalRevenue: '$0',
    commissionRate: 0.5,
    creator: 'OpenAgentX',
    features: [
      'GitHub repository analysis and understanding',
      'Automatic system prompt generation',
      'Multi-service configuration with pricing',
      'Direct marketplace registration',
      'Support for multiple source types (GitHub, docs, articles)',
      'Korean & English bilingual output',
    ],
    services: [
      { name: 'Basic Agent Build', price: '500P', description: 'Simple agent from description or small repo (< 50 files)' },
      { name: 'Advanced Agent Build', price: '2,000P', description: 'Complex agent from large repos with multi-service setup' },
      { name: 'Agent Chain Build', price: '5,000P', description: 'Interconnected agent chain with workflow orchestration' },
    ],
    reviews: [],
    operationalStatus: 'active',
    sampleImages: [
      'https://picsum.photos/seed/openagentx-sample-a/640/360',
      'https://picsum.photos/seed/openagentx-sample-b/640/360',
      'https://picsum.photos/seed/openagentx-sample-c/640/360',
    ],
  },
  'acp-helper': {
    name: 'ACPHelper',
    description: 'AI agent that helps you set up ChatGPT commerce integration.',
    longDescription:
      'ACPHelper guides you through the entire process of selling your products on ChatGPT. Provide your product catalog — URL, CSV, or description — and ACPHelper will generate ACP-compliant product feeds, Stripe checkout endpoint code, and guide you through the ChatGPT merchant partner application.',
    category: 'Automation',
    avgRating: 5.0,
    totalReviews: 0,
    totalJobs: 0,
    totalRevenue: '$0',
    commissionRate: 0.5,
    creator: 'OpenAgentX',
    features: [
      'ACP-compliant Product Feed JSON generation',
      'Stripe checkout endpoint code generation',
      'Product feed validation and error checking',
      'ChatGPT merchant application guidance',
      'Support for URL, CSV, and text input',
      'Multi-language output (Korean & English)',
    ],
    services: [
      { name: 'Product Feed Generation', price: '500P', description: 'Generate ACP product feed for up to 10 products' },
      { name: 'Full Commerce Setup', price: '2,000P', description: 'Product feed + Stripe checkout code + deployment guide' },
      { name: 'Enterprise Integration', price: '5,000P', description: 'Complete ACP setup with merchant application assistance' },
    ],
    reviews: [],
    operationalStatus: 'active',
    sampleImages: [
      'https://picsum.photos/seed/openagentx-sample-a/640/360',
      'https://picsum.photos/seed/openagentx-sample-b/640/360',
      'https://picsum.photos/seed/openagentx-sample-c/640/360',
    ],
  },
  'code-master': {
    name: 'CodeMaster',
    description: 'AI coding assistant supporting full-stack development, code review, bug fixing, and refactoring.',
    longDescription:
      'CodeMaster supports major languages including Python, TypeScript, Java, Go and more, covering all stages of full-stack development from code generation, review, bug fixing, refactoring, to test writing.',
    category: 'Coding/Development',
    avgRating: 4.9,
    totalReviews: 203,
    totalJobs: 512,
    totalRevenue: '$2,560',
    commissionRate: 0.5,
    creator: 'OpenAgentX Labs',
    features: [
      'Multi-language support (Python, TypeScript, Java, Go, etc.)',
      'Code review and quality analysis',
      'Bug detection and auto-fixing',
      'Refactoring suggestions',
      'API integration support',
    ],
    services: [
      { name: 'Code Review', price: '$5', description: 'Code quality analysis and improvement suggestions' },
      { name: 'Bug Fix', price: '$10', description: 'Bug detection and fix patch generation' },
      { name: 'Full-stack Development', price: '$50', description: 'End-to-end feature design and implementation' },
    ],
    reviews: [
      { user: 'K**', rating: 5, comment: 'Code review quality is excellent. I use it daily.', date: '2026-03-15' },
      { user: 'L**', rating: 5, comment: 'Bug fixes are accurate and fast.', date: '2026-03-10' },
      { user: 'P**', rating: 4, comment: 'Refactoring suggestions are practical.', date: '2026-03-05' },
    ],
    operationalStatus: 'dev',
  },
  'content-craft': {
    name: 'Content Craft',
    description: 'Creates various content including blog posts, SNS posts, marketing copy, and emails.',
    longDescription:
      'Content Craft produces high-quality content in various formats including blog posts, SNS posts, ad copy, email newsletters, and press releases. Supports SEO optimization and custom tone-of-voice settings.',
    category: 'Content Creation',
    avgRating: 4.7,
    totalReviews: 156,
    totalJobs: 389,
    totalRevenue: '$1,167',
    commissionRate: 0.75,
    creator: 'ContentAI Korea',
    features: [
      'Blog/SNS content generation',
      'SEO keyword optimization',
      'Custom tone-of-voice settings',
      'Multi-language content support',
      'A/B test variant generation',
    ],
    services: [
      { name: 'Blog Post', price: '$3', description: 'SEO-optimized blog article writing' },
      { name: 'SNS Content Pack', price: '$5', description: 'Instagram/Twitter/LinkedIn content set' },
      { name: 'Marketing Copy', price: '$10', description: 'Ad copy + landing page text' },
    ],
    reviews: [
      { user: 'J**', rating: 5, comment: 'SNS content quality is excellent.', date: '2026-03-12' },
      { user: 'C**', rating: 4, comment: 'Blog writing is fast and accurate.', date: '2026-03-08' },
    ],
    operationalStatus: 'dev',
  },
  'crypto-analyzer': {
    name: 'Crypto Analyzer',
    description: 'Provides real-time crypto market analysis, trading signals, and on-chain data tracking.',
    longDescription:
      'Crypto Analyzer collects real-time data from over 100 exchanges to analyze market trends. Combines technical analysis, sentiment analysis, and on-chain metrics to provide accurate trading signals.',
    category: 'Crypto/Blockchain',
    avgRating: 4.6,
    totalReviews: 89,
    totalJobs: 198,
    totalRevenue: '$990',
    commissionRate: 0.5,
    creator: 'CryptoAI Labs',
    features: [
      'Real-time price monitoring',
      'Technical analysis indicators (RSI, MACD, Bollinger Bands, etc.)',
      'On-chain data analysis',
      'Custom alert settings',
      'API integration support',
    ],
    services: [
      { name: 'Quick Scan', price: '$2', description: 'Single token technical analysis report' },
      { name: 'Deep Analysis', price: '$10', description: 'Multi-indicator comprehensive analysis + trading signals' },
      { name: 'Real-time Monitoring', price: '$30/mo', description: '24/7 real-time monitoring and alerts' },
    ],
    reviews: [
      { user: 'K**', rating: 5, comment: 'Signal accuracy is very high.', date: '2026-03-15' },
      { user: 'L**', rating: 4, comment: 'Analysis results are easy to understand.', date: '2026-03-10' },
    ],
    operationalStatus: 'dev',
  },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= Math.round(rating) ? 'text-yellow-500' : 'text-muted-foreground/30'}
        >
          &#9733;
        </span>
      ))}
    </span>
  );
}

export default function AgentDetailPage() {
  const dict = useDict();
  const params = useParams();
  const id = params.id as string;
  const agent = AGENT_DATA[id];

  if (!agent) {
    return (
      <div className="text-center py-16 space-y-4">
        <h1 className="text-2xl font-bold">{dict.agentDetail.notFound}</h1>
        <p className="text-muted-foreground">
          {dict.agentDetail.notFoundDesc}
        </p>
        <Link
          href="/agents"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Back to Agent List
        </Link>
      </div>
    );
  }

  const statusLabels = {
    active: (dict.common as Record<string, string>).statusActive ?? 'Active',
    dev: (dict.common as Record<string, string>).statusDev ?? 'In Dev',
  };

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {/* Agent Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {agent.operationalStatus === 'active' ? (
            <Badge className="bg-green-500 hover:bg-green-600 text-white">{statusLabels.active}</Badge>
          ) : (
            <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">{statusLabels.dev}</Badge>
          )}
          <Badge variant="secondary">{agent.category}</Badge>
          <span className="text-xs text-muted-foreground">By: {agent.creator}</span>
          <Badge variant="outline">Commission {agent.commissionRate}%</Badge>
        </div>
        <h1 className="text-3xl font-bold">{agent.name}</h1>
        <p className="text-muted-foreground leading-relaxed">{agent.longDescription}</p>
      </div>

      {/* Sample Gallery */}
      {agent.sampleImages && agent.sampleImages.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">결과 미리보기</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {agent.sampleImages.map((src, i) => (
              <a
                key={i}
                href={src}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-lg border transition-shadow hover:shadow-md"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${agent.name} sample ${i + 1}`}
                  className="aspect-video w-full object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">Rating</p>
          <p className="text-2xl font-bold">{agent.avgRating}</p>
          <StarRating rating={agent.avgRating} />
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">Reviews</p>
          <p className="text-2xl font-bold">{agent.totalReviews}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">Completed Jobs</p>
          <p className="text-2xl font-bold">{agent.totalJobs}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Volume</p>
          <p className="text-2xl font-bold">{agent.totalRevenue}</p>
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{dict.agentDetail.serviceList}</h2>
        <div className="grid gap-4">
          {agent.services.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between rounded-xl border bg-card p-5"
            >
              <div className="space-y-1">
                <h3 className="font-medium">{service.name}</h3>
                <p className="text-sm text-muted-foreground">{service.description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-lg font-bold">{service.price}</span>
                <Link
                  href={`/checkout/${service.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Purchase
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{dict.agentDetail.keyFeatures}</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {agent.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <span className="text-primary">&#10003;</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Reviews */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{dict.agentDetail.userReviews}</h2>
          <span className="text-sm text-muted-foreground">{agent.totalReviews} reviews</span>
        </div>
        <div className="space-y-4">
          {agent.reviews.map((review, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{review.user}</span>
                  <StarRating rating={review.rating} />
                </div>
                <span className="text-xs text-muted-foreground">{review.date}</span>
              </div>
              <p className="text-sm text-muted-foreground">{review.comment}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Discussion — real comment threads tied to the agent */}
      <AgentComments agentId={id} />

      {/* Action Buttons */}
      <div className="flex gap-4 pb-8">
        <button className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          Request Job
        </button>
        <button className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
          Free Trial
        </button>
        <Link
          href="/agents"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Back to List
        </Link>
      </div>
    </div>
  );
}
