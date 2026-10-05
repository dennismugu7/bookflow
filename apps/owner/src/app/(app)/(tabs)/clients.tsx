import { initialsFor } from "@bookflow/shared";
import Feather from "@expo/vector-icons/Feather";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  SEGMENTS,
  clientBadges,
  clientSubLine,
  clientTint,
  parseClientList,
  segmentChip,
  type ClientItem,
  type ClientList,
  type Segment,
} from "../../../lib/clients";
import { clientHref } from "../../../lib/routes";
import { useSession, type Membership } from "../../../lib/session";
import { getSupabase } from "../../../lib/supabase";
import { colors, fonts, minTouch } from "../../../theme";
import { Badge, Chip } from "../../../ui";
import { SharePill } from "../../../ui/today/AgendaList";

const SEARCH_DEBOUNCE_MS = 300;

export default function ClientsScreen() {
  const { membership } = useSession();
  if (!membership) return null;
  return <Clients membership={membership} />;
}

/** The client book: empty state (owner-v4 03), or search, segments and rows (04). */
function Clients({ membership }: { membership: Membership }) {
  const { salon } = membership;
  const isOwner = membership.role === "owner";
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [list, setList] = useState<ClientList>();
  const [error, setError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    const request = ++latest.current;
    const { data, error: loadError } = await getSupabase().rpc("get_clients", {
      p_salon_id: salon.id,
      p_search: query || undefined,
      p_segment: segment,
    });
    if (request !== latest.current) return;
    if (loadError || !data) {
      setError("Couldn't load your clients. Pull down to try again.");
      return;
    }
    try {
      setList(parseClientList(data));
      setError(undefined);
    } catch {
      setError("Couldn't read your clients. Update the app and try again.");
    }
  }, [salon.id, query, segment]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const add = () => router.push("/clients/new");
  const empty = list && list.counts.all === 0;

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <View style={styles.titleRow}>
        <Text style={styles.title} accessibilityRole="header">
          Clients
        </Text>
        {isOwner ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a client"
            onPress={add}
            style={({ pressed }) => [styles.plus, pressed && styles.pressed]}
          >
            <Feather name="plus" size={22} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!list ? null : empty ? (
          <Empty slug={salon.slug} onAdd={isOwner ? add : undefined} />
        ) : (
          <>
            <View style={styles.search}>
              <Feather name="search" size={12} color={colors.faint} />
              <TextInput
                accessibilityLabel="Search name or phone"
                placeholder="Search name or phone"
                placeholderTextColor={colors.faint}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                returnKeyType="search"
                style={styles.searchInput}
              />
            </View>
            <View style={styles.chips}>
              {SEGMENTS.map((s) => (
                <Chip
                  key={s}
                  label={segmentChip(s, list.counts)}
                  role="radio"
                  dense
                  selected={segment === s}
                  onPress={() => setSegment(s)}
                />
              ))}
            </View>
            <View style={styles.rows}>
              {list.clients.map((c) => (
                <ClientRow key={c.id} client={c} timeZone={salon.timezone} />
              ))}
              {list.clients.length === 0 ? (
                <Text style={styles.noMatch}>No clients match.</Text>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ClientRow({ client, timeZone }: { client: ClientItem; timeZone: string }) {
  const sub = clientSubLine(client, timeZone, new Date());
  const badges = clientBadges(client);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${client.full_name}${badges.map((b) => `, ${b}`).join("")}, ${sub}`}
      onPress={() => router.push(clientHref(client.id))}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.avatar, { backgroundColor: clientTint(client.id) }]}>
        <Text style={styles.avatarText}>{initialsFor(client.full_name)}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {client.full_name}
          </Text>
          {badges.map((b) => (
            <Badge
              key={b}
              label={b === "new" ? "New" : "Lapsed"}
              variant={b === "new" ? "newWeb" : "lapsed"}
              size="small"
            />
          ))}
        </View>
        <Text style={styles.sub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Feather name="chevron-right" size={15} color={colors.subtle} />
    </Pressable>
  );
}

/** 03: the smile, the copy, Add a client and the share link. */
function Empty({ slug, onAdd }: { slug: string; onAdd?: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyArt}>
        <Feather name="smile" size={28} color={colors.action} />
      </View>
      <Text style={styles.emptyTitle}>Your client list will build itself</Text>
      <Text style={styles.emptyBody}>
        Everyone who books with you, online or as a walk-in you add, shows up here with their visit
        history and your notes.
      </Text>
      {onAdd ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a client"
          onPress={onAdd}
          style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}
        >
          <Text style={styles.emptyButtonText}>Add a client</Text>
        </Pressable>
      ) : null}
      <ShareLink slug={slug} />
    </View>
  );
}

/** The blue text link of 03 (Today uses the pill). */
function ShareLink({ slug }: { slug: string }) {
  return (
    <View style={styles.shareLink}>
      <SharePill slug={slug} variant="link" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  titleRow: {
    height: 61,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
    paddingRight: 8,
  },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 24, color: colors.ink },
  plus: { width: minTouch, height: minTouch, alignItems: "center", justifyContent: "center" },
  content: { paddingBottom: 24 },
  error: {
    marginHorizontal: 20,
    marginBottom: 12,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
  },
  search: {
    marginHorizontal: 20,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.field,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 15,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.ink,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 9,
    rowGap: 8,
    marginHorizontal: 20,
    marginTop: 13,
  },
  rows: { marginTop: 17 },
  row: {
    minHeight: 69,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
    paddingRight: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  rowPressed: { backgroundColor: colors.softFill },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
  rowBody: { flex: 1, gap: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  name: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.subtle },
  noMatch: {
    marginTop: 24,
    textAlign: "center",
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.subtle,
  },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 36 },
  emptyArt: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.actionTint,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginTop: 20,
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.ink,
    textAlign: "center",
  },
  emptyBody: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.subtle,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: 22,
    width: 260,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButtonText: { fontFamily: fonts.medium, fontSize: 15, color: colors.white },
  shareLink: { marginTop: 2 },
});
