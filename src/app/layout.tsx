import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff1f2" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1017" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "Love Compass — Find Your Match",
    template: "%s | Love Compass",
  },
  description: "International dating platform. The compass that leads to love.",
  keywords: ["dating", "love", "relationships", "match", "meet", "dating app"],
  authors: [{ name: "Love Compass" }],
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "Love Compass — International Dating Platform",
    description: "The compass that leads to love. Meet people from all over the world!",
    type: "website",
    siteName: "Love Compass",
  },
  twitter: {
    card: "summary_large_image",
    title: "Love Compass — International Dating Platform",
    description: "The compass that leads to love. Meet people from all over the world!",
  },
  robots: {
    index: true,
    follow: true,
  },
};

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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
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
