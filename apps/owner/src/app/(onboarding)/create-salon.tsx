import { WEB_BASE_URL } from "@bookflow/shared";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import {
  cleanSlugInput,
  createSalonErrorMessage,
  suggestSlug,
  validateSalonForm,
} from "../../lib/salon-errors";
import { useSession } from "../../lib/session";
import { getSupabase } from "../../lib/supabase";
import { colors, fonts, minTouch, type } from "../../theme";
import { AuthSheet, Button, SheetText, TextField } from "../../ui";

const LINK_PREFIX = `${WEB_BASE_URL.replace(/^https:\/\//, "")}/s/`;

/** No design of its own: the sign-in sheet's style (03/05), per the screen map. */
export default function CreateSalonScreen() {
  const { session, reloadMembership, signOut } = useSession();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  // The link follows the name until the owner edits it.
  const [slugEdited, setSlugEdited] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; slug?: string; form?: string }>({});
  const [saving, setSaving] = useState(false);

  async function create() {
    const fieldErrors = validateSalonForm(name, slug);
    setErrors(fieldErrors);
    if (fieldErrors.name || fieldErrors.slug) return;

    setSaving(true);
    const { error } = await getSupabase().rpc("create_salon", {
      p_name: name.trim(),
      p_slug: slug,
    });
    if (error) {
      setSaving(false);
      const mapped = createSalonErrorMessage(error);
      setErrors({ [mapped.field]: mapped.message });
      return;
    }
    // The root layout moves to the tabs once the membership is loaded.
    await reloadMembership();
    setSaving(false);
  }

  return (
    <AuthSheet
      title="Create your salon"
      footer={
        <Button
          title="Create salon"
          variant="blue"
          onPress={() => void create()}
          loading={saving}
        />
      }
    >
      <SheetText>Clients book through your link. You can change the details later.</SheetText>

      <TextField
        variant="sheet"
        label="Salon name:"
        placeholder="Salome Salon"
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (!slugEdited) setSlug(suggestSlug(text));
          setErrors({});
        }}
        error={errors.name}
        autoCapitalize="words"
        maxLength={80}
        returnKeyType="next"
      />

      <TextField
        variant="sheet"
        label="Booking link:"
        placeholder="salome-salon"
        value={slug}
        onChangeText={(text) => {
          setSlug(cleanSlugInput(text));
          setSlugEdited(true);
          setErrors({});
        }}
        error={errors.slug}
        hint="Letters, numbers and hyphens."
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={40}
      />

      <Text style={styles.link} accessibilityLabel={`Your booking link: ${LINK_PREFIX}${slug}`}>
        {LINK_PREFIX}
        <Text style={styles.slug}>{slug || "your-salon"}</Text>
      </Text>

      {errors.form ? (
        <Text style={styles.formError} accessibilityLiveRegion="polite">
          {errors.form}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log out"
        onPress={() => void signOut()}
        style={styles.logout}
      >
        <Text style={styles.logoutText}>Not {session?.user.email}? Log out</Text>
      </Pressable>
    </AuthSheet>
  );
}

const styles = StyleSheet.create({
  link: { fontFamily: fonts.medium, fontSize: 14, color: colors.text, textAlign: "center" },
  slug: { fontFamily: fonts.bold, color: colors.blue },
  formError: { ...type.caption, color: colors.danger },
  logout: { minHeight: minTouch, justifyContent: "center", alignSelf: "center" },
  logoutText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
});
