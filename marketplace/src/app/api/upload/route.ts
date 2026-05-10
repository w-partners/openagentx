import { NextRequest } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { apiJson, apiCatchError, requireAuth, AuthError } from '@/lib/utils/api-response';

/**
 * POST /api/upload — 사용자 이미지 업로드 (multipart/form-data)
 *
 * - 인증 필수
 * - mime: image/* 만
 * - 최대 5MB
 * - 저장: marketplace/public/uploads/{userId}/{uuid}.{ext}
 * - 응답: { url: '/uploads/{userId}/{uuid}.{ext}' }
 *
 * Next.js 정적 서빙으로 클라이언트는 동일 호스트에서 그대로 접근 가능.
 */

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024;

function extFromMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'bin';
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = requireAuth(request);

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return apiJson({ error: 'file 필드가 필요합니다' }, 400);
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      return apiJson({ error: '허용된 이미지 형식: jpg, png, webp, gif' }, 415);
    }
    if (file.size > MAX_BYTES) {
      return apiJson({ error: '파일 크기는 5MB 이하여야 합니다' }, 413);
    }

    const ext = extFromMime(file.type);
    const filename = `${randomUUID()}.${ext}`;
    const userDir = path.join(process.cwd(), 'public', 'uploads', userId);
    await fs.mkdir(userDir, { recursive: true });
    const filepath = path.join(userDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filepath, buffer);

    const url = `/uploads/${userId}/${filename}`;
    return apiJson({ data: { url, size: file.size, type: file.type } }, 201);
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err, 400);
  }
}
