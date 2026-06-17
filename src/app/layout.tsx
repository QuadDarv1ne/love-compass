import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
  title: "Love Compass — Найди свою вторую половинку",
  description: "Международный сайт знакомств. Компас, который ведёт к любви.",
  keywords: ["знакомства", "dating", "love", "relationships", "match", "meet"],
  authors: [{ name: "Love Compass" }],
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "Love Compass — Международный сайт знакомств",
    description: "Компас, который ведёт к любви. Знакомься с людьми со всего мира!",
    type: "website",
    siteName: "Love Compass",
  },
  twitter: {
    card: "summary_large_image",
    title: "Love Compass — Международный сайт знакомств",
    description: "Компас, который ведёт к любви. Знакомься с людьми со всего мира!",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ErrorBoundary>
            <Suspense fallback={null}>
              {children}
            </Suspense>
          </ErrorBoundary>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
