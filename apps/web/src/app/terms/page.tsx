import type { Metadata } from "next";

import { LegalDocument } from "../../components/legal-document";

// Built once from docs/legal; nothing here changes per request.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Terms of service · Bookflow",
  description: "The terms for using Bookflow's booking website and the Bookflow Owner app.",
};

export default function TermsPage() {
  return <LegalDocument name="terms.md" />;
}
