import { inspectMapsLink, isGoogleMapsUrl, type MapsLinkInfo } from "@bookflow/shared";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "../../../lib/session";
import { getSupabase } from "../../../lib/supabase";
import { colors, fonts, space, type } from "../../../theme";
import { CardScreen, CardTitle, Illustration, TextField } from "../../../ui";

type Saved = { address: string; mapsUrl: string | null; lat: number | null; lng: number | null };

/** What we know about the link in the field. */
type LinkCheck =
  | { state: "empty" }
  | { state: "saved" }
  | { state: "checking" }
  | { state: "notGoogle" }
  | { state: "failed" }
  | { state: "ok"; info: MapsLinkInfo };

/** Location: view (59) and edit (58). */
export default function LocationScreen() {
  const { membership } = useSession();
  const salonId = membership?.salon.id;
  const [saved, setSaved] = useState<Saved>();
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState("");
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
        const loaded = {
          address: data.address ?? "",
          mapsUrl: data.maps_url,
          lat: data.latitude,
          lng: data.longitude,
        };
        setSaved(loaded);
        setAddress(loaded.address);
        setLink(loaded.mapsUrl ?? "");
        // Nothing saved yet: go straight to the editor (58).
        if (!loaded.address && !loaded.mapsUrl) setEditing(true);
      });
  }, [salonId]);

  useEffect(() => {
    const url = link.trim();
    if (!url) {
      setCheck({ state: "empty" });
      return;
    }
    // The saved link was checked when it was saved; don't refetch it on every visit.
    if (url === saved?.mapsUrl) {
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
  }, [link, saved?.mapsUrl]);

  async function save() {
    if (!salonId || !saved || saving || check.state === "checking") return;
    if (address.trim().length > 200) {
      setError("Keep the address under 200 characters.");
      return;
    }
    // Only a checked link (or clearing the field) changes the map fields; otherwise keep them.
    const pin =
      check.state === "empty"
        ? { mapsUrl: null, lat: null, lng: null }
        : check.state === "ok"
          ? {
              mapsUrl: check.info.mapsUrl,
              lat: check.info.pin?.lat ?? null,
              lng: check.info.pin?.lng ?? null,
            }
          : { mapsUrl: saved.mapsUrl, lat: saved.lat, lng: saved.lng };
    setSaving(true);
    setError(undefined);
    const { error: saveError } = await getSupabase()
      .from("salons")
      .update({
        address: address.trim() || null,
        maps_url: pin.mapsUrl,
        latitude: pin.lat,
        longitude: pin.lng,
      })
      .eq("id", salonId);
    setSaving(false);
    if (saveError) {
      setError("Couldn't save. Check your connection and try again.");
      return;
    }
    const next = { address: address.trim(), ...pin };
    setSaved(next);
    setLink(next.mapsUrl ?? "");
    setEditing(false);
  }

  const intro = (
    <Text style={styles.intro}>
      Help your clients find you without the guesswork. Just share your{" "}
      <Text style={styles.bold}>Google Maps location pin</Text>, and we’ll show them exactly where
      to go.
    </Text>
  );

  if (editing) {
    const hasSaved = !!saved && (!!saved.address || !!saved.mapsUrl);
    return (
      <CardScreen
        left={{
          icon: "arrow-left",
          label: hasSaved ? "Cancel editing" : "Back",
          onPress: () => {
            if (!hasSaved) return router.back();
            setAddress(saved.address);
            setLink(saved.mapsUrl ?? "");
            setError(undefined);
            setEditing(false);
          },
        }}
        right={{
          icon: "check",
          label: saving ? "Saving" : "Save location",
          onPress: () => void save(),
        }}
      >
        <CardTitle>Location</CardTitle>
        {intro}
        {saved ? (
          <View style={styles.fields}>
            <TextField
              variant="card"
              label="Google Maps pin"
              hideLabel
              placeholder="Google Maps pin"
              value={link}
              onChangeText={setLink}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              hint="In the Google Maps app, open your salon, tap Share, then Copy link."
            />
            <LinkStatus check={check} saved={saved} />
            <TextField
              variant="card"
              label="Address"
              hideLabel
              placeholder="Address"
              value={address}
              onChangeText={setAddress}
              maxLength={200}
              multiline
            />
          </View>
        ) : null}
        {saving ? <Text style={styles.muted}>Saving…</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </CardScreen>
    );
  }

  return (
    <CardScreen
      right={
        saved
          ? { icon: "edit-2", label: "Edit location", onPress: () => setEditing(true) }
          : undefined
      }
    >
      <CardTitle>Location</CardTitle>
      {intro}
      {saved?.mapsUrl ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Open in Google Maps"
          onPress={() => void Linking.openURL(saved.mapsUrl!)}
          style={styles.map}
        >
          <Illustration name="map" style={styles.mapArt} />
        </Pressable>
      ) : null}
      {saved?.address ? <Text style={styles.address}>{saved.address}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </CardScreen>
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
  intro: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.text,
    textAlign: "center",
    marginTop: space(2),
    paddingHorizontal: space(1),
  },
  bold: { fontFamily: fonts.bold },
  fields: { gap: space(3), marginTop: space(2), paddingRight: space(6) },
  map: { marginTop: space(4), marginHorizontal: space(2), borderRadius: 14, overflow: "hidden" },
  mapArt: { width: "100%", height: undefined, aspectRatio: 280 / 156 },
  address: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: "#111111",
    marginHorizontal: space(2),
  },
  status: { gap: space(1) },
  ok: { ...type.bodyStrong, color: colors.success },
  muted: { ...type.caption, color: colors.muted },
  warn: { ...type.caption, color: colors.attentionText },
  error: { ...type.caption, color: colors.danger },
});
