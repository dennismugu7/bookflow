import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { pickAndUploadImage, publicMediaUrl, removeImage } from "../../../lib/media";
import { useSession } from "../../../lib/session";
import { validateBrand, type BrandErrors, type MediaKind } from "../../../lib/setup";
import { getSupabase } from "../../../lib/supabase";
import { colors, space, type } from "../../../theme";
import { Button, Card, Header, ImageSlot, Screen, TextField } from "../../../ui";

type Brand = {
  name: string;
  tagline: string;
  about: string;
  logoPath: string | null;
  bannerPath: string | null;
};

export default function BrandScreen() {
  const { membership, reloadMembership } = useSession();
  const salonId = membership?.salon.id;
  const [brand, setBrand] = useState<Brand>();
  const [errors, setErrors] = useState<BrandErrors & { form?: string }>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<MediaKind>();

  useEffect(() => {
    if (!salonId) return;
    void getSupabase()
      .from("salons")
      .select("name, tagline, about, logo_path, banner_path")
      .eq("id", salonId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setErrors({ form: "Couldn't load your brand. Go back and try again." });
          return;
        }
        setBrand({
          name: data.name,
          tagline: data.tagline ?? "",
          about: data.about ?? "",
          logoPath: data.logo_path,
          bannerPath: data.banner_path,
        });
      });
  }, [salonId]);

  async function changeImage(kind: "logo" | "banner") {
    if (!salonId || !brand) return;
    setUploading(kind);
    setErrors({});
    try {
      const path = await pickAndUploadImage(salonId, kind);
      if (!path) return;
      const change = kind === "logo" ? { logo_path: path } : { banner_path: path };
      const { error } = await getSupabase().from("salons").update(change).eq("id", salonId);
      if (error) throw error;
      const old = kind === "logo" ? brand.logoPath : brand.bannerPath;
      setBrand(
        (b) => b && (kind === "logo" ? { ...b, logoPath: path } : { ...b, bannerPath: path }),
      );
      void removeImage(old);
    } catch {
      setErrors({ form: "Couldn't upload the photo. Check your connection and try again." });
    } finally {
      setUploading(undefined);
    }
  }

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

  const empty = brand && !brand.logoPath && !brand.bannerPath && !brand.tagline && !brand.about;

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
            uri={publicMediaUrl(brand.bannerPath)}
            busy={uploading === "banner"}
            onPress={() => void changeImage("banner")}
          />
          <View style={styles.logoRow}>
            <ImageSlot
              label="Logo"
              shape="square"
              uri={publicMediaUrl(brand.logoPath)}
              busy={uploading === "logo"}
              onPress={() => void changeImage("logo")}
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
