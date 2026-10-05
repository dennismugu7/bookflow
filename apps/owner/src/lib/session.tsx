import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { forgetIntroShown, unregisterThisPhone } from "./push";
import { forgetCalendarView } from "./view-pref";
import { getSupabase } from "./supabase";

export type Membership = {
  role: "owner" | "staff";
  /** The staff profile this login acts as, if any. */
  staffId: string | null;
  salon: { id: string; name: string; slug: string; timezone: string; isPublished: boolean };
};

type SessionState = {
  /** undefined while the stored session is being read. */
  session: Session | null | undefined;
  /** undefined while loading; null when the user has no salon yet. */
  membership: Membership | null | undefined;
  membershipError: boolean;
  reloadMembership: () => Promise<void>;
  signOut: () => Promise<void>;
  /** After the server deleted the account: forget this phone's token, local settings and session. */
  signOutDeleted: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function useSession(): SessionState {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [membership, setMembership] = useState<Membership | null | undefined>(undefined);
  const [membershipError, setMembershipError] = useState(false);
  const userId = session?.user.id;

  useEffect(() => {
    void getSupabase()
      .auth.getSession()
      .then(({ data }) => setSession(data.session));
    // Only store the session here: Supabase warns against awaiting its own calls inside this callback.
    const { data } = getSupabase().auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const reloadMembership = useCallback(async () => {
    if (!userId) {
      setMembership(null);
      return;
    }
    setMembershipError(false);
    // RLS returns only this user's rows; salons the user owns are readable even when unpublished.
    const { data, error } = await getSupabase()
      .from("salon_members")
      .select("role, staff_id, salon:salons(id, name, slug, timezone, is_published)")
      .eq("user_id", userId)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (error) {
      setMembershipError(true);
      return;
    }
    setMembership(
      data?.salon
        ? {
            role: data.role,
            staffId: data.staff_id,
            salon: {
              id: data.salon.id,
              name: data.salon.name,
              slug: data.salon.slug,
              timezone: data.salon.timezone,
              isPublished: data.salon.is_published,
            },
          }
        : null,
    );
  }, [userId]);

  useEffect(() => {
    setMembership(undefined);
    void reloadMembership();
  }, [reloadMembership]);

  const signOut = useCallback(async () => {
    await unregisterThisPhone();
    await getSupabase().auth.signOut();
  }, []);

  const signOutDeleted = useCallback(async () => {
    await unregisterThisPhone();
    await Promise.all([forgetIntroShown(), forgetCalendarView()]);
    // The user no longer exists on the server, so only the stored session is removed.
    await getSupabase().auth.signOut({ scope: "local" });
  }, []);

  return (
    <SessionContext.Provider
      value={{ session, membership, membershipError, reloadMembership, signOut, signOutDeleted }}
    >
      {children}
    </SessionContext.Provider>
  );
}
