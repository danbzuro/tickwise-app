import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

const title = "Tickwise — AI market intelligence for investment desks";
const description =
  "AI market intelligence for investment desks. Tickwise monitors the companies you follow, scores every headline by materiality, and delivers a short, prioritized brief.";

export const metadata: Metadata = {
  metadataBase: new URL("https://tickwise.io"),
  title: {
    default: title,
    template: "%s · Tickwise",
  },
  description,
  keywords: [
    "market intelligence",
    "investment research",
    "materiality",
    "news brief",
    "equity research",
    "ticker news",
    "AI triage",
  ],
  authors: [{ name: "Tickwise" }],
  applicationName: "Tickwise",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Tickwise",
    url: "https://tickwise.io/",
    title,
    description,
    images: [
      {
        url: "/og.png",
        type: "image/png",
        width: 1200,
        height: 630,
        alt: "Tickwise — Market-moving news. Without the noise.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
  icons: { icon: "/og.svg" },
};

export const viewport = {
  themeColor: "#09090b",
  colorScheme: "light" as const,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
