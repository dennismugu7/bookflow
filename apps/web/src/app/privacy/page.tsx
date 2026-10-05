import type { Metadata } from "next";

import { LegalDocument } from "../../components/legal-document";

// Built once from docs/legal; nothing here changes per request.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Privacy policy · Bookflow",
  description: "What Bookflow collects, why, who we share it with, and your choices.",
};

export default function PrivacyPage() {
  return <LegalDocument name="privacy.md" />;
}
