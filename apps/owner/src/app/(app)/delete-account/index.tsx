import {
  DELETION_DETAILS_MAX,
  DELETION_REASONS,
  SUPPORT_EMAIL,
  canContinueDeletion,
  deletionCounter,
  type DeletionReason,
} from "@bookflow/shared";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, fonts } from "../../../theme";
import { DeletionPage, FooterButton } from "../../../ui/DeletionPage";

/** Delete account, step 1 (owner-v7 03, originals 35/36): why are you leaving. */
export default function DeleteReasonsScreen() {
  const [reason, setReason] = useState<DeletionReason>();
  const [details, setDetails] = useState("");
  const counter = deletionCounter(details);

  return (
    <DeletionPage
      onClose={() => router.dismissTo("/settings")}
      footer={
        <FooterButton
          title="Continue"
          arrow
          disabled={!canContinueDeletion(reason, details)}
          onPress={() =>
            router.push({
              pathname: "/delete-account/confirm",
              params: { reason: reason ?? "", details: reason === "other" ? details : "" },
            })
          }
        />
      }
    >
      <Text style={styles.kicker}>Delete my account</Text>
      <Text style={styles.title} accessibilityRole="header">
        We&apos;re sad to see you go!
      </Text>
      <Text style={styles.muted}>
        If there&apos;s anything we could do to make things right, we&apos;d love to hear from you.
        Reach out anytime at {SUPPORT_EMAIL}
      </Text>
      <Text style={styles.heading}>Help us improve</Text>
      <Text style={[styles.muted, styles.ask]}>
        Please let us know the reason for deleting your account:
      </Text>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {DELETION_REASONS.map((r) => {
          const selected = reason === r.value;
          return (
            <Pressable
              key={r.value}
              accessibilityRole="radio"
              accessibilityLabel={r.label}
              accessibilityState={{ checked: selected }}
              aria-checked={selected}
              onPress={() => setReason(r.value)}
              hitSlop={2}
              style={styles.option}
            >
              <View style={[styles.radio, selected && styles.radioOn]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <Text style={styles.optionText}>{r.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {reason === "other" ? (
        <View style={styles.detailsBox}>
          <TextInput
            accessibilityLabel="Tell us more"
            value={details}
            onChangeText={setDetails}
            maxLength={DELETION_DETAILS_MAX}
            multiline
            autoFocus
            textAlignVertical="top"
            style={styles.details}
          />
          {counter ? <Text style={styles.counter}>{counter}</Text> : null}
        </View>
      ) : null}
    </DeletionPage>
  );
}

// Sizes from owner-v7 03 at 390 pt.
const styles = StyleSheet.create({
  kicker: {
    marginTop: 5,
    fontFamily: fonts.semibold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.ink,
  },
  title: {
    marginTop: 27,
    fontFamily: fonts.bold,
    fontSize: 30,
    lineHeight: 36,
    color: colors.ink,
  },
  muted: {
    marginTop: 10,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    color: colors.subtle,
  },
  heading: {
    marginTop: 23,
    fontFamily: fonts.semibold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.ink,
  },
  ask: { lineHeight: 18, marginTop: 9 },
  options: { marginTop: 10 },
  // 41 pt rows as in the mockup; hitSlop keeps the 44 pt touch target.
  option: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingVertical: 9.5 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderWidth: 0, backgroundColor: colors.action },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white },
  optionText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 22,
    color: colors.ink,
  },
  detailsBox: { marginTop: 0, marginLeft: 36 },
  details: {
    height: 69,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
  },
  counter: {
    marginTop: 4,
    textAlign: "right",
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.subtle,
  },
});
