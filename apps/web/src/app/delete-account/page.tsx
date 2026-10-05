import { parseDeletionSummary } from "@bookflow/shared";
import type { Metadata } from "next";
import { connection } from "next/server";

import { LegalFooter } from "../../components/legal-footer";
import { SiteHeader } from "../../components/site-header";
import { createClient } from "../../lib/supabase/server";
import { DeleteAccountFlow } from "./delete-flow";

export const metadata: Metadata = {
  title: "Delete your account · Bookflow",
  description:
    "Delete your Bookflow account, as a client or a salon owner. Sign in with your email, then confirm.",
};

/**
 * /delete-account (owner-v7 06): the link Google Play asks for, and how clients delete. Email →
 * 6-digit code → the app's reasons and confirm steps → deleted. Signed-in visitors skip to the
 * reasons.
 */
export default async function DeleteAccountPage() {
  // Per visitor (their session), never prerendered at build time.
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let summary = null;
  if (user) {
    const { data } = await supabase.rpc("get_account_deletion_summary");
    summary = parseDeletionSummary(data);
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col">
        <DeleteAccountFlow signedIn={!!user} summary={summary} />
        <LegalFooter className="mt-auto pt-8 pb-4" />
      </main>
    </>
  );
}
