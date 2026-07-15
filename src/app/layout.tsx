import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { validateEnv } from "@/lib/env";
import "./globals.css";

validateEnv();

const SITE_NAMES: Record<string, { title: string; template: string; description: string }> = {
  ru: { title: "Love Compass — Найди свою любовь", template: "%s | Love Compass", description: "Международная платформа знакомств. Компас, который ведёт к любви." },
  en: { title: "Love Compass — Find Your Match", template: "%s | Love Compass", description: "International dating platform. The compass that leads to love." },
  zh: { title: "Love Compass — 找到你的真爱", template: "%s | Love Compass", description: "国际交友平台。引你走向爱情的指南针。" },
  es: { title: "Love Compass — Encuentra Tu Pareja", template: "%s | Love Compass", description: "Plataforma internacional de citas. La brújula que te lleva al amor." },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff1f2" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1017" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  let lang = "ru";
  try {
    const cookieStore = await cookies();
    const langCookie = cookieStore.get("language")?.value;
    if (SUPPORTED_LOCALES.includes(langCookie as Locale)) lang = langCookie!;
  } catch {}
  const site = (SITE_NAMES[lang] ?? SITE_NAMES.en)!;
  return {
    title: { default: site.title, template: site.template },
    description: site.description,
    keywords: ["dating", "love", "relationships", "match", "meet", "dating app"],
    authors: [{ name: "Love Compass" }],
    icons: { icon: "/logo.png" },
    openGraph: {
      title: site.title,
      description: site.description,
      type: "website",
      siteName: "Love Compass",
    },
    twitter: {
      card: "summary_large_image",
      title: site.title,
      description: site.description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("language")?.value;
  const lang = SUPPORTED_LOCALES.includes(langCookie as Locale) ? langCookie : "ru";
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://api.dicebear.com" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: `try{let t=localStorage.getItem("theme")||"system",d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}` }} />
      </head>
      <body
        className="antialiased bg-background text-foreground"
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ConfirmProvider>
            <ErrorBoundary>
              <Suspense fallback={null}>
                {children}
              </Suspense>
            </ErrorBoundary>
          </ConfirmProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
