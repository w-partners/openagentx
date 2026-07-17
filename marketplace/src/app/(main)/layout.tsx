import { cookies } from "next/headers";
import { getLocale, getDictionary, getTranslations } from "@/i18n/index";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { query } from "@/lib/db/pool";
import { AdminLocaleProvider } from "@/components/admin-locale-provider";

/**
 * 푸터에 표시할 앱 버전.
 *
 * SSOT: marketplace/package.json 의 version 하나. next.config.ts 가 빌드 시 APP_VERSION 으로 주입한다.
 * 예전에는 root/version.json 을 먼저 읽고 실패 시에만 APP_VERSION 으로 폴백했는데, try 가 항상
 * 성공하므로 package.json 은 사실상 죽은 값이었다. 그 결과 커밋마다 package.json 을 올려도
 * 화면은 version.json 이 마지막으로 갱신된 2026-04-06 의 2.1.1.0 에 3개월간 멈춰 있었다.
 * version.json 은 삭제했다 — 출처가 둘이면 반드시 갈라진다.
 */
function getAppVersion(): string {
  return process.env.APP_VERSION || '0.0.0.0';
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dict = await getDictionary();
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const isLoggedIn = !!accessToken;

  let userRole: string | undefined;
  if (accessToken) {
    const payload = decodeJwtPayload(accessToken);
    if (payload && typeof payload.role === "string") {
      userRole = payload.role;
    }
  }

  const isAdmin = userRole === 'admin';
  const effectiveLocale = isAdmin ? 'ko' : locale;
  const effectiveDict = isAdmin ? getTranslations('ko') : dict;

  let enabledPages: string[] = [];
  try {
    const result = await query("SELECT value FROM site_settings WHERE key = 'enabled_pages'");
    if (result.rows[0]?.value) {
      const val = result.rows[0].value;
      enabledPages = Array.isArray(val) ? val : JSON.parse(String(val));
    }
  } catch {
    // DB not available or table missing — show all pages
  }

  return (
    <AdminLocaleProvider isAdmin={isAdmin}>
      <Header dict={effectiveDict} locale={effectiveLocale} isLoggedIn={isLoggedIn} userRole={userRole} enabledPages={enabledPages} />
      <main className="container mx-auto px-4 py-8">{children}</main>
      <Footer dict={effectiveDict} version={getAppVersion()} />
    </AdminLocaleProvider>
  );
}
