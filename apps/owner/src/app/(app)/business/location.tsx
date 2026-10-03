import { inspectMapsLink, isGoogleMapsUrl, type MapsLinkInfo } from "@bookflow/shared";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useSession } from "../../../lib/session";
import { getSupabase } from "../../../lib/supabase";
import { colors, space, type } from "../../../theme";
import { Button, Header, Screen, TextField } from "../../../ui";

type Saved = { mapsUrl: string | null; lat: number | null; lng: number | null };

/** What we know about the link in the field. */
type LinkCheck =
  | { state: "empty" }
  | { state: "saved" }
  | { state: "checking" }
  | { state: "notGoogle" }
  | { state: "failed" }
  | { state: "ok"; info: MapsLinkInfo };

export default function LocationScreen() {
  const { membership } = useSession();
  const salonId = membership?.salon.id;
  const [address, setAddress] = useState<string>();
  const [saved, setSaved] = useState<Saved>({ mapsUrl: null, lat: null, lng: null });
  const [link, setLink] = useState("");
  const [check, setCheck] = useState<LinkCheck>({ state: "empty" });
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!salonId) return;
    void getSupabase()
      .from("salons")
      .select("address, maps_url, latitude, longitude")
      .eq("id", salonId)
      .single()
      .then(({ data, error: loadError }) => {
        if (loadError || !data) {
          setError("Couldn't load your location. Go back and try again.");
          return;
        }
        setAddress(data.address ?? "");
        setSaved({ mapsUrl: data.maps_url, lat: data.latitude, lng: data.longitude });
        setLink(data.maps_url ?? "");
      });
  }, [salonId]);

  useEffect(() => {
    const url = link.trim();
    if (!url) {
      setCheck({ state: "empty" });
      return;
    }
    // The saved link was checked when it was saved; don't refetch it on every visit.
    if (url === saved.mapsUrl) {
      setCheck({ state: "saved" });
      return;
    }
    if (!isGoogleMapsUrl(url)) {
      setCheck({ state: "notGoogle" });
      return;
    }
    let current = true;
    setCheck({ state: "checking" });
    // Wait for typing or pasting to settle before following a short link.
    const timer = setTimeout(() => {
      void inspectMapsLink(url).then((info) => {
        if (current) setCheck(info ? { state: "ok", info } : { state: "failed" });
      });
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [link, saved.mapsUrl]);

  async function save() {
    if (!salonId || address === undefined) return;
    if (address.trim().length > 200) {
      setError("Keep the address under 200 characters.");
      return;
    }
    // Only a checked link (or clearing the field) changes the map fields; otherwise keep them.
    const maps =
      check.state === "empty"
        ? { maps_url: null, latitude: null, longitude: null }
        : check.state === "ok"
          ? {
              maps_url: check.info.mapsUrl,
              latitude: check.info.pin?.lat ?? null,
              longitude: check.info.pin?.lng ?? null,
            }
          : {};
    setSaving(true);
    setError(undefined);
    const { error: saveError } = await getSupabase()
      .from("salons")
      .update({ address: address.trim() || null, ...maps })
      .eq("id", salonId);
    setSaving(false);
    if (saveError) {
      setError("Couldn't save. Check your connection and try again.");
      return;
    }
    router.back();
  }

  return (
    <Screen
      footer={
        <Button
          title="Save location"
          onPress={() => void save()}
          loading={saving}
          disabled={address === undefined || check.state === "checking"}
        />
      }
    >
      <Header title="Location" subtitle="Where clients will find you" />
      {address !== undefined ? (
        <>
          <TextField
            label="Address"
            placeholder="2nd floor, Galana Plaza, Kilimani, Nairobi"
            value={address}
            onChangeText={setAddress}
            maxLength={200}
            multiline
          />
          <TextField
            label="Google Maps link (optional)"
            placeholder="https://maps.app.goo.gl/…"
            value={link}
            onChangeText={setLink}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            hint="In the Google Maps app, open your salon, tap Share, then Copy link."
          />
          <LinkStatus check={check} saved={saved} />
        </>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

function LinkStatus({ check, saved }: { check: LinkCheck; saved: Saved }) {
  switch (check.state) {
    case "empty":
      return null;
    case "checking":
      return (
        <Text style={styles.muted} accessibilityLiveRegion="polite">
          Checking link…
        </Text>
      );
    case "saved":
      return (
        <View style={styles.status} accessibilityLiveRegion="polite">
          <Text style={styles.ok}>✓ Saved</Text>
          <Text style={styles.muted}>
            Clients will get directions from this link.
            {saved.lat !== null && saved.lng !== null
              ? ` Pin ${saved.lat.toFixed(5)}, ${saved.lng.toFixed(5)}.`
              : ""}
          </Text>
        </View>
      );
    case "notGoogle":
      return (
        <Text style={styles.warn} accessibilityLiveRegion="polite">
          That doesn&apos;t look like a Google Maps link
        </Text>
      );
    case "failed":
      return (
        <Text style={styles.warn} accessibilityLiveRegion="polite">
          Couldn&apos;t check that link. Check your connection and try again.
        </Text>
      );
    case "ok": {
      const { placeName, pin } = check.info;
      return (
        <View style={styles.status} accessibilityLiveRegion="polite">
          <Text style={styles.ok}>
            {placeName ? `✓ ${placeName}` : pin ? "✓ Pin found" : "✓ Google Maps link"}
          </Text>
          <Text style={styles.muted}>
            {placeName
              ? "Clients will get directions to this place."
              : "Clients will get directions from this link."}
          </Text>
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  status: { gap: space(1) },
  ok: { ...type.bodyStrong, color: colors.success },
  muted: { ...type.caption, color: colors.muted },
  warn: { ...type.caption, color: colors.attentionText },
  error: { ...type.caption, color: colors.danger },
});
