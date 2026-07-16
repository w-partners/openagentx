/**
 * GET /api/embed/config?token=oaw_xxx — 위젯 공개 설정 조회
 * - CORS: 모든 origin 허용 (이름/색상/문구만 노출)
 */
import { NextRequest } from 'next/server';
import { query } from '@/lib/db/pool';
import * as widgetsRepo from '@/lib/db/repositories/widgets';
import * as promptsRepo from '@/lib/db/repositories/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=60',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return new Response(JSON.stringify({ success: false, error: 'token_required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const widget = await widgetsRepo.findByToken(token);
  if (!widget) {
    return new Response(JSON.stringify({ success: false, error: 'invalid_token' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  let sourceName = widget.name;
  if (widget.agent_slug) {
    const r = await query<{ name: string }>(
      `SELECT name FROM agents WHERE slug = $1 LIMIT 1`,
      [widget.agent_slug],
    );
    if (r.rows[0]?.name) sourceName = r.rows[0].name;
  } else if (widget.prompt_slug) {
    const p = await promptsRepo.findBySlug(widget.prompt_slug);
    if (p?.title) sourceName = p.title;
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        token: widget.token,
        name: widget.name,
        source_name: sourceName,
        welcome_message: widget.welcome_message,
        primary_color: widget.primary_color,
        position: widget.position,
        inject_page_context: widget.inject_page_context,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS },
    },
  );
}
