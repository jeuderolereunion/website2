import VenueEventsClient from "@/app/evenements/[slug]/[id]/VenueEventsClient";
import { LIEUX } from "@/lib/lieux"; // si tu as extrait le fichier partagé

export function generateStaticParams() {
  return Object.keys(LIEUX).map((lieu) => ({ lieu }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; lieu: string }>;
}) {
  const { slug, lieu } = await params;
  const venue = LIEUX[lieu];
  return <VenueEventsClient slug={slug} lieu={lieu} venue={venue} />;
}