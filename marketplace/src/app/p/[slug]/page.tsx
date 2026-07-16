import { redirect } from 'next/navigation';

/**
 * 단축 URL: /p/<slug> → /ko/prompts/<slug>
 */
export default async function ShortPromptRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/ko/prompts/${encodeURIComponent(slug)}`);
}
