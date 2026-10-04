import { initialsFor } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useImageSlot } from "../../../lib/media";
import { useSession } from "../../../lib/session";
import { ABOUT_MAX, validateBrand, type BrandErrors, type BrandForm } from "../../../lib/setup";
import { getSupabase } from "../../../lib/supabase";
import { colors, fonts, type } from "../../../theme";
import { Page, SaveBar, TextField } from "../../../ui";

const sameBrand = (a: BrandForm, b: BrandForm) =>
  a.name.trim() === b.name.trim() &&
  a.tagline.trim() === b.tagline.trim() &&
  a.about.trim() === b.about.trim();

/** My brand: one screen with the banner, the overlapping logo and the brand fields (owner-v2 01). */
export default function BrandScreen() {
  const { membership, reloadMembership } = useSession();
  const salonId = membership?.salon.id;
  const [saved, setSaved] = useState<BrandForm>();
  const [brand, setBrand] = useState<BrandForm>();
  const [errors, setErrors] = useState<BrandErrors & { form?: string }>({});
  const [saving, setSaving] = useState(false);

  // Each image saves its path as soon as it has uploaded, independent of Save changes.
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
        const loaded = { name: data.name, tagline: data.tagline ?? "", about: data.about ?? "" };
        setSaved(loaded);
        setBrand(loaded);
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
    const next = {
      name: brand.name.trim(),
      tagline: brand.tagline.trim(),
      about: brand.about.trim(),
    };
    const { error } = await getSupabase()
      .from("salons")
      .update({ name: next.name, tagline: next.tagline || null, about: next.about || null })
      .eq("id", salonId);
    setSaving(false);
    if (error) {
      setErrors({ form: "Couldn't save. Check your connection and try again." });
      return;
    }
    setSaved(next);
    setBrand(next);
    await reloadMembership();
  }

  const changed = !!saved && !!brand && !sameBrand(saved, brand);
  const imageError = logo.error ?? banner.error;

  return (
    <Page
      title="My brand"
      padding={0}
      gap={0}
      footer={
        <SaveBar
          title="Save changes"
          onPress={() => void save()}
          disabled={!changed}
          loading={saving}
        />
      }
    >
      <View style={styles.banner}>
        {banner.uri ? (
          <Image
            source={{ uri: banner.uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityLabel="Banner"
          />
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change banner"
          onPress={() => void banner.change()}
          disabled={banner.uploading}
          style={({ pressed }) => [styles.bannerButton, pressed && styles.pressed]}
        >
          {banner.uploading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Feather name="camera" size={22} color={colors.white} />
          )}
        </Pressable>
      </View>

      <View style={styles.identity}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change logo"
          onPress={() => void logo.change()}
          disabled={logo.uploading}
          style={styles.logo}
        >
          <View style={styles.logoClip}>
            {logo.uri ? (
              <Image
                source={{ uri: logo.uri }}
                style={styles.logoImage}
                resizeMode="cover"
                accessibilityLabel="Logo"
              />
            ) : (
              <Text style={styles.logoInitial}>{initialsFor(saved?.name)[0]}</Text>
            )}
          </View>
          <View style={styles.logoBadge}>
            {logo.uploading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Feather name="camera" size={14} color={colors.white} />
            )}
          </View>
        </Pressable>
        <Text style={styles.hint}>
          Banner: wide photo of your salon.{"\n"}Logo: square works best.
        </Text>
      </View>

      {brand ? (
        <View style={styles.fields}>
          <TextField
            label="Business name"
            value={brand.name}
            onChangeText={(name) => setBrand({ ...brand, name })}
            error={errors.name}
            maxLength={80}
          />
          <TextField
            label="Tagline"
            placeholder="Your business, in a nutshell"
            value={brand.tagline}
            onChangeText={(tagline) => setBrand({ ...brand, tagline })}
            error={errors.tagline}
            maxLength={80}
          />
          <TextField
            label="About"
            placeholder="Tell your story"
            value={brand.about}
            onChangeText={(about) => setBrand({ ...brand, about })}
            error={errors.about}
            maxLength={ABOUT_MAX}
            counter
            multiline
          />
          {imageError || errors.form ? (
            <Text style={styles.formError}>{imageError ?? errors.form}</Text>
          ) : null}
        </View>
      ) : errors.form ? (
        <Text style={[styles.formError, styles.loadError]}>{errors.form}</Text>
      ) : null}
    </Page>
  );
}

const LOGO = 96;

const styles = StyleSheet.create({
  // Full width; the height follows the mockup (390 × 200).
  banner: { width: "100%", aspectRatio: 390 / 200, backgroundColor: "#D9D3CC" },
  bannerButton: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(22, 19, 31, 0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.8 },
  identity: { flexDirection: "row", paddingHorizontal: 20, marginTop: -44 },
  logo: {
    width: LOGO,
    height: LOGO,
    borderRadius: LOGO / 2,
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  logoClip: {
    flex: 1,
    borderRadius: LOGO / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: { width: LOGO, height: LOGO },
  logoInitial: { fontFamily: fonts.bold, fontSize: 40, color: colors.faint },
  logoBadge: {
    position: "absolute",
    right: 5,
    bottom: 5,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.ink,
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    flex: 1,
    marginLeft: 14,
    marginTop: 54,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtle,
  },
  fields: { padding: 20, paddingTop: 22, gap: 18 },
  formError: { ...type.caption, color: colors.danger },
  loadError: { padding: 20 },
});
