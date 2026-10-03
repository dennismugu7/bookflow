import { mediaUrl } from "@bookflow/shared";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { Image } from "react-native";

import { getEnv } from "../env";
import { imageSource, withVersion, type ImageSlotState } from "./image-source";
import { mediaPath, resizeFor, type MediaKind } from "./setup";
import { getSupabase } from "./supabase";

const BUCKET = "salon-media";

/** Public URL for a stored media path, or undefined when there is none. */
export function publicMediaUrl(
  path: string | null | undefined,
  version?: string | number,
): string | undefined {
  return path ? withVersion(mediaUrl(getEnv().EXPO_PUBLIC_SUPABASE_URL, path), version) : undefined;
}

/** UUID v4 shape for file names. Uniqueness is all that matters here, not unpredictability. */
function randomId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Lets the owner pick a photo and shrinks it (logo and staff 512 px, banner 1600 px wide,
 * JPEG 0.8). Returns the local file URI, or null if the owner cancels.
 */
export async function pickImage(kind: MediaKind): Promise<string | null> {
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
  return saved.uri;
}

/** Uploads a local JPEG to `<salon_id>/<kind>/<uuid>.jpg` and returns the stored path. */
export async function uploadImage(
  salonId: string,
  kind: MediaKind,
  localUri: string,
): Promise<string> {
  const body = await (await fetch(localUri)).arrayBuffer();
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

const toUrl = (path: string) => mediaUrl(getEnv().EXPO_PUBLIC_SUPABASE_URL, path);

/**
 * One image slot: shows the picked file at once, uploads it, saves the path through `persist`,
 * and only switches to the remote copy once it has actually downloaded. On failure the previous
 * image stays and `error` is set.
 */
export function useImageSlot(
  salonId: string | undefined,
  kind: MediaKind,
  persist: (path: string) => Promise<void>,
) {
  const [state, setState] = useState<ImageSlotState>({ path: null, remoteReady: true });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  /** Sets the saved image when the screen loads its data. */
  const load = useCallback((path: string | null, version?: string) => {
    setState({ path, remoteReady: true, version });
  }, []);

  const change = useCallback(async () => {
    if (!salonId) return;
    setError(undefined);
    let localUri: string | null;
    try {
      localUri = await pickImage(kind);
    } catch {
      setError("Couldn't open that photo. Try another one.");
      return;
    }
    if (!localUri) return;

    const previous = state;
    setState({ ...previous, localUri, remoteReady: false });
    setUploading(true);
    try {
      const path = await uploadImage(salonId, kind, localUri);
      await persist(path);
      const version = Date.now();
      setState({ path, localUri, remoteReady: false, version });
      void removeImage(previous.path);
      // Keep the local file on screen until the remote copy is downloadable, then switch.
      const remote = withVersion(toUrl(path), version);
      void Image.prefetch(remote)
        .then((ok) => {
          if (ok) setState((s) => (s.path === path ? { ...s, remoteReady: true } : s));
        })
        .catch(() => undefined);
    } catch {
      setState(previous);
      setError("Couldn't upload the photo. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }, [salonId, kind, persist, state]);

  return {
    path: state.path,
    uri: imageSource(state, toUrl),
    uploading,
    error,
    load,
    change,
  };
}
