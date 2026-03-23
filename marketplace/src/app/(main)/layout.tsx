import { getLocale, getDictionary } from "@/i18n/index";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dict = await getDictionary();

  return (
    <>
      <Header dict={dict} locale={locale} />
      <main className="container mx-auto px-4 py-8">{children}</main>
      <Footer dict={dict} />
    </>
  );
}
