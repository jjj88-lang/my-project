import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";

import "./globals.css";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { StickyActions } from "@/components/layout/StickyActions";
import { AnnouncementBar, SampleStrip } from "@/components/layout/TopStrips";
import { JsonLd } from "@/components/ui/JsonLd";
import { bodyFont, displayFont } from "@/generated/client";
import { site, theme } from "@/lib/site";
import { baseMetadata, restaurantJsonLd } from "@/lib/site/seo";
import { themeCssVars } from "@/lib/site/theme";

export const metadata: Metadata = baseMetadata;

export const viewport: Viewport = {
  themeColor: theme.bg,
  colorScheme: theme.dark ? "dark" : "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable}`}
      style={themeCssVars(theme) as CSSProperties}
      data-fonts={site.theme.fonts}
      data-theme={theme.dark ? "dark" : "light"}
    >
      <body className="grain flex min-h-dvh flex-col bg-bg text-ink">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <SampleStrip />
        <AnnouncementBar />
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <StickyActions />
        <JsonLd data={restaurantJsonLd()} />
      </body>
    </html>
  );
}
