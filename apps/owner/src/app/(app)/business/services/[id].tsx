import { formatKes } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

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
import { colors, fonts, minTouch, space, type } from "../../../../theme";
import { Button, Screen } from "../../../../ui";

const EMPTY: ServiceForm = { name: "", duration: "20", price: "", isBookable: true };
const LABEL_GREY = "#6B6B6B";

/** Add or edit a service (48). */
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
  const named = !!form?.name.trim();

  return (
    <Screen
      background="#FAFAFA"
      gap={space(3)}
      footer={
        <Button
          title="Save service"
          onPress={() => void save()}
          loading={saving}
          disabled={!form}
        />
      }
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.back}
        >
          <Feather name="arrow-left" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {isNew ? "Add a service" : "Edit service"}
        </Text>
      </View>
      {form ? (
        <>
          <View style={styles.group}>
            <Text style={styles.caps}>How it&apos;ll appear</Text>
            <View
              style={styles.preview}
              accessible
              accessibilityLabel="Preview of the service on your booking page"
            >
              <Text style={[styles.previewName, !named && styles.previewEmpty]}>
                {named ? form.name.trim() : "Service name"}
              </Text>
              <Text style={styles.previewMins}>
                {duration ? minutesLabel(duration) : "— mins"}
                {form.isBookable ? "" : " · hidden"}
              </Text>
              <Text style={[styles.previewPrice, price === null && styles.previewEmpty]}>
                {price !== null ? formatKes(price) : "KES —"}
              </Text>
            </View>
          </View>

          <FieldCard label="Service name" error={errors.name}>
            <TextInput
              accessibilityLabel="Service name"
              placeholder="e.g. Shaping & defining the beard"
              placeholderTextColor={LABEL_GREY}
              value={form.name}
              onChangeText={(name) => setForm({ ...form, name })}
              maxLength={80}
              autoCapitalize="sentences"
              style={styles.input}
            />
          </FieldCard>

          <View style={styles.group}>
            <Text style={styles.label}>
              Duration <Text style={styles.star}>*</Text>
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
              <DurationChip
                label="Custom"
                dashed
                selected={custom}
                onPress={() => setCustom(true)}
              />
            </View>
            {custom ? (
              <FieldCard label="Minutes" hint="5 to 600, in steps of 5" error={errors.duration}>
                <TextInput
                  accessibilityLabel="Minutes"
                  value={form.duration}
                  onChangeText={(text) => setForm({ ...form, duration: text.replace(/\D/g, "") })}
                  keyboardType="number-pad"
                  maxLength={3}
                  style={styles.input}
                />
              </FieldCard>
            ) : errors.duration ? (
              <Text style={styles.error}>{errors.duration}</Text>
            ) : null}
          </View>

          <FieldCard label="Price" error={errors.price}>
            <View style={styles.priceRow}>
              <Text style={styles.kes}>KES</Text>
              <TextInput
                accessibilityLabel="Price in KES, whole shillings"
                placeholder="e.g. 400"
                placeholderTextColor={LABEL_GREY}
                value={form.price}
                onChangeText={(text) => setForm({ ...form, price: text.replace(/[^\d,\s]/g, "") })}
                keyboardType="number-pad"
                style={[styles.input, styles.flex]}
              />
            </View>
          </FieldCard>

          <View style={[styles.fieldCard, styles.toggle]}>
            <View style={styles.flex}>
              <Text style={styles.toggleTitle}>Bookable by clients</Text>
              <Text style={styles.toggleDetail}>Off keeps it as a draft, hidden from booking</Text>
            </View>
            <Switch
              accessibilityLabel="Bookable by clients"
              value={form.isBookable}
              onValueChange={(isBookable) => setForm({ ...form, isBookable })}
              trackColor={{ false: colors.border, true: "#2F76E0" }}
              thumbColor={colors.white}
            />
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

function FieldCard({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <View style={styles.fieldCard}>
        <Text style={styles.label}>
          {label} <Text style={styles.star}>*</Text>
        </Text>
        {children}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

function DurationChip({
  label,
  selected,
  dashed = false,
  onPress,
}: {
  label: string;
  selected: boolean;
  dashed?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.chip, dashed && styles.chipDashed, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: space(3), marginLeft: -space(2) },
  back: { width: minTouch, height: minTouch, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  group: { gap: space(2) },
  fieldGroup: { gap: space(1) },
  caps: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: LABEL_GREY,
  },
  preview: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D0D0D0",
    borderRadius: 14,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    gap: space(1) + 2,
  },
  previewName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  previewMins: { fontFamily: fonts.medium, fontSize: 13, color: LABEL_GREY },
  previewPrice: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  previewEmpty: { color: LABEL_GREY },
  fieldCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    gap: space(1),
  },
  label: { fontFamily: fonts.medium, fontSize: 11.5, color: LABEL_GREY },
  star: { color: colors.danger },
  input: {
    minHeight: 30,
    padding: 0,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
  },
  priceRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
  kes: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  flex: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space(1) + 2 },
  chip: {
    minHeight: 36,
    paddingHorizontal: space(2) + 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  chipDashed: { borderStyle: "dashed", borderColor: "#CCCCCC" },
  chipSelected: { borderColor: colors.inputBlue, backgroundColor: "#F2F7FF" },
  chipText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.ink },
  chipTextSelected: { color: colors.inputBlue },
  toggle: { flexDirection: "row", alignItems: "center", gap: space(3), paddingVertical: space(3) },
  toggleTitle: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.ink },
  toggleDetail: { fontFamily: fonts.medium, fontSize: 12, color: LABEL_GREY, marginTop: 2 },
  hint: { ...type.caption, color: colors.muted },
  error: { ...type.caption, color: colors.danger },
  delete: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start" },
  deleteText: { fontFamily: fonts.bold, fontSize: 15, color: colors.danger },
});
