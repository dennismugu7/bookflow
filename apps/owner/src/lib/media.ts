import { mediaUrl } from "@bookflow/shared";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { getEnv } from "../env";
import { mediaPath, resizeFor, type MediaKind } from "./setup";
import { getSupabase } from "./supabase";

const BUCKET = "salon-media";

/** Public URL for a stored media path, or undefined when there is none. */
export function publicMediaUrl(path: string | null | undefined): string | undefined {
  return path ? mediaUrl(getEnv().EXPO_PUBLIC_SUPABASE_URL, path) : undefined;
}

/** UUID v4 shape for file names. Uniqueness is all that matters here, not unpredictability. */
function randomId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Lets the owner pick a photo, shrinks it (logo and staff 512 px, banner 1600 px wide, JPEG 0.8),
 * uploads it to `<salon_id>/<kind>/<uuid>.jpg` and returns the stored path.
 * Returns null if the owner cancels.
 */
export async function pickAndUploadImage(salonId: string, kind: MediaKind): Promise<string | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: kind !== "banner",
    aspect: kind === "banner" ? undefined : [1, 1],
    quality: 1,
  });
  if (picked.canceled || !picked.assets[0]) return null;
  const asset = picked.assets[0];

  const context = ImageManipulator.manipulate(asset.uri);
  const resize = resizeFor(kind, asset.width, asset.height);
  if (resize) context.resize(resize);
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });

  const body = await (await fetch(saved.uri)).arrayBuffer();
  const path = mediaPath(salonId, kind, randomId());
  const { error } = await getSupabase().storage.from(BUCKET).upload(path, body, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/** Best-effort clean-up of a replaced image; a leftover file is harmless. */
export async function removeImage(path: string | null | undefined): Promise<void> {
  if (!path) return;
  await getSupabase().storage.from(BUCKET).remove([path]);
}
