import { formatKes } from "@bookflow/shared";

export default async function SalonPage(props: PageProps<"/s/[slug]">) {
  const { slug } = await props.params;
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
      <h1 className="text-3xl font-semibold">{slug}</h1>
      <p className="text-lg">{formatKes(400)}</p>
    </main>
  );
}
