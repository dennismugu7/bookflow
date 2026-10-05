import {
  deletionConfirmParts,
  deletionStatement,
  isDeletionReason,
  parseDeletionSummary,
  upcomingWarningParts,
  type DeletionSummary,
  type TextPart,
} from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { getEnv } from "../../../env";
import { DELETE_ERROR, requestAccountDeletion, webUrl } from "../../../lib/account-deletion";
import { useSession } from "../../../lib/session";
import { getSupabase } from "../../../lib/supabase";
import { colors, fonts } from "../../../theme";
import { DeletionPage, FooterButton } from "../../../ui/DeletionPage";

const LOAD_ERROR = "Couldn't load your salon. Go back and try again.";

/** Delete account, step 2 (owner-v7 04, original 37): name what goes, tick, delete. */
export default function DeleteConfirmScreen() {
  const params = useLocalSearchParams<{ reason?: string; details?: string }>();
  const reason = isDeletionReason(params.reason) ? params.reason : undefined;
  const { signOutDeleted } = useSession();
  const [summary, setSummary] = useState<DeletionSummary>();
  const [ticked, setTicked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void getSupabase()
      .rpc("get_account_deletion_summary")
      .then(({ data, error: loadError }) => {
        const parsed = parseDeletionSummary(data);
        if (loadError || !parsed) setError(LOAD_ERROR);
        else setSummary(parsed);
      });
  }, []);

  async function remove() {
    if (!reason) return;
    setDeleting(true);
    setError(undefined);
    // getSession refreshes an expired token first.
    const { data } = await getSupabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setDeleting(false);
      setError(DELETE_ERROR);
      return;
    }
    const result = await requestAccountDeletion(
      { reason, details: params.details ?? "" },
      token,
      webUrl(getEnv().EXPO_PUBLIC_WEB_URL),
    );
    if (!result.ok) {
      setDeleting(false);
      setError(result.message);
      return;
    }
    // Leave the signed-in screens first, so clearing the session lands on 05, not Welcome.
    router.replace("/account-deleted");
    await signOutDeleted();
  }

  const salons = summary?.salons ?? [];
  const warning = summary ? upcomingWarningParts(salons) : null;

  return (
    <DeletionPage
      onBack={() => router.back()}
      onClose={() => router.dismissTo("/settings")}
      footer={
        <>
          <FooterButton
            title="Delete account"
            danger
            disabled={!ticked || !summary || !reason}
            loading={deleting}
            onPress={() => void remove()}
          />
          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
        </>
      }
    >
      <Text style={styles.title} accessibilityRole="header">
        Delete your Bookflow account
      </Text>
      {summary ? (
        <>
          <Text style={styles.body}>
            <Parts parts={deletionConfirmParts(salons)} />
          </Text>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={deletionStatement(salons.length)}
            accessibilityState={{ checked: ticked }}
            aria-checked={ticked}
            onPress={() => setTicked((t) => !t)}
            style={styles.tick}
          >
            <View style={[styles.box, ticked && styles.boxOn]}>
              {ticked ? <Feather name="check" size={16} color={colors.white} /> : null}
            </View>
            <Text style={styles.tickText}>{deletionStatement(salons.length)}</Text>
          </Pressable>
          {warning ? (
            <View style={styles.warning}>
              <Text style={styles.warningText}>
                <Parts parts={warning} />
              </Text>
            </View>
          ) : null}
        </>
      ) : error ? null : (
        <ActivityIndicator color={colors.action} style={styles.loading} />
      )}
    </DeletionPage>
  );
}

function Parts({ parts }: { parts: TextPart[] }) {
  return parts.map((p, i) => (
    <Text key={i} style={p.bold ? styles.bold : null}>
      {p.text}
    </Text>
  ));
}

// Sizes from owner-v7 04 at 390 pt.
const styles = StyleSheet.create({
  title: {
    marginTop: 26,
    fontFamily: fonts.semibold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.ink,
  },
  body: {
    marginTop: 18,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 23,
    color: colors.subtle,
  },
  bold: { fontFamily: fonts.bold, color: colors.ink },
  tick: { marginTop: 24, flexDirection: "row", alignItems: "flex-start", gap: 14 },
  box: {
    width: 24,
    height: 24,
    marginTop: 1,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { borderWidth: 0, backgroundColor: colors.action },
  tickText: { flex: 1, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.ink },
  warning: {
    marginTop: 22,
    borderRadius: 14,
    backgroundColor: colors.attentionTint,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  warningText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink },
  loading: { marginTop: 40 },
  error: {
    marginTop: 10,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
  },
});
