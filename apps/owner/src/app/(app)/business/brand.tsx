import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useImageSlot } from "../../../lib/media";
import { useSession } from "../../../lib/session";
import { validateBrand, type BrandErrors } from "../../../lib/setup";
import { getSupabase } from "../../../lib/supabase";
import { colors, space, type } from "../../../theme";
import { Button, Card, Header, ImageSlot, Screen, TextField } from "../../../ui";

type Brand = { name: string; tagline: string; about: string };

export default function BrandScreen() {
  const { membership, reloadMembership } = useSession();
  const salonId = membership?.salon.id;
  const [brand, setBrand] = useState<Brand>();
  const [errors, setErrors] = useState<BrandErrors & { form?: string }>({});
  const [saving, setSaving] = useState(false);

  // Each image saves its path as soon as it has uploaded, independent of "Save brand".
  const saveLogo = useCallback(
    async (path: string) => {
      const { error } = await getSupabase()
        .from("salons")
        .update({ logo_path: path })
        .eq("id", salonId!);
      if (error) throw error;
    },
    [salonId],
  );
  const saveBanner = useCallback(
    async (path: string) => {
      const { error } = await getSupabase()
        .from("salons")
        .update({ banner_path: path })
        .eq("id", salonId!);
      if (error) throw error;
    },
    [salonId],
  );
  const logo = useImageSlot(salonId, "logo", saveLogo);
  const banner = useImageSlot(salonId, "banner", saveBanner);
  const loadLogo = logo.load;
  const loadBanner = banner.load;

  useEffect(() => {
    if (!salonId) return;
    void getSupabase()
      .from("salons")
      .select("name, tagline, about, logo_path, banner_path, updated_at")
      .eq("id", salonId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setErrors({ form: "Couldn't load your brand. Go back and try again." });
          return;
        }
        setBrand({ name: data.name, tagline: data.tagline ?? "", about: data.about ?? "" });
        loadLogo(data.logo_path, data.updated_at);
        loadBanner(data.banner_path, data.updated_at);
      });
  }, [salonId, loadLogo, loadBanner]);

  async function save() {
    if (!salonId || !brand) return;
    const fieldErrors = validateBrand(brand);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setSaving(true);
    const { error } = await getSupabase()
      .from("salons")
      .update({
        name: brand.name.trim(),
        tagline: brand.tagline.trim() || null,
        about: brand.about.trim() || null,
      })
      .eq("id", salonId);
    setSaving(false);
    if (error) {
      setErrors({ form: "Couldn't save. Check your connection and try again." });
      return;
    }
    await reloadMembership();
    router.back();
  }

  const empty = brand && !logo.uri && !banner.uri && !brand.tagline && !brand.about;
  const imageError = logo.error ?? banner.error;

  return (
    <Screen
      footer={
        <Button title="Save brand" onPress={() => void save()} loading={saving} disabled={!brand} />
      }
    >
      <Header title="My brand" subtitle="How clients see your salon" />
      {empty ? (
        <Card>
          <Text style={type.heading}>Make it yours</Text>
          <Text style={[type.body, { color: colors.muted }]}>
            Add a logo, a banner photo and a few words about your salon. They show at the top of
            your booking page.
          </Text>
        </Card>
      ) : null}
      {brand ? (
        <>
          <ImageSlot
            label="Banner"
            shape="banner"
            uri={banner.uri}
            busy={banner.uploading}
            onPress={() => void banner.change()}
          />
          <View style={styles.logoRow}>
            <ImageSlot
              label="Logo"
              shape="square"
              uri={logo.uri}
              busy={logo.uploading}
              onPress={() => void logo.change()}
            />
            <Text style={[type.caption, styles.logoHint]}>
              Square works best. We resize photos before uploading.
            </Text>
          </View>
          <TextField
            label="Salon name"
            value={brand.name}
            onChangeText={(name) => setBrand({ ...brand, name })}
            error={errors.name}
            maxLength={80}
          />
          <TextField
            label="Tagline"
            placeholder="Braids, silk press and natural hair care"
            value={brand.tagline}
            onChangeText={(tagline) => setBrand({ ...brand, tagline })}
            error={errors.tagline}
            maxLength={80}
          />
          <TextField
            label="About"
            placeholder="Tell clients what makes your salon special."
            value={brand.about}
            onChangeText={(about) => setBrand({ ...brand, about })}
            error={errors.about}
            maxLength={600}
            multiline
            style={styles.multiline}
          />
        </>
      ) : null}
      {imageError ? <Text style={styles.formError}>{imageError}</Text> : null}
      {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoRow: { flexDirection: "row", alignItems: "center", gap: space(4) },
  logoHint: { flex: 1, color: colors.muted },
  multiline: { height: 120, paddingTop: space(3), textAlignVertical: "top" },
  formError: { ...type.caption, color: colors.danger },
});
