import { formatKenyanPhone } from "@bookflow/shared";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { clientFormResult, duplicatePhoneMessage } from "../lib/clients";
import { clientHref } from "../lib/routes";
import { useSession } from "../lib/session";
import { getSupabase } from "../lib/supabase";
import { colors, fonts } from "../theme";
import { Page, SaveBar } from "./Page";
import { TextField } from "./TextField";

type Duplicate = { id: string; full_name: string };

/**
 * Add a client (name and optional phone), or edit one when `clientId` is given. A phone that
 * another client of the salon already has is refused, with a link to that client.
 */
export function ClientForm({ clientId }: { clientId?: string }) {
  const { membership } = useSession();
  const salonId = membership?.salon.id;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loaded, setLoaded] = useState(!clientId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ field: "name" | "phone" | "form"; message: string }>();
  const [duplicate, setDuplicate] = useState<Duplicate>();

  useEffect(() => {
    if (!clientId) return;
    void getSupabase()
      .from("clients")
      .select("full_name, phone")
      .eq("id", clientId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setName(data.full_name);
          setPhone(data.phone ? formatKenyanPhone(data.phone) : "");
        }
        setLoaded(true);
      });
  }, [clientId]);

  /** Another client of this salon with the same phone, if any. */
  async function findDuplicate(e164: string): Promise<Duplicate | undefined> {
    let q = getSupabase()
      .from("clients")
      .select("id, full_name")
      .eq("salon_id", salonId!)
      .eq("phone", e164);
    if (clientId) q = q.neq("id", clientId);
    const { data } = await q.order("created_at").limit(1);
    return data?.[0];
  }

  async function save() {
    setError(undefined);
    setDuplicate(undefined);
    const result = clientFormResult({ name, phone });
    if (!result.ok) {
      setError({ field: result.field, message: result.message });
      return;
    }
    setSaving(true);
    const taken = result.phone ? await findDuplicate(result.phone) : undefined;
    if (taken) {
      setSaving(false);
      setDuplicate(taken);
      return;
    }
    const supabase = getSupabase();
    const write = clientId
      ? supabase
          .from("clients")
          .update({ full_name: result.name, phone: result.phone })
          .eq("id", clientId)
          .select("id")
          .single()
      : supabase
          .from("clients")
          .insert({ salon_id: salonId!, full_name: result.name, phone: result.phone })
          .select("id")
          .single();
    const { data, error: saveError } = await write;
    if (saveError?.code === "23505" && result.phone) {
      // A verified client already holds this number.
      const holder = await findDuplicate(result.phone);
      setSaving(false);
      if (holder) setDuplicate(holder);
      else setError({ field: "phone", message: "That number already belongs to another client" });
      return;
    }
    setSaving(false);
    if (saveError || !data) {
      setError({
        field: "form",
        message: "Couldn't save the client. Check your connection and try again.",
      });
      return;
    }
    if (clientId) router.back();
    else router.replace(clientHref(data.id));
  }

  if (!salonId) return null;

  return (
    <Page
      title={clientId ? "Edit client" : "Add a client"}
      footer={
        <SaveBar
          title={clientId ? "Save changes" : "Save client"}
          onPress={() => void save()}
          loading={saving}
          disabled={!loaded}
        />
      }
    >
      <TextField
        label="Name"
        required
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError(undefined);
        }}
        autoCapitalize="words"
        maxLength={80}
        autoFocus={!clientId}
        error={error?.field === "name" ? error.message : undefined}
      />
      <View>
        <TextField
          label="Phone (optional)"
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            setError(undefined);
            setDuplicate(undefined);
          }}
          placeholder="0712 345 678"
          keyboardType="phone-pad"
          error={error?.field === "phone" ? error.message : undefined}
        />
        {duplicate ? (
          <View style={styles.duplicate} accessibilityLiveRegion="polite">
            <Text style={styles.duplicateText}>{duplicatePhoneMessage(duplicate.full_name)}</Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Open ${duplicate.full_name}`}
              onPress={() => router.replace(clientHref(duplicate.id))}
              hitSlop={10}
            >
              <Text style={styles.link}>Open {duplicate.full_name} ›</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      {error?.field === "form" ? <Text style={styles.duplicateText}>{error.message}</Text> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  duplicate: { marginTop: 8, gap: 6 },
  duplicateText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.danger },
  link: { fontFamily: fonts.semibold, fontSize: 15, color: colors.action },
});
