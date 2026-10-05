import { SHARE_MESSAGE_MAX, bookingLink, defaultShareMessage, shareText } from "@bookflow/shared";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Pressable, Share, StyleSheet, Text, TextInput, ToastAndroid, View } from "react-native";

import { initialShareMessage, shareMessageToStore } from "../lib/share-message";
import { getSupabase } from "../lib/supabase";
import { colors, fonts } from "../theme";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";

type Props = {
  visible: boolean;
  onClose: () => void;
  salon: { id: string; name: string; slug: string };
  /** Only owners can save the message; staff share it as it is. */
  canSave: boolean;
};

/** Menu → Booking link (owner-v6 02): the link with Copy, an editable message, then Share. */
export function ShareLinkSheet({ visible, onClose, salon, canSave }: Props) {
  const link = bookingLink(salon.slug);
  const [saved, setSaved] = useState<string | null>(null);
  const [message, setMessage] = useState(() => defaultShareMessage(salon.name));
  const [focused, setFocused] = useState(false);

  // Each time the sheet opens, start from the saved message.
  useEffect(() => {
    if (!visible) return;
    let active = true;
    void getSupabase()
      .from("salons")
      .select("share_message")
      .eq("id", salon.id)
      .single()
      .then(({ data }) => {
        if (!active) return;
        const stored = data?.share_message ?? null;
        setSaved(stored);
        setMessage(initialShareMessage(stored, salon.name));
      });
    return () => {
      active = false;
    };
  }, [visible, salon.id, salon.name]);

  async function copy() {
    await Clipboard.setStringAsync(link);
    ToastAndroid.show("Link copied", ToastAndroid.SHORT);
  }

  async function share() {
    const store = shareMessageToStore(message, salon.name);
    if (canSave && store !== saved) {
      // Saving is a convenience for next time; sharing goes ahead even if it fails.
      const { error } = await getSupabase()
        .from("salons")
        .update({ share_message: store })
        .eq("id", salon.id);
      if (!error) setSaved(store);
    }
    await Share.share({ message: shareText(message, link, salon.name) });
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} variant="handle">
      <Text style={styles.title} accessibilityRole="header">
        Share your booking link
      </Text>

      <View style={styles.linkRow}>
        <View style={styles.linkBox}>
          <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="tail">
            {link.replace(/^https?:\/\//, "")}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copy link"
          onPress={() => void copy()}
          style={({ pressed }) => [styles.copy, pressed && styles.pressed]}
        >
          <Text style={styles.copyText}>Copy</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Message</Text>
      <TextInput
        accessibilityLabel="Message"
        value={message}
        onChangeText={setMessage}
        maxLength={SHARE_MESSAGE_MAX}
        multiline
        textAlignVertical="top"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.message, focused && styles.messageFocused]}
      />
      <View style={styles.underRow}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setMessage(defaultShareMessage(salon.name))}
        >
          <Text style={styles.reset}>Reset to default</Text>
        </Pressable>
        <Text style={styles.counter}>
          {message.length} / {SHARE_MESSAGE_MAX}
        </Text>
      </View>
      <Text style={styles.help}>
        The link goes after your message. WhatsApp shows your banner, logo and name with it.
      </Text>

      <View style={styles.shareButton}>
        <Button title="Share" onPress={() => void share()} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 8, fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.ink },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 15 },
  linkBox: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: colors.field,
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  linkText: { fontFamily: fonts.regular, fontSize: 14, color: colors.subtle },
  copy: {
    width: 76,
    height: 48,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  copyText: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  pressed: { opacity: 0.8 },
  label: { marginTop: 21, fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  message: {
    marginTop: 10,
    minHeight: 76,
    borderWidth: 1,
    borderColor: colors.field,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    color: colors.ink,
  },
  messageFocused: { borderColor: colors.action },
  underRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 7,
  },
  reset: { fontFamily: fonts.medium, fontSize: 13, color: colors.action },
  counter: { fontFamily: fonts.regular, fontSize: 13, color: colors.subtle },
  help: {
    marginTop: 18,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 15,
    color: colors.subtle,
  },
  shareButton: { marginTop: 16 },
});
