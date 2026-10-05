import { redirect } from "next/navigation";
import { LandingPage } from "@/screens/LandingPage";
import { getAuthedUser, isPlatformAdmin } from "@/lib/supabase/access";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Tickwise",
      url: "https://tickwise.io/",
      logo: "https://tickwise.io/og.png",
      description:
        "AI-powered market intelligence workspace for investment desks.",
    },
    {
      "@type": "WebSite",
      name: "Tickwise",
      url: "https://tickwise.io/",
      description:
        "AI market intelligence for investment desks. Tickwise monitors the companies you follow, scores every headline by materiality, and delivers a short, prioritized brief.",
    },
    {
      "@type": "SoftwareApplication",
      name: "Tickwise",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://tickwise.io/",
      description:
        "Monitors company newsrooms and press pages, scores each update as material, potentially material, or noteworthy, and emails a prioritized brief on the desk's schedule.",
      featureList: [
        "AI materiality scoring",
        "Noise filtering for webinars, sponsored posts, and recycled PR",
        "Investor-grade read-through on estimates, margins, and valuation",
        "Scheduled email digests",
        "Shared team workspace",
      ],
    },
  ],
};

export default async function HomePage() {
  const { supabase, user } = await getAuthedUser();
  if (user) {
    redirect((await isPlatformAdmin(supabase)) ? "/admin" : "/feed");
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  );
}
