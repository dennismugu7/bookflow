import { useLocalSearchParams } from "expo-router";

import { ClientForm } from "../../../ui/ClientForm";

/** Edit a client's name and phone, from ⋯ on their profile (owner-v4 05). */
export default function EditClientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return id ? <ClientForm clientId={id} /> : null;
}
