import { initialsFor } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ScrollView,
} from "react-native";

import {
  pickImage,
  publicMediaUrl,
  removeImage,
  uploadImage,
  useImageSlot,
} from "../../../lib/media";
import {
  makeBanner,
  photoPaths,
  removePhoto,
  samePaths,
  unusedPaths,
  type PhotoItem,
} from "../../../lib/photos";
import { useSession } from "../../../lib/session";
import { ABOUT_MAX, validateBrand, type BrandErrors, type BrandForm } from "../../../lib/setup";
import { getSupabase } from "../../../lib/supabase";
import { colors, fonts, type } from "../../../theme";
import { Page, SaveBar, TextField } from "../../../ui";
import { SalonPhotos } from "../../../ui/SalonPhotos";
import { showToast } from "../../../lib/toast";

const sameBrand = (a: BrandForm, b: BrandForm) =>
  a.name.trim() === b.name.trim() &&
  a.tagline.trim() === b.tagline.trim() &&
  a.about.trim() === b.about.trim();

let photoKey = 0;
const nextKey = () => `photo-${++photoKey}`;

/** The picked file while it is on this phone, else the stored copy (paths never change). */
const photoUri = (photo: PhotoItem) => photo.localUri ?? publicMediaUrl(photo.path);

/**
 * My brand: the first salon photo as the banner, the overlapping logo, Salon photos and the
 * brand fields (owner-v6 01). The logo saves at once; photos and fields save with Save changes.
 */
export default function BrandScreen() {
  const { membership, reloadMembership } = useSession();
  const salonId = membership?.salon.id;
  const [saved, setSaved] = useState<BrandForm>();
  const [brand, setBrand] = useState<BrandForm>();
  const [errors, setErrors] = useState<BrandErrors & { form?: string }>({});
  const [saving, setSaving] = useState(false);

  // The logo saves its path as soon as it has uploaded, independent of Save changes.
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
  const logo = useImageSlot(salonId, "logo", saveLogo);
  const loadLogo = logo.load;

  // Salon photos: the saved order, the edited list, and files uploaded since the last save.
  const [savedPaths, setSavedPaths] = useState<string[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const uploaded = useRef(new Set<string>());
  const [adding, setAdding] = useState(false);
  const [photoError, setPhotoError] = useState<string>();
  const scroll = useRef<ScrollView>(null);
  const photosY = useRef(0);

  useEffect(() => {
    if (!salonId) return;
    const supabase = getSupabase();
    void Promise.all([
      supabase
        .from("salons")
        .select("name, tagline, about, logo_path, updated_at")
        .eq("id", salonId)
        .single(),
      supabase.from("salon_photos").select("path").eq("salon_id", salonId).order("position"),
    ]).then(([salon, stored]) => {
      if (salon.error || !salon.data || stored.error) {
        setErrors({ form: "Couldn't load your brand. Go back and try again." });
        return;
      }
      const { data } = salon;
      const loaded = { name: data.name, tagline: data.tagline ?? "", about: data.about ?? "" };
      setSaved(loaded);
      setBrand(loaded);
      loadLogo(data.logo_path, data.updated_at);
      const paths = stored.data.map((p) => p.path);
      setSavedPaths(paths);
      setPhotos(paths.map((path) => ({ key: nextKey(), path })));
    });
  }, [salonId, loadLogo]);

  /** Picks, resizes (1600 px wide) and uploads under `<salon_id>/banner/`, as the banner did. */
  async function addPhoto() {
    if (!salonId) return;
    setPhotoError(undefined);
    let localUri: string | null;
    try {
      localUri = await pickImage("banner");
    } catch {
      setPhotoError("Couldn't open that photo. Try another one.");
      return;
    }
    if (!localUri) return;
    const key = nextKey();
    setPhotos((list) => [...list, { key, localUri }]);
    setAdding(true);
    try {
      const path = await uploadImage(salonId, "banner", localUri);
      uploaded.current.add(path);
      setPhotos((list) => list.map((p) => (p.key === key ? { ...p, path } : p)));
    } catch {
      setPhotos((list) => removePhoto(list, key));
      setPhotoError("Couldn't upload the photo. Check your connection and try again.");
    } finally {
      setAdding(false);
    }
  }

  const paths = photoPaths(photos);
  const fieldsChanged = !!saved && !!brand && !sameBrand(saved, brand);
  const photosChanged = !paths || !samePaths(paths, savedPaths);
  const changed = fieldsChanged || photosChanged;

  async function save() {
    if (!salonId || !brand || !paths) return;
    const fieldErrors = validateBrand(brand);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setSaving(true);
    const supabase = getSupabase();
    if (fieldsChanged) {
      const next = {
        name: brand.name.trim(),
        tagline: brand.tagline.trim(),
        about: brand.about.trim(),
      };
      const { error } = await supabase
        .from("salons")
        .update({ name: next.name, tagline: next.tagline || null, about: next.about || null })
        .eq("id", salonId);
      if (error) {
        setSaving(false);
        setErrors({ form: "Couldn't save. Check your connection and try again." });
        return;
      }
      setSaved(next);
      setBrand(next);
    }
    if (photosChanged) {
      const { error } = await supabase.rpc("set_salon_photos", {
        p_salon_id: salonId,
        p_paths: paths,
      });
      if (error) {
        setSaving(false);
        setErrors({ form: "Couldn't save your photos. Check your connection and try again." });
        return;
      }
      // As for a replaced banner before: delete the files nothing uses any more.
      for (const path of unusedPaths([...savedPaths, ...uploaded.current], paths)) {
        void removeImage(path);
      }
      uploaded.current.clear();
      setSavedPaths(paths);
    }
    setSaving(false);
    showToast();
    await reloadMembership();
  }

  // Leaving with unsaved changes asks first; discarding also deletes the unsaved uploads.
  const navigation = useNavigation();
  const unsaved = useRef(false);
  useEffect(() => {
    unsaved.current = changed && !saving;
  }, [changed, saving]);
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (e) => {
        if (!unsaved.current) return;
        e.preventDefault();
        Alert.alert("Discard changes?", "You have changes you haven't saved.", [
          { text: "Keep editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              for (const path of uploaded.current) void removeImage(path);
              uploaded.current.clear();
              unsaved.current = false;
              navigation.dispatch(e.data.action);
            },
          },
        ]);
      }),
    [navigation],
  );

  const bannerUri = photos[0] ? photoUri(photos[0]) : undefined;
  const imageError = logo.error ?? photoError;

  return (
    <Page
      title="My brand"
      padding={0}
      gap={0}
      scrollRef={scroll}
      footer={
        <SaveBar
          title="Save changes"
          onPress={() => void save()}
          disabled={!changed || !paths}
          loading={saving}
        />
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Banner. Go to Salon photos"
        onPress={() => scroll.current?.scrollTo({ y: photosY.current, animated: true })}
        style={styles.banner}
      >
        {bannerUri ? (
          <Image source={{ uri: bannerUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
        {photos.length > 0 ? (
          <View style={styles.counter}>
            <Text style={styles.counterText}>1/{photos.length}</Text>
          </View>
        ) : null}
      </Pressable>

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
        <Text style={styles.hint}>Logo: square works best.</Text>
      </View>

      <View onLayout={(e) => (photosY.current = e.nativeEvent.layout.y)}>
        <SalonPhotos
          photos={photos}
          uriFor={photoUri}
          adding={adding}
          onAdd={() => void addPhoto()}
          onMakeBanner={(key) => setPhotos((list) => makeBanner(list, key))}
          onRemove={(key) => setPhotos((list) => removePhoto(list, key))}
        />
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
  // Full width; the height follows the mockup (390 × 170).
  banner: { width: "100%", aspectRatio: 390 / 170, backgroundColor: "#D9D3CC" },
  counter: {
    position: "absolute",
    right: 14,
    bottom: 12,
    height: 22,
    paddingHorizontal: 10,
    borderRadius: 11,
    justifyContent: "center",
    backgroundColor: "rgba(22, 19, 31, 0.75)",
  },
  counterText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.white },
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
    marginTop: 69,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtle,
  },
  fields: { padding: 20, paddingTop: 15, gap: 18 },
  formError: { ...type.caption, color: colors.danger },
  loadError: { padding: 20 },
});
