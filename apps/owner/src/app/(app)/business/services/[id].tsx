import { formatKes } from "@bookflow/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { minutesLabel } from "../../../../lib/display";
import { useSession } from "../../../../lib/session";
import {
  DURATION_CHOICES,
  parseDuration,
  parsePriceKes,
  serviceSaveError,
  validateService,
  type ServiceErrors,
  type ServiceForm,
} from "../../../../lib/setup";
import { getSupabase } from "../../../../lib/supabase";
import { colors, fonts, minTouch, type } from "../../../../theme";
import { Page, SaveBar, TextField } from "../../../../ui";

const EMPTY: ServiceForm = { name: "", duration: "20", price: "", isBookable: true };

const sameForm = (a: ServiceForm, b: ServiceForm) =>
  a.name.trim() === b.name.trim() &&
  a.duration === b.duration &&
  a.price.trim() === b.price.trim() &&
  a.isBookable === b.isBookable;

/** Add or edit a service (owner-v2 03). */
export default function ServiceEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const { membership } = useSession();
  const salonId = membership?.salon.id;
  const [initial, setInitial] = useState<ServiceForm | undefined>(isNew ? EMPTY : undefined);
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
        const loaded = {
          name: data.name,
          duration: String(data.duration_min),
          price: String(data.price_kes),
          isBookable: data.is_bookable,
        };
        setInitial(loaded);
        setForm(loaded);
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
  const changed = !!form && !!initial && !sameForm(form, initial);
  const preview = form
    ? [
        form.name.trim() || "Service name",
        duration ? minutesLabel(duration) : "— min",
        price !== null ? formatKes(price) : "KES —",
      ].join(" · ")
    : "";

  return (
    <Page
      title={isNew ? "Add a service" : "Edit service"}
      footer={
        <SaveBar
          title="Save service"
          onPress={() => void save()}
          disabled={!changed}
          loading={saving}
        />
      }
    >
      {form ? (
        <>
          <TextField
            label="Service name"
            required
            placeholder="e.g. Silk press"
            value={form.name}
            onChangeText={(name) => setForm({ ...form, name })}
            error={errors.name}
            maxLength={80}
            autoCapitalize="sentences"
          />

          <View style={styles.group}>
            <Text style={styles.label}>
              Duration<Text style={styles.star}> *</Text>
            </Text>
            <View style={styles.chips}>
              {DURATION_CHOICES.map((minutes) => (
                <DurationChip
                  key={minutes}
                  label={`${minutes} min`}
                  selected={!custom && duration === minutes}
                  onPress={() => {
                    setCustom(false);
                    setForm({ ...form, duration: String(minutes) });
                  }}
                />
              ))}
              <DurationChip label="Custom" selected={custom} onPress={() => setCustom(true)} />
            </View>
            {custom ? (
              <TextField
                label="Minutes"
                hideLabel
                placeholder="Minutes"
                hint="5 to 600, in steps of 5"
                value={form.duration}
                onChangeText={(text) => setForm({ ...form, duration: text.replace(/\D/g, "") })}
                error={errors.duration}
                keyboardType="number-pad"
                maxLength={3}
              />
            ) : errors.duration ? (
              <Text style={styles.error}>{errors.duration}</Text>
            ) : null}
          </View>

          <TextField
            label="Price (KES)"
            required
            placeholder="e.g. 1500"
            value={form.price}
            onChangeText={(text) => setForm({ ...form, price: text.replace(/[^\d,\s]/g, "") })}
            error={errors.price}
            keyboardType="number-pad"
            accessibilityLabel="Price in KES, whole shillings"
          />

          <View style={styles.toggle}>
            <View style={styles.flex}>
              <Text style={styles.toggleTitle}>Bookable by clients</Text>
              <Text style={styles.toggleDetail}>Off keeps it as a draft</Text>
            </View>
            <Switch
              accessibilityLabel="Bookable by clients"
              value={form.isBookable}
              onValueChange={(isBookable) => setForm({ ...form, isBookable })}
              trackColor={{ false: colors.field, true: colors.action }}
              thumbColor={colors.white}
            />
          </View>

          <Text style={styles.preview} accessibilityLabel={`Preview: ${preview}`}>
            Preview: <Text style={styles.previewValue}>{preview}</Text>
            {form.isBookable ? "" : " (hidden)"}
          </Text>

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
    </Page>
  );
}

function DurationChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  star: { color: colors.required },
  flex: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minWidth: 78,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.field,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  // One pixel less padding keeps the label still when the border thickens.
  chipSelected: {
    borderWidth: 2,
    paddingHorizontal: 15,
    borderColor: colors.action,
    backgroundColor: colors.actionTint,
  },
  chipText: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  chipTextSelected: { color: colors.action },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 14,
    paddingVertical: 14,
    marginTop: 2,
  },
  toggleTitle: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, color: colors.ink },
  toggleDetail: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.subtle },
  preview: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.subtle,
    marginTop: -6,
  },
  previewValue: { fontFamily: fonts.semibold, color: colors.ink },
  error: { ...type.caption, color: colors.danger },
  delete: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start" },
  deleteText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.danger },
});
