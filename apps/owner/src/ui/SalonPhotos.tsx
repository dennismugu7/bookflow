import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { canAddPhoto, photoCount, type PhotoItem } from "../lib/photos";
import { colors, fonts } from "../theme";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";

type Props = {
  photos: PhotoItem[];
  /** The picked file while uploading, then the stored copy. */
  uriFor: (photo: PhotoItem) => string | undefined;
  adding: boolean;
  onAdd: () => void;
  onMakeBanner: (key: string) => void;
  onRemove: (key: string) => void;
};

const COLUMNS = 3;
const GAP = 10;
const SIDE = 20;

/** Salon photos on My brand (owner-v6 01): count, hint, a 3-column grid and the photo sheet. */
export function SalonPhotos({ photos, uriFor, adding, onAdd, onMakeBanner, onRemove }: Props) {
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<string>();
  // 110 × 104 tiles at 390 pt wide, as in the mockup.
  const tileWidth = (width - SIDE * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const tile = { width: tileWidth, height: (tileWidth * 104) / 110 };
  const selectedIndex = photos.findIndex((p) => p.key === selected);
  const close = () => setSelected(undefined);

  return (
    <View style={styles.section}>
      <View style={styles.headRow}>
        <Text style={styles.title} accessibilityRole="header">
          Salon photos
        </Text>
        <Text style={styles.count}>{photoCount(photos)}</Text>
      </View>
      <Text style={styles.hint}>
        Clients swipe through these at the top of your page. The first one is your banner and shows
        in shared links.
      </Text>

      <View style={styles.grid}>
        {photos.map((photo, i) => {
          const uri = uriFor(photo);
          return (
            <Pressable
              key={photo.key}
              accessibilityRole="button"
              accessibilityLabel={i === 0 ? `Photo 1, banner` : `Photo ${i + 1}`}
              disabled={!photo.path}
              onPress={() => setSelected(photo.key)}
              style={({ pressed }) => [styles.tile, tile, pressed && styles.pressed]}
            >
              {uri ? (
                <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : null}
              {!photo.path ? (
                <View style={styles.uploading} accessibilityLabel="Uploading">
                  <ActivityIndicator color={colors.white} />
                </View>
              ) : null}
              {i === 0 ? (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Banner</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
        {canAddPhoto(photos) ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add photo"
            disabled={adding}
            onPress={onAdd}
            style={({ pressed }) => [styles.add, tile, pressed && styles.pressed]}
          >
            <Feather name="plus" size={22} color={colors.action} />
            <Text style={styles.addText}>Add photo</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.tapHint}>Tap a photo to make it the banner or remove it.</Text>

      <BottomSheet visible={selectedIndex >= 0} onClose={close} variant="handle">
        <View style={styles.sheet}>
          {selectedIndex > 0 ? (
            <Button
              title="Make banner"
              variant="secondary"
              onPress={() => {
                onMakeBanner(selected!);
                close();
              }}
            />
          ) : null}
          <Button
            title="Remove"
            variant="danger"
            onPress={() => {
              onRemove(selected!);
              close();
            }}
          />
          <Button title="Cancel" variant="secondary" onPress={close} />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: SIDE, paddingTop: 19 },
  headRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  title: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink },
  count: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.subtle },
  hint: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 15,
    color: colors.subtle,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP, marginTop: 11 },
  tile: { borderRadius: 10, overflow: "hidden", backgroundColor: "#D9D3CC" },
  uploading: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(22, 19, 31, 0.25)",
  },
  tag: {
    position: "absolute",
    left: 6,
    bottom: 6,
    paddingHorizontal: 7,
    height: 19,
    borderRadius: 10,
    justifyContent: "center",
    backgroundColor: "rgba(22, 19, 31, 0.8)",
  },
  tagText: { fontFamily: fonts.bold, fontSize: 10, color: colors.white },
  add: {
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { fontFamily: fonts.medium, fontSize: 14, color: colors.action, marginTop: 1 },
  tapHint: {
    marginTop: 14,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.subtle,
  },
  pressed: { opacity: 0.8 },
  sheet: { gap: 10 },
});
