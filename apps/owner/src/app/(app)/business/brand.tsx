import { useCallback, useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { useImageSlot } from "../../../lib/media";
import { useSession } from "../../../lib/session";
import { validateBrand, type BrandErrors } from "../../../lib/setup";
import { getSupabase } from "../../../lib/supabase";
import { colors, fonts, space, type } from "../../../theme";
import {
  Button,
  CardScreen,
  CardSubtitle,
  CardTitle,
  Illustration,
  TextField,
  UploadBox,
} from "../../../ui";

type Brand = { name: string; tagline: string; about: string };

/** My brand: empty (44), view (45) and edit (46). */
export default function BrandScreen() {
  const { membership, reloadMembership } = useSession();
  const salonId = membership?.salon.id;
  const [saved, setSaved] = useState<Brand>();
  const [brand, setBrand] = useState<Brand>();
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<BrandErrors & { form?: string }>({});
  const [saving, setSaving] = useState(false);

  // Each image saves its path as soon as it has uploaded, independent of the tick.
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
    setEditing(false);
    await reloadMembership();
  }

  const empty = !!saved && !logo.uri && !banner.uri && !saved.tagline && !saved.about;
  const imageError = logo.error ?? banner.error;
  const errorText =
    imageError || errors.form ? (
      <Text style={styles.formError}>{imageError ?? errors.form}</Text>
    ) : null;

  if (editing && brand) {
    return (
      <CardScreen
        left={{
          icon: "arrow-left",
          label: "Cancel editing",
          onPress: () => {
            setBrand(saved);
            setErrors({});
            setEditing(false);
          },
        }}
        right={{
          icon: "check",
          label: saving ? "Saving" : "Save brand",
          onPress: () => {
            if (!saving && !logo.uploading && !banner.uploading) void save();
          },
        }}
      >
        <Heading />
        <View style={styles.fields}>
          <TextField
            variant="card"
            label="Business name"
            value={brand.name}
            onChangeText={(name) => setBrand({ ...brand, name })}
            error={errors.name}
            maxLength={80}
          />
          <TextField
            variant="card"
            label="Business Tagline"
            placeholder="Your business, in a nutshell"
            value={brand.tagline}
            onChangeText={(tagline) => setBrand({ ...brand, tagline })}
            error={errors.tagline}
            maxLength={80}
          />
          <TextField
            variant="card"
            label="About"
            placeholder="Tell your story"
            value={brand.about}
            onChangeText={(about) => setBrand({ ...brand, about })}
            error={errors.about}
            maxLength={600}
            multiline
            style={styles.multiline}
          />
        </View>
        <View style={styles.images}>
          <View style={styles.imageCol}>
            <Text style={styles.imageLabel}>Business banner</Text>
            <UploadBox
              label="Banner"
              uri={banner.uri}
              busy={banner.uploading}
              onPress={() => void banner.change()}
            />
          </View>
          <View style={styles.imageCol}>
            <Text style={styles.imageLabel}>Logo</Text>
            <UploadBox
              label="Logo"
              uri={logo.uri}
              busy={logo.uploading}
              onPress={() => void logo.change()}
            />
          </View>
        </View>
        {saving ? <Text style={styles.muted}>Saving…</Text> : null}
        {errorText}
      </CardScreen>
    );
  }

  if (empty) {
    return (
      <CardScreen>
        <Heading />
        <Illustration name="planets" style={styles.art} />
        <Text style={styles.emptyTitle}>No brand added</Text>
        <Text style={styles.emptyBody}>Add your brand here to make a great first impression!</Text>
        <View style={styles.cta}>
          <Button
            title="Brand my business"
            variant="blue"
            compact
            onPress={() => setEditing(true)}
          />
        </View>
        {errorText}
      </CardScreen>
    );
  }

  return (
    <CardScreen
      right={
        saved ? { icon: "edit-2", label: "Edit brand", onPress: () => setEditing(true) } : undefined
      }
    >
      <Heading />
      {saved ? (
        <>
          {banner.uri ? (
            <Image
              source={{ uri: banner.uri }}
              style={styles.banner}
              resizeMode="cover"
              accessibilityLabel="Banner"
            />
          ) : null}
          <View style={styles.identity}>
            <View style={styles.identityText}>
              <Text style={styles.name}>{saved.name}</Text>
              {saved.tagline ? <Text style={styles.tagline}>{saved.tagline}</Text> : null}
            </View>
            {logo.uri ? (
              <Image
                source={{ uri: logo.uri }}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel="Logo"
              />
            ) : null}
          </View>
        </>
      ) : null}
      {errorText}
    </CardScreen>
  );
}

function Heading() {
  return (
    <View style={styles.heading}>
      <CardTitle>My brand</CardTitle>
      <CardSubtitle>This is what your clients will see first when they book with you.</CardSubtitle>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { gap: space(4), marginBottom: space(4) },
  fields: { gap: space(3), paddingRight: space(8) },
  multiline: { minHeight: 46, maxHeight: 140, paddingTop: 12, textAlignVertical: "top" },
  images: { flexDirection: "row", gap: space(10), marginTop: space(4) },
  imageCol: { width: 116, gap: space(3) },
  imageLabel: { fontFamily: fonts.bold, fontSize: 15, color: "#3A3A3A" },
  art: { marginTop: space(4) },
  emptyTitle: {
    fontFamily: fonts.regular,
    fontSize: 20,
    color: "#000000",
    textAlign: "center",
    marginTop: space(6),
  },
  emptyBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    textAlign: "center",
    paddingHorizontal: space(4),
  },
  cta: { marginTop: space(8), marginHorizontal: space(3) },
  banner: { width: "100%", aspectRatio: 281 / 143, borderRadius: 9, marginTop: space(4) },
  identity: { flexDirection: "row", alignItems: "center", gap: space(3), marginTop: space(10) },
  identityText: { flex: 1, gap: space(1), paddingLeft: space(2) },
  name: { fontFamily: fonts.semibold, fontSize: 21, color: "#1A1A1A" },
  tagline: { fontFamily: fonts.regular, fontStyle: "italic", fontSize: 16, color: "#1A1A1A" },
  logo: { width: 52, height: 68 },
  muted: { ...type.caption, color: colors.muted },
  formError: { ...type.caption, color: colors.danger },
});
