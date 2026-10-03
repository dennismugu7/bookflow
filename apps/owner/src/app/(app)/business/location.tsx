import { parseGoogleMapsLink } from "@bookflow/shared";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { useSession } from "../../../lib/session";
import { getSupabase } from "../../../lib/supabase";
import { colors, fonts, minTouch, type } from "../../../theme";
import { Button, Card, Header, Screen, TextField } from "../../../ui";

type Pin = { lat: number; lng: number } | null;

export default function LocationScreen() {
  const { membership } = useSession();
  const salonId = membership?.salon.id;
  const [address, setAddress] = useState<string>();
  const [link, setLink] = useState("");
  const [pin, setPin] = useState<Pin>(null);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!salonId) return;
    void getSupabase()
      .from("salons")
      .select("address, latitude, longitude")
      .eq("id", salonId)
      .single()
      .then(({ data, error: loadError }) => {
        if (loadError || !data) {
          setError("Couldn't load your location. Go back and try again.");
          return;
        }
        setAddress(data.address ?? "");
        setPin(
          data.latitude !== null && data.longitude !== null
            ? { lat: data.latitude, lng: data.longitude }
            : null,
        );
      });
  }, [salonId]);

  const parsed = link.trim() ? parseGoogleMapsLink(link.trim()) : null;
  const linkUnreadable = link.trim().length > 0 && parsed === null;

  async function save() {
    if (!salonId || address === undefined) return;
    if (address.trim().length > 200) {
      setError("Keep the address under 200 characters.");
      return;
    }
    // A readable link sets the pin; an unreadable or empty one keeps the current pin.
    const nextPin = parsed ?? pin;
    setSaving(true);
    const { error: saveError } = await getSupabase()
      .from("salons")
      .update({
        address: address.trim() || null,
        latitude: nextPin?.lat ?? null,
        longitude: nextPin?.lng ?? null,
      })
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
          disabled={address === undefined}
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
            label="Paste your Google Maps link (optional)"
            placeholder="https://www.google.com/maps/place/…"
            value={link}
            onChangeText={setLink}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            hint="In Google Maps, open your salon, tap Share and copy the link."
          />
          {parsed ? (
            <Text style={styles.found} accessibilityLiveRegion="polite">
              Pin found ✓
            </Text>
          ) : linkUnreadable ? (
            <Text style={styles.notFound} accessibilityLiveRegion="polite">
              We couldn&apos;t read a pin from that link, the address will still show.
            </Text>
          ) : null}
          {!link.trim() && pin ? (
            <Card>
              <Text style={type.bodyStrong}>Pin saved ✓</Text>
              <Text style={[type.caption, { color: colors.muted }]}>
                {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove pin"
                onPress={() => setPin(null)}
                style={styles.link}
              >
                <Text style={styles.removeText}>Remove pin</Text>
              </Pressable>
            </Card>
          ) : null}
        </>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  found: { ...type.bodyStrong, color: colors.success },
  notFound: { ...type.caption, color: colors.attentionText },
  link: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start" },
  removeText: { fontFamily: fonts.bold, fontSize: 14, color: colors.danger },
  error: { ...type.caption, color: colors.danger },
});
