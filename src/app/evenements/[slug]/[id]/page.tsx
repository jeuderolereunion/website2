import EventDetailClient from "@/app/evenements/[slug]/[id]/EventDetailClient";

// ⚠️ Export statique (Netlify) : on ne peut pas pré-générer tous les id
// d'événements puisqu'ils changent en continu en base. On garde donc
// generateStaticParams vide + dynamicParams=true, comme pour la route
// parente [slug], et c'est EventDetailClient (client) qui va chercher
// l'événement correspondant via Firestore au chargement.
export async function generateStaticParams() {
  return [];
}

export const dynamicParams = true;

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  return <EventDetailClient slug={slug} id={id} />;
}