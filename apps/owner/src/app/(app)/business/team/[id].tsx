import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { pickAndUploadImage, publicMediaUrl, removeImage } from "../../../../lib/media";
import { useSession } from "../../../../lib/session";
import { diffIds, validateStaff, type StaffErrors, type StaffForm } from "../../../../lib/setup";
import { getSupabase } from "../../../../lib/supabase";
import { colors, fonts, minTouch, space, type } from "../../../../theme";
import { Button, Card, Chip, Header, ImageSlot, Screen, TextField } from "../../../../ui";

type ServiceOption = { id: string; name: string };

export default function TeamMemberScreen() {
  const params = useLocalSearchParams<{ id: string; me?: string }>();
  const isNew = params.id === "new";
  const isMe = isNew && params.me === "1";
  const { session, membership, reloadMembership } = useSession();
  const salonId = membership?.salon.id;

  const [form, setForm] = useState<StaffForm>({ name: "", title: "", about: "", serviceIds: [] });
  const [savedServiceIds, setSavedServiceIds] = useState<string[]>([]);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [services, setServices] = useState<ServiceOption[]>();
  const [loaded, setLoaded] = useState(isNew);
  const [errors, setErrors] = useState<StaffErrors & { form?: string }>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!salonId) return;
    void getSupabase()
      .from("services")
      .select("id, name")
      .eq("salon_id", salonId)
      .order("created_at")
      .then(({ data }) => setServices(data ?? []));
    if (isNew) return;
    void getSupabase()
      .from("staff")
      .select("display_name, title, bio, photo_path, is_active, staff_services(service_id)")
      .eq("id", params.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setErrors({ form: "Couldn't load this team member." });
          return;
        }
        const ids = data.staff_services.map((s) => s.service_id);
        setForm({
          name: data.display_name,
          title: data.title ?? "",
          about: data.bio ?? "",
          serviceIds: ids,
        });
        setSavedServiceIds(ids);
        setPhotoPath(data.photo_path);
        setIsActive(data.is_active);
        setLoaded(true);
      });
  }, [salonId, isNew, params.id]);

  async function changePhoto() {
    if (!salonId) return;
    setUploading(true);
    try {
      const path = await pickAndUploadImage(salonId, "staff");
      if (!path) return;
      // Existing members save the photo straight away; new ones save it with the form.
      if (!isNew) {
        const { error } = await getSupabase()
          .from("staff")
          .update({ photo_path: path })
          .eq("id", params.id);
        if (error) throw error;
        void removeImage(photoPath);
      }
      setPhotoPath(path);
    } catch {
      setErrors({ form: "Couldn't upload the photo. Check your connection and try again." });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!salonId) return;
    const fieldErrors = validateStaff(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setSaving(true);
    const supabase = getSupabase();
    const row = {
      display_name: form.name.trim(),
      title: form.title.trim() || null,
      bio: form.about.trim() || null,
      photo_path: photoPath,
    };
    try {
      let staffId = params.id;
      if (isNew) {
        const { data, error } = await supabase
          .from("staff")
          .insert({ ...row, salon_id: salonId })
          .select("id")
          .single();
        if (error || !data) throw error;
        staffId = data.id;
      } else {
        const { error } = await supabase.from("staff").update(row).eq("id", staffId);
        if (error) throw error;
      }

      const { add, remove } = diffIds(isNew ? [] : savedServiceIds, form.serviceIds);
      if (remove.length > 0) {
        const { error } = await supabase
          .from("staff_services")
          .delete()
          .eq("staff_id", staffId)
          .in("service_id", remove);
        if (error) throw error;
      }
      if (add.length > 0) {
        const { error } = await supabase
          .from("staff_services")
          .insert(
            add.map((serviceId) => ({
              salon_id: salonId,
              staff_id: staffId,
              service_id: serviceId,
            })),
          );
        if (error) throw error;
      }

      if (isMe && session) {
        const { error } = await supabase
          .from("salon_members")
          .update({ staff_id: staffId })
          .eq("salon_id", salonId)
          .eq("user_id", session.user.id);
        if (error) throw error;
        await reloadMembership();
      }
      router.back();
    } catch {
      setErrors({ form: "Couldn't save. Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  }

  function toggleActive() {
    const next = !isActive;
    const run = () =>
      void getSupabase()
        .from("staff")
        .update({ is_active: next })
        .eq("id", params.id)
        .then(({ error }) => {
          if (error) setErrors({ form: "Couldn't update. Try again." });
          else setIsActive(next);
        });
    if (!next) {
      Alert.alert(
        "Deactivate this team member?",
        "Clients won't be able to book them. Their past bookings stay.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Deactivate", style: "destructive", onPress: run },
        ],
      );
    } else {
      run();
    }
  }

  const toggleService = (id: string) =>
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id)
        ? f.serviceIds.filter((s) => s !== id)
        : [...f.serviceIds, id],
    }));

  return (
    <Screen
      footer={
        <Button title="Save" onPress={() => void save()} loading={saving} disabled={!loaded} />
      }
    >
      <Header title={isMe ? "Add yourself" : isNew ? "Add a team member" : "Edit team member"} />
      {loaded ? (
        <>
          <View style={styles.top}>
            <ImageSlot
              label="Photo"
              shape="circle"
              uri={publicMediaUrl(photoPath)}
              busy={uploading}
              onPress={() => void changePhoto()}
            />
            <View style={styles.name}>
              <TextField
                label="Name"
                placeholder={isMe ? "Your name" : "Njeri Kamau"}
                value={form.name}
                onChangeText={(name) => setForm({ ...form, name })}
                error={errors.name}
                maxLength={60}
                autoCapitalize="words"
              />
            </View>
          </View>
          <TextField
            label="Title"
            placeholder="Stylist"
            value={form.title}
            onChangeText={(title) => setForm({ ...form, title })}
            error={errors.title}
            maxLength={40}
          />
          <TextField
            label="About"
            placeholder="Specialities, experience, what clients love."
            value={form.about}
            onChangeText={(about) => setForm({ ...form, about })}
            error={errors.about}
            maxLength={300}
            multiline
            style={styles.multiline}
          />

          <View style={styles.group}>
            <Text style={styles.label}>Services offered · {form.serviceIds.length} selected</Text>
            {services?.length === 0 ? (
              <Card>
                <Text style={[type.body, { color: colors.muted }]}>
                  Add your services first, then pick them here.
                </Text>
                <Button
                  title="Go to My services"
                  variant="secondary"
                  onPress={() => router.push("/business/services")}
                />
              </Card>
            ) : (
              <View style={styles.chips}>
                {services?.map((s) => (
                  <Chip
                    key={s.id}
                    label={s.name}
                    selected={form.serviceIds.includes(s.id)}
                    onPress={() => toggleService(s.id)}
                  />
                ))}
              </View>
            )}
            {errors.services ? <Text style={styles.error}>{errors.services}</Text> : null}
          </View>

          {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}

          {!isNew ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isActive ? "Deactivate team member" : "Reactivate team member"}
              onPress={toggleActive}
              style={styles.link}
            >
              <Text style={[styles.linkText, { color: isActive ? colors.danger : colors.brand }]}>
                {isActive ? "Deactivate" : "Reactivate"}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : errors.form ? (
        <Text style={styles.error}>{errors.form}</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "flex-end", gap: space(4) },
  name: { flex: 1 },
  multiline: { height: 96, paddingTop: space(3), textAlignVertical: "top" },
  group: { gap: space(2) },
  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  error: { ...type.caption, color: colors.danger },
  link: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start" },
  linkText: { fontFamily: fonts.bold, fontSize: 15 },
});
