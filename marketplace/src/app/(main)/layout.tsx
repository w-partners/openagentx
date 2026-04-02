import { cookies } from "next/headers";
import { getLocale, getDictionary } from "@/i18n/index";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { query } from "@/lib/db/pool";

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
    <>
      <Header dict={dict} locale={locale} isLoggedIn={isLoggedIn} userRole={userRole} enabledPages={enabledPages} />
      <main className="container mx-auto px-4 py-8">{children}</main>
      <Footer dict={dict} version={process.env.APP_VERSION} />
    </>
  );
}
