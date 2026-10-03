import { formatKes } from "@bookflow/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "../../../../lib/session";
import {
  DURATION_CHOICES,
  formatDuration,
  parseDuration,
  parsePriceKes,
  serviceSaveError,
  validateService,
  type ServiceErrors,
  type ServiceForm,
} from "../../../../lib/setup";
import { getSupabase } from "../../../../lib/supabase";
import { colors, fonts, minTouch, space, type } from "../../../../theme";
import { Button, Card, Chip, Header, Screen, TextField, ToggleRow } from "../../../../ui";

const EMPTY: ServiceForm = { name: "", duration: "30", price: "", isBookable: true };

export default function ServiceEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const { membership } = useSession();
  const salonId = membership?.salon.id;
  const [form, setForm] = useState<ServiceForm | undefined>(isNew ? EMPTY : undefined);
  const [custom, setCustom] = useState(false);
  const [errors, setErrors] = useState<ServiceErrors & { form?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    void getSupabase()
      .from("services")
      .select("name, duration_min, price_kes, is_bookable")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setErrors({ form: "Couldn't load this service." });
          return;
        }
        setForm({
          name: data.name,
          duration: String(data.duration_min),
          price: String(data.price_kes),
          isBookable: data.is_bookable,
        });
        setCustom(!(DURATION_CHOICES as readonly number[]).includes(data.duration_min));
      });
  }, [id, isNew]);

  async function save() {
    if (!form || !salonId) return;
    const fieldErrors = validateService(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    const row = {
      name: form.name.trim(),
      duration_min: parseDuration(form.duration)!,
      price_kes: parsePriceKes(form.price)!,
      is_bookable: form.isBookable,
    };
    setSaving(true);
    const { error } = isNew
      ? await getSupabase()
          .from("services")
          .insert({ ...row, salon_id: salonId })
      : await getSupabase().from("services").update(row).eq("id", id);
    setSaving(false);
    if (error) {
      const mapped = serviceSaveError(error);
      setErrors({ [mapped.field]: mapped.message });
      return;
    }
    router.back();
  }

  function confirmDelete() {
    Alert.alert("Delete this service?", "Clients won't be able to book it any more.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void getSupabase()
            .from("services")
            .delete()
            .eq("id", id)
            .then(({ error }) => {
              if (error) setErrors({ form: serviceSaveError(error).message });
              else router.back();
            });
        },
      },
    ]);
  }

  const duration = form ? parseDuration(form.duration) : null;
  const price = form ? parsePriceKes(form.price) : null;

  return (
    <Screen
      footer={
        <Button
          title="Save service"
          onPress={() => void save()}
          loading={saving}
          disabled={!form}
        />
      }
    >
      <Header title={isNew ? "Add a service" : "Edit service"} />
      {form ? (
        <>
          <TextField
            label="Service name"
            placeholder="Silk press"
            value={form.name}
            onChangeText={(name) => setForm({ ...form, name })}
            error={errors.name}
            maxLength={80}
            autoCapitalize="sentences"
          />

          <View style={styles.group}>
            <Text style={styles.label}>Duration</Text>
            <View style={styles.chips}>
              {DURATION_CHOICES.map((minutes) => (
                <Chip
                  key={minutes}
                  label={formatDuration(minutes)}
                  selected={!custom && duration === minutes}
                  onPress={() => {
                    setCustom(false);
                    setForm({ ...form, duration: String(minutes) });
                  }}
                />
              ))}
              <Chip label="Custom" selected={custom} onPress={() => setCustom(true)} />
            </View>
            {custom ? (
              <TextField
                label="Minutes"
                hint="5 to 600, in steps of 5"
                value={form.duration}
                onChangeText={(text) => setForm({ ...form, duration: text.replace(/\D/g, "") })}
                keyboardType="number-pad"
                maxLength={3}
                error={errors.duration}
              />
            ) : errors.duration ? (
              <Text style={styles.error}>{errors.duration}</Text>
            ) : null}
          </View>

          <TextField
            label="Price (KES)"
            placeholder="1500"
            value={form.price}
            onChangeText={(text) => setForm({ ...form, price: text.replace(/[^\d,\s]/g, "") })}
            keyboardType="number-pad"
            error={errors.price}
            hint="Whole shillings"
          />

          <ToggleRow
            label="Bookable by clients"
            detail={
              form.isBookable ? "Shows on your booking page" : "Hidden from your booking page"
            }
            value={form.isBookable}
            onChange={(isBookable) => setForm({ ...form, isBookable })}
          />

          <View style={styles.group}>
            <Text style={styles.label}>How it&apos;ll appear</Text>
            <Card accessibilityLabel="Preview of the service on your booking page">
              <View style={styles.previewRow}>
                <Text style={[type.heading, styles.previewName]}>
                  {form.name.trim() || "Service name"}
                </Text>
                <Text style={type.heading}>{price !== null ? formatKes(price) : "KES –"}</Text>
              </View>
              <Text style={[type.caption, { color: colors.muted }]}>
                {duration ? formatDuration(duration) : "Duration"}
                {form.isBookable ? "" : " · hidden"}
              </Text>
            </Card>
          </View>

          {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}

          {!isNew ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete service"
              onPress={confirmDelete}
              style={styles.delete}
            >
              <Text style={styles.deleteText}>Delete service</Text>
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
  group: { gap: space(2) },
  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  previewRow: { flexDirection: "row", gap: space(3) },
  previewName: { flex: 1 },
  error: { ...type.caption, color: colors.danger },
  delete: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start" },
  deleteText: { fontFamily: fonts.bold, fontSize: 15, color: colors.danger },
});
