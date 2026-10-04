import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useImageSlot } from "../../../../lib/media";
import { useSession } from "../../../../lib/session";
import { diffIds, validateStaff, type StaffErrors, type StaffForm } from "../../../../lib/setup";
import { getSupabase } from "../../../../lib/supabase";
import { colors, fonts, minTouch, type } from "../../../../theme";
import { Button, Chip, Page, SaveBar, TextField, UploadBox } from "../../../../ui";

type ServiceOption = { id: string; name: string };

const EMPTY: StaffForm = { name: "", title: "", about: "", serviceIds: [] };

const sameStaff = (a: StaffForm, b: StaffForm) =>
  a.name.trim() === b.name.trim() &&
  a.title.trim() === b.title.trim() &&
  a.about.trim() === b.about.trim() &&
  [...a.serviceIds].sort().join() === [...b.serviceIds].sort().join();

/** Add or edit a team member (51), with the owner-v2 TopBar, Fields and Save bar. */
export default function TeamMemberScreen() {
  const params = useLocalSearchParams<{ id: string; me?: string }>();
  const isNew = params.id === "new";
  const isMe = isNew && params.me === "1";
  const { session, membership, reloadMembership } = useSession();
  const salonId = membership?.salon.id;

  const [form, setForm] = useState<StaffForm>(EMPTY);
  const [initial, setInitial] = useState<StaffForm>(EMPTY);
  const [savedServiceIds, setSavedServiceIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [services, setServices] = useState<ServiceOption[]>();
  const [picking, setPicking] = useState(false);
  const [loaded, setLoaded] = useState(isNew);
  const [errors, setErrors] = useState<StaffErrors & { form?: string }>({});
  const [saving, setSaving] = useState(false);

  // Existing members save a new photo straight away; new ones save it with the form.
  const savePhoto = useCallback(
    async (path: string) => {
      if (isNew) return;
      const { error } = await getSupabase()
        .from("staff")
        .update({ photo_path: path })
        .eq("id", params.id);
      if (error) throw error;
    },
    [isNew, params.id],
  );
  const photo = useImageSlot(salonId, "staff", savePhoto);
  const loadPhoto = photo.load;

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
      .select(
        "display_name, title, bio, photo_path, is_active, updated_at, staff_services(service_id)",
      )
      .eq("id", params.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setErrors({ form: "Couldn't load this team member." });
          return;
        }
        const ids = data.staff_services.map((s) => s.service_id);
        const loaded = {
          name: data.display_name,
          title: data.title ?? "",
          about: data.bio ?? "",
          serviceIds: ids,
        };
        setForm(loaded);
        setInitial(loaded);
        setSavedServiceIds(ids);
        loadPhoto(data.photo_path, data.updated_at);
        setIsActive(data.is_active);
        setLoaded(true);
      });
  }, [salonId, isNew, params.id, loadPhoto]);

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
      photo_path: photo.path,
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
        const { error } = await supabase.from("staff_services").insert(
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

  // A new member's photo is saved with the form, so wait for its upload.
  // An existing member's photo saves on its own, so only the form counts as a change.
  const changed = !sameStaff(form, initial) || (isNew && !!photo.path);
  const canSave = loaded && changed && !photo.uploading && !saving;
  const selectedNames = (services ?? [])
    .filter((s) => form.serviceIds.includes(s.id))
    .map((s) => s.name);

  return (
    <Page
      title={isMe ? "Add yourself" : isNew ? "Add a team member" : "Edit team member"}
      footer={
        <SaveBar
          title={isNew ? "Save and add to team" : "Save changes"}
          onPress={() => void save()}
          loading={saving}
          disabled={!canSave}
        />
      }
    >
      {loaded ? (
        <>
          <TextField
            label="Name"
            required
            placeholder={isMe ? "Your name" : "e.g. Njeri Kamau"}
            value={form.name}
            onChangeText={(name) => setForm({ ...form, name })}
            error={errors.name}
            maxLength={60}
            autoCapitalize="words"
          />
          <TextField
            label="Title"
            placeholder="Stylist"
            value={form.title}
            onChangeText={(title) => setForm({ ...form, title })}
            error={errors.title}
            maxLength={40}
          />

          <View style={styles.group}>
            <Text style={styles.label}>
              Services offered<Text style={styles.star}> *</Text>
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Services offered, ${form.serviceIds.length} selected`}
              accessibilityState={{ expanded: picking }}
              onPress={() => setPicking(!picking)}
              style={[styles.box, picking && styles.boxOpen]}
            >
              <Text style={selectedNames.length ? styles.boxValue : styles.boxPlaceholder}>
                {selectedNames.length
                  ? selectedNames.join(", ")
                  : "Pick at least one - clients can only book what’s selected here"}
              </Text>
            </Pressable>
            {picking ? (
              services?.length === 0 ? (
                <View style={styles.noServices}>
                  <Text style={styles.muted}>Add your services first, then pick them here.</Text>
                  <Button
                    title="Go to My services"
                    variant="outline"
                    onPress={() => router.push("/business/services")}
                  />
                </View>
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
              )
            ) : null}
            {errors.services ? <Text style={styles.error}>{errors.services}</Text> : null}
          </View>

          <View style={styles.group}>
            <Text style={styles.label}>Photo</Text>
            <UploadBox
              label="Photo"
              uri={photo.uri}
              busy={photo.uploading}
              height={96}
              onPress={() => void photo.change()}
            />
          </View>

          <TextField
            label="About"
            placeholder="A short introduction for clients"
            value={form.about}
            onChangeText={(about) => setForm({ ...form, about })}
            error={errors.about}
            maxLength={300}
            counter
            multiline
          />

          {photo.error ? <Text style={styles.error}>{photo.error}</Text> : null}
          {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}

          {!isNew ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isActive ? "Deactivate team member" : "Reactivate team member"}
              onPress={toggleActive}
              style={styles.link}
            >
              <Text style={[styles.linkText, { color: isActive ? colors.danger : colors.action }]}>
                {isActive ? "Deactivate" : "Reactivate"}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : errors.form ? (
        <Text style={styles.error}>{errors.form}</Text>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  star: { color: colors.required },
  box: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.field,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },
  boxOpen: { borderWidth: 2, borderColor: colors.action, paddingHorizontal: 15 },
  boxPlaceholder: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 21, color: colors.faint },
  boxValue: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 22, color: colors.ink },
  noServices: { gap: 8 },
  muted: { fontFamily: fonts.regular, fontSize: 15, color: colors.subtle },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  error: { ...type.caption, color: colors.danger },
  link: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start" },
  linkText: { fontFamily: fonts.semibold, fontSize: 15 },
});
