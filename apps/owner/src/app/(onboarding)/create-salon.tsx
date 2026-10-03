import { WEB_BASE_URL } from "@bookflow/shared";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  cleanSlugInput,
  createSalonErrorMessage,
  suggestSlug,
  validateSalonForm,
} from "../../lib/salon-errors";
import { useSession } from "../../lib/session";
import { getSupabase } from "../../lib/supabase";
import { colors, fonts, minTouch, space, type } from "../../theme";
import { Button, Card, Screen, TextField } from "../../ui";

const LINK_PREFIX = `${WEB_BASE_URL.replace(/^https:\/\//, "")}/s/`;

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
    <Screen footer={<Button title="Create salon" onPress={() => void create()} loading={saving} />}>
      <View style={styles.heading}>
        <Text style={type.display}>Create your salon</Text>
        <Text style={[type.body, { color: colors.muted }]}>
          Clients book through your link. You can change the details later.
        </Text>
      </View>

      <TextField
        label="Salon name"
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
        label="Booking link"
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

      <Card accessibilityLabel={`Your booking link: ${LINK_PREFIX}${slug}`}>
        <Text style={[type.caption, { color: colors.muted }]}>Your booking link</Text>
        <Text style={styles.link}>
          {LINK_PREFIX}
          <Text style={styles.slug}>{slug || "your-salon"}</Text>
        </Text>
      </Card>

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: space(2), marginTop: space(6) },
  link: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  slug: { fontFamily: fonts.bold, color: colors.brand },
  formError: { ...type.caption, color: colors.danger },
  logout: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start" },
  logoutText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
});
