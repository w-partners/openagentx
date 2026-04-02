import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { getLocale, getDictionary } from "@/i18n/index";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: dict.common.siteTitle,
    description: dict.common.siteDescription,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dict = await getDictionary();

  return (
    <html lang={locale} suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  name: 'OpenAgentX',
                  url: 'https://openagentx.org',
                  logo: 'https://openagentx.org/logo.png',
                  description: dict.common.siteDescription,
                  contactPoint: {
                    '@type': 'ContactPoint',
                    contactType: 'Customer Support',
                    email: 'contact@openagentx.org',
                  },
                },
                {
                  '@type': 'WebSite',
                  name: dict.common.siteTitle,
                  url: 'https://openagentx.org',
                  description: dict.common.siteDescription,
                  inLanguage: locale,
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: 'https://openagentx.org/agents?q={search_term_string}',
                    'query-input': 'required name=search_term_string',
                  },
                },
                {
                  '@type': 'Service',
                  name: 'AI Agent Dynamic Fulfillment',
                  description: 'Dynamically generates and processes requests with AI even when no registered agent matches.',
                  provider: { '@type': 'Organization', name: 'OpenAgentX' },
                  serviceType: 'AI Agent Marketplace',
                  url: 'https://openagentx.org/api/fulfill',
                  areaServed: 'Worldwide',
                  availableChannel: {
                    '@type': 'ServiceChannel',
                    serviceUrl: 'https://openagentx.org/api/fulfill',
                    serviceType: 'REST API',
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
