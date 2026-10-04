import { inspectMapsLink, isGoogleMapsUrl, type MapsLinkInfo } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "../../../lib/session";
import { getSupabase } from "../../../lib/supabase";
import { colors, fonts, minTouch, type } from "../../../theme";
import { Button, DrawnMap, Page, SaveBar, TextField } from "../../../ui";

type Saved = { address: string; mapsUrl: string | null; lat: number | null; lng: number | null };
type Pin = Pick<Saved, "mapsUrl" | "lat" | "lng">;

/** What we know about the link in the paste field. */
type LinkCheck =
  | { state: "empty" }
  | { state: "checking" }
  | { state: "notGoogle" }
  | { state: "failed" }
  | { state: "ok"; info: MapsLinkInfo };

const GOOGLE_MAPS = "https://www.google.com/maps";

/** Location: no pin yet (owner-v2 06) or pin set (07). No pencil, no frame. */
export default function LocationScreen() {
  const { membership } = useSession();
  const salonId = membership?.salon.id;
  const [saved, setSaved] = useState<Saved>();
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  // "Change pin" switches a set pin to the paste field; cancelling keeps the old pin.
  const [changingPin, setChangingPin] = useState(false);
  const [removingPin, setRemovingPin] = useState(false);
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
        setSaved({
          address: data.address ?? "",
          mapsUrl: data.maps_url,
          lat: data.latitude,
          lng: data.longitude,
        });
        setAddress(data.address ?? "");
      });
  }, [salonId]);

  // The saved pin's place name isn't stored; read it from the link (long links need no fetch).
  useEffect(() => {
    const url = saved?.mapsUrl;
    setPlaceName(null);
    if (!url) return;
    let current = true;
    void inspectMapsLink(url).then((info) => {
      if (current) setPlaceName(info?.placeName ?? null);
    });
    return () => {
      current = false;
    };
  }, [saved?.mapsUrl]);

  useEffect(() => {
    const url = link.trim();
    if (!url) {
      setCheck({ state: "empty" });
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
  }, [link]);

  const hasPin = !!saved?.mapsUrl && !removingPin;
  const pasting = !hasPin || changingPin;

  /** The pin to save: a checked link replaces it; removing clears it; otherwise it stays. */
  function nextPin(): Pin {
    if (!saved) return { mapsUrl: null, lat: null, lng: null };
    if (pasting && check.state === "ok") {
      return {
        mapsUrl: check.info.mapsUrl,
        lat: check.info.pin?.lat ?? null,
        lng: check.info.pin?.lng ?? null,
      };
    }
    if (removingPin) return { mapsUrl: null, lat: null, lng: null };
    return { mapsUrl: saved.mapsUrl, lat: saved.lat, lng: saved.lng };
  }

  async function save() {
    if (!salonId || !saved || saving || check.state === "checking") return;
    if (address.trim().length > 200) {
      setError("Keep the address under 200 characters.");
      return;
    }
    const pin = nextPin();
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
    setSaved({ address: address.trim(), ...pin });
    setAddress(address.trim());
    setLink("");
    setChangingPin(false);
    setRemovingPin(false);
  }

  function cancelChange() {
    setChangingPin(false);
    setRemovingPin(false);
    setLink("");
  }

  const changed =
    !!saved &&
    (address.trim() !== saved.address || removingPin || (pasting && check.state === "ok"));
  // A set pin with nothing changed shows no Save bar, as in 07.
  const showSave = pasting || changed;

  return (
    <Page
      title="Location"
      footer={
        showSave ? (
          <SaveBar
            title="Save location"
            onPress={() => void save()}
            disabled={!changed || check.state === "checking"}
            loading={saving}
          />
        ) : null
      }
    >
      {saved ? (
        <>
          {hasPin && !changingPin ? (
            <>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Open your pin in Google Maps"
                onPress={() => void Linking.openURL(saved.mapsUrl!)}
                style={styles.mapTap}
              >
                <DrawnMap />
              </Pressable>
              <View style={styles.place}>
                <View style={styles.placeRow}>
                  <Feather name="check" size={20} color={colors.success} />
                  <Text style={styles.placeName}>{placeName ?? "Pin set"}</Text>
                </View>
                <Text style={styles.hint}>
                  Clients get directions to this place. Tap the map to check it.
                </Text>
              </View>
            </>
          ) : null}

          <TextField
            label="Address"
            placeholder="e.g. 2nd floor, Galana Plaza, Kilimani"
            value={address}
            onChangeText={setAddress}
            maxLength={200}
          />

          {hasPin && !changingPin ? (
            <Button title="Change pin" variant="outline" onPress={() => setChangingPin(true)} />
          ) : (
            <View style={styles.dropPin}>
              <Text style={styles.label}>Drop your pin</Text>
              <View style={styles.steps}>
                <Text style={styles.step}>
                  <Text style={styles.bold}>1.</Text> Open Google Maps and find your salon
                </Text>
                <Text style={styles.step}>
                  <Text style={styles.bold}>2.</Text> Tap <Text style={styles.bold}>Share</Text> →{" "}
                  <Text style={styles.bold}>Copy link</Text>
                </Text>
                <Text style={styles.step}>
                  <Text style={styles.bold}>3.</Text> Paste it below
                </Text>
                <View style={styles.openMaps}>
                  <Button
                    title="Open Google Maps"
                    variant="outline"
                    onPress={() => void Linking.openURL(GOOGLE_MAPS)}
                  />
                </View>
              </View>
              <View style={styles.paste}>
                <TextField
                  label="Google Maps link"
                  hideLabel
                  placeholder="Paste your Google Maps link"
                  value={link}
                  onChangeText={setLink}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                <LinkStatus check={check} />
              </View>
              {changingPin ? (
                <View style={styles.links}>
                  <TextLink title="Cancel" onPress={cancelChange} />
                  <TextLink
                    title="Remove pin"
                    danger
                    onPress={() => {
                      setRemovingPin(true);
                      setChangingPin(false);
                      setLink("");
                    }}
                  />
                </View>
              ) : removingPin ? (
                <View style={styles.links}>
                  <Text style={styles.hint}>Your pin will be removed when you save.</Text>
                  <TextLink title="Keep pin" onPress={cancelChange} />
                </View>
              ) : null}
            </View>
          )}
        </>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Page>
  );
}

function TextLink({
  title,
  danger = false,
  onPress,
}: {
  title: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.textLink}>
      <Text style={[styles.textLinkText, danger && { color: colors.danger }]}>{title}</Text>
    </Pressable>
  );
}

function LinkStatus({ check }: { check: LinkCheck }) {
  switch (check.state) {
    case "empty":
      return <Text style={styles.hint}>Clients get directions to this exact spot.</Text>;
    case "checking":
      return (
        <Text style={styles.hint} accessibilityLiveRegion="polite">
          Checking link…
        </Text>
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
        <View accessibilityLiveRegion="polite">
          <Text style={styles.ok}>
            {placeName ? `✓ ${placeName}` : pin ? "✓ Pin found" : "✓ Google Maps link"}
          </Text>
          <Text style={styles.hint}>
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
  mapTap: { borderRadius: 16, overflow: "hidden", marginTop: -8 },
  place: { gap: 6, marginTop: -2 },
  placeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  placeName: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  dropPin: { gap: 8 },
  steps: { backgroundColor: colors.softFill, borderRadius: 16, padding: 16, gap: 6 },
  step: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 20, color: colors.ink },
  bold: { fontFamily: fonts.semibold },
  openMaps: { marginTop: 10 },
  paste: { gap: 8, marginTop: 4 },
  links: { flexDirection: "row", alignItems: "center", gap: 20 },
  textLink: { minHeight: minTouch, justifyContent: "center" },
  textLinkText: { fontFamily: fonts.medium, fontSize: 16, color: colors.action },
  hint: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.subtle },
  ok: { ...type.bodyStrong, color: colors.success },
  warn: { ...type.caption, fontSize: 14, color: colors.attentionText },
  error: { ...type.caption, color: colors.danger },
});
