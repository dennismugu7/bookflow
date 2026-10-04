import { formatKenyanPhone, formatKes } from "@bookflow/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  clientSearchFilter,
  createBookingErrorMessage,
  dayOptions,
  eligibleStaff,
  newBookingError,
  serviceChipLabel,
  timeOptions,
  totals,
  whenLabel,
  withinOpeningHours,
  type ClientChoice,
  type HoursRow,
  type ServiceOption,
  type StaffOption,
} from "../../../lib/new-booking";
import { useSession } from "../../../lib/session";
import { getSupabase } from "../../../lib/supabase";
import { ceilToMinutes, zonedParts, zonedTime } from "../../../lib/time";
import { colors, controlHeight, fonts, radius } from "../../../theme";
import { BottomSheet, Chip, Page, TextField } from "../../../ui";

type Found = { id: string; full_name: string; phone: string | null };

/** New booking, a walk-in or phone booking (owner-v3 05). */
export default function NewBookingScreen() {
  const { membership } = useSession();
  const params = useLocalSearchParams<{
    start?: string;
    from?: string;
    /** From the Calendar: the team member whose column was tapped. */
    staff?: string;
    /** From a client's profile: Book. */
    client?: string;
  }>();
  const salon = membership?.salon;
  const timeZone = salon?.timezone ?? "Africa/Nairobi";

  const initial = useMemo(() => {
    const parsed = params.start ? new Date(params.start) : null;
    const start =
      parsed && !Number.isNaN(parsed.getTime()) ? parsed : ceilToMinutes(new Date(), 15);
    return zonedParts(start, timeZone);
  }, [params.start, timeZone]);

  const [services, setServices] = useState<ServiceOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [hours, setHours] = useState<HoursRow[]>([]);
  const [loadError, setLoadError] = useState<string>();

  const [clientText, setClientText] = useState("");
  const [picked, setPicked] = useState<Found>();
  const [found, setFound] = useState<Found[]>([]);
  const [phone, setPhone] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [staffId, setStaffId] = useState<string | undefined>(params.staff);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [picking, setPicking] = useState(false);
  const [confirmOutside, setConfirmOutside] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ field: string; message: string }>();

  useEffect(() => {
    if (!salon) return;
    const supabase = getSupabase();
    void Promise.all([
      supabase
        .from("services")
        .select("id, name, duration_min, price_kes")
        .eq("salon_id", salon.id)
        .eq("is_bookable", true)
        .order("sort_order", { nullsFirst: false })
        .order("created_at"),
      supabase
        .from("staff")
        .select("id, display_name, staff_services(service_id)")
        .eq("salon_id", salon.id)
        .eq("is_active", true)
        .order("sort_order")
        .order("created_at"),
      supabase.from("opening_hours").select("weekday, opens, closes").eq("salon_id", salon.id),
    ]).then(([s, t, h]) => {
      if (s.error || t.error || h.error) {
        setLoadError("Couldn't load your services and team. Go back and try again.");
        return;
      }
      setServices(s.data);
      setStaff(
        t.data.map((row) => ({
          id: row.id,
          name: row.display_name,
          serviceIds: row.staff_services.map((ss) => ss.service_id),
        })),
      );
      setHours(h.data);
    });
  }, [salon]);

  // Book from a profile: that client, already picked.
  useEffect(() => {
    if (!salon || !params.client) return;
    void getSupabase()
      .from("clients")
      .select("id, full_name, phone")
      .eq("salon_id", salon.id)
      .eq("id", params.client)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setPicked(data);
        setClientText(data.full_name);
        setPhone(data.phone ? formatKenyanPhone(data.phone) : "");
      });
  }, [salon, params.client]);

  // Search this salon's clients as the owner types (name or phone, the first 20).
  useEffect(() => {
    const filter = clientSearchFilter(clientText);
    if (!salon || picked || !filter) {
      setFound([]);
      return;
    }
    let live = true;
    const timer = setTimeout(() => {
      void getSupabase()
        .from("clients")
        .select("id, full_name, phone")
        .eq("salon_id", salon.id)
        .or(filter)
        .order("full_name")
        .limit(20)
        .then(({ data }) => {
          if (live) setFound(data ?? []);
        });
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [clientText, picked, salon]);

  const eligible = eligibleStaff(staff, serviceIds);
  const chosenStaff = eligible.find((s) => s.id === staffId) ?? eligible[0];
  const { minutes, totalKes } = totals(services, serviceIds);
  const start = zonedTime(date, time, timeZone);
  const client: ClientChoice = picked
    ? { kind: "existing", id: picked.id, name: picked.full_name, phone: picked.phone }
    : { kind: "new", name: clientText, phone };

  if (!salon) return null;

  function toggleService(id: string) {
    setError(undefined);
    setServiceIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function save(outsideConfirmed = false) {
    const invalid = newBookingError({ client, serviceIds, staffId: chosenStaff?.id });
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!outsideConfirmed && !withinOpeningHours(hours, start, minutes, timeZone)) {
      setConfirmOutside(true);
      return;
    }
    setConfirmOutside(false);
    setSaving(true);
    setError(undefined);
    const { error: saveError } = await getSupabase().rpc("owner_create_booking", {
      p_salon_id: salon!.id,
      p_staff_id: chosenStaff!.id,
      p_service_ids: serviceIds,
      p_starts_at: start.toISOString(),
      ...(client.kind === "existing"
        ? { p_client_id: client.id }
        : { p_client_name: client.name.trim(), p_client_phone: client.phone.trim() || undefined }),
    });
    setSaving(false);
    if (saveError) {
      setError({ field: "form", message: createBookingErrorMessage(saveError) });
      return;
    }
    router.back();
  }

  const fieldError = (field: string) => (error?.field === field ? error.message : undefined);

  return (
    <Page
      title="New booking"
      gap={16}
      footer={
        <TotalBar
          totalKes={totalKes}
          error={fieldError("form")}
          saving={saving}
          onSave={() => void save()}
        />
      }
    >
      {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
      <View>
        <TextField
          label="Client"
          value={clientText}
          onChangeText={(text) => {
            setClientText(text);
            setError(undefined);
            if (picked) {
              setPicked(undefined);
              setPhone("");
            }
          }}
          autoCapitalize="words"
          maxLength={80}
          hint="Search your clients, or type a new name"
          error={fieldError("client")}
        />
        {found.length > 0 ? (
          <View style={styles.found}>
            {found.map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={`${c.full_name}${c.phone ? `, ${formatKenyanPhone(c.phone)}` : ""}`}
                onPress={() => {
                  setPicked(c);
                  setClientText(c.full_name);
                  setPhone(c.phone ? formatKenyanPhone(c.phone) : "");
                  setFound([]);
                }}
                style={({ pressed }) => [styles.foundRow, pressed && styles.pressed]}
              >
                <Text style={styles.foundName}>{c.full_name}</Text>
                {c.phone ? (
                  <Text style={styles.foundPhone}>{formatKenyanPhone(c.phone)}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <TextField
        label="Phone (optional)"
        value={phone}
        onChangeText={(text) => {
          setPhone(text);
          setError(undefined);
        }}
        placeholder="0712 345 678"
        keyboardType="phone-pad"
        editable={!picked}
        hint={picked ? "Saved on this client" : undefined}
        error={fieldError("phone")}
      />

      <Section label="Services" error={fieldError("services")}>
        <View style={styles.chips}>
          {services.map((s) => (
            <Chip
              key={s.id}
              label={serviceChipLabel(s)}
              compact
              selected={serviceIds.includes(s.id)}
              onPress={() => toggleService(s.id)}
            />
          ))}
        </View>
      </Section>

      {eligible.length > 1 ? (
        <Section label="With" afterChips>
          <View style={styles.chips}>
            {eligible.map((s) => (
              <Chip
                key={s.id}
                label={s.name}
                role="radio"
                compact
                selected={s.id === chosenStaff?.id}
                onPress={() => setStaffId(s.id)}
              />
            ))}
          </View>
        </Section>
      ) : eligible.length === 0 && serviceIds.length > 0 ? (
        <Text style={styles.error}>No one on your team offers all of these services.</Text>
      ) : null}

      <Section label="When" afterChips={eligible.length > 1}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`When: ${whenLabel(start, minutes, timeZone)}. Tap to change`}
          onPress={() => setPicking(true)}
          style={({ pressed }) => [styles.when, pressed && styles.pressed]}
        >
          <Text style={styles.whenText}>{whenLabel(start, minutes, timeZone)}</Text>
        </Pressable>
        <Text style={styles.hint}>
          {params.from === "gap"
            ? "Filled in from the free slot. Tap to change."
            : "The next free time. Tap to change."}
        </Text>
      </Section>

      <WhenPicker
        visible={picking}
        timeZone={timeZone}
        date={date}
        time={time}
        onClose={() => setPicking(false)}
        onPick={(d, t) => {
          setDate(d);
          setTime(t);
          setError(undefined);
        }}
      />
      <BottomSheet
        visible={confirmOutside}
        onClose={() => setConfirmOutside(false)}
        variant="handle"
      >
        <Text style={styles.sheetTitle} accessibilityRole="header">
          Outside opening hours
        </Text>
        <Text style={styles.sheetBody}>
          {whenLabel(start, minutes, timeZone)} is outside your opening hours. Book it anyway?
        </Text>
        <View style={styles.sheetButtons}>
          <SheetButton label="Go back" onPress={() => setConfirmOutside(false)} />
          <SheetButton label="Book anyway" dark onPress={() => void save(true)} />
        </View>
      </BottomSheet>
    </Page>
  );
}

function Section({
  label,
  error,
  afterChips = false,
  children,
}: {
  label: string;
  error?: string;
  /** Chips sit further from the next label than fields do (05). */
  afterChips?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.section, afterChips && styles.afterChips]}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** The fixed bottom bar: the total and Save booking (05). */
function TotalBar({
  totalKes,
  error,
  saving,
  onSave,
}: {
  totalKes: number;
  error?: string;
  saving: boolean;
  onSave: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: 22 + insets.bottom }]}>
      {error ? (
        <Text style={[styles.error, styles.barError]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <View style={styles.barRow}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.total}>{formatKes(totalKes)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save booking"
          accessibilityState={{ busy: saving, disabled: saving }}
          disabled={saving}
          onPress={onSave}
          style={({ pressed }) => [styles.save, (pressed || saving) && styles.pressed]}
        >
          <Text style={styles.saveText}>{saving ? "Saving…" : "Save booking"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Date and time in 15-minute steps; owners may pick times outside opening hours. */
function WhenPicker({
  visible,
  timeZone,
  date,
  time,
  onClose,
  onPick,
}: {
  visible: boolean;
  timeZone: string;
  date: string;
  time: string;
  onClose: () => void;
  onPick: (date: string, time: string) => void;
}) {
  const days = dayOptions(new Date(), timeZone);
  const times = timeOptions();
  if (!times.includes(time)) times.push(time);
  times.sort();
  return (
    <BottomSheet visible={visible} onClose={onClose} variant="handle">
      <Text style={styles.sheetTitle} accessibilityRole="header">
        When
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.days}>
        <View style={styles.dayRow}>
          {days.map((d) => (
            <Chip
              key={d.date}
              label={d.label}
              role="radio"
              compact
              selected={d.date === date}
              onPress={() => onPick(d.date, time)}
            />
          ))}
        </View>
      </ScrollView>
      <ScrollView style={styles.times}>
        <View style={styles.chips}>
          {times.map((t) => (
            <Chip
              key={t}
              label={t}
              role="radio"
              compact
              selected={t === time}
              onPress={() => onPick(date, t)}
            />
          ))}
        </View>
      </ScrollView>
      <View style={styles.sheetButtons}>
        <SheetButton label="Done" dark onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

function SheetButton({
  label,
  onPress,
  dark = false,
}: {
  label: string;
  onPress: () => void;
  dark?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sheetButton,
        dark && styles.sheetButtonDark,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.sheetButtonText, dark && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: 9 },
  afterChips: { marginTop: 8 },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", columnGap: 9, rowGap: 9 },
  hint: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.subtle },
  error: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.danger },
  found: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius,
    overflow: "hidden",
  },
  foundRow: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  foundName: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  foundPhone: { fontFamily: fonts.regular, fontSize: 14, color: colors.subtle },
  when: {
    height: controlHeight,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.field,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  whenText: { fontFamily: fonts.regular, fontSize: 17, color: colors.ink },
  pressed: { opacity: 0.7 },
  bar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  barError: { marginBottom: 10 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  totalLabel: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 17, color: colors.subtle },
  total: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 23, color: colors.ink },
  save: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { fontFamily: fonts.medium, fontSize: 15, color: colors.white },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.ink },
  sheetBody: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 21,
    color: colors.subtle,
  },
  sheetButtons: { flexDirection: "row", gap: 10, marginTop: 18 },
  sheetButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardLine,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetButtonDark: { backgroundColor: colors.ink, borderColor: colors.ink },
  sheetButtonText: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  days: { marginTop: 14, flexGrow: 0 },
  dayRow: { flexDirection: "row", gap: 9 },
  times: { marginTop: 14, maxHeight: 220 },
});
