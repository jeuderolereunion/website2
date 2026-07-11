import { estUnLieu, LIEUX } from "@/lib/lieux";
import EventDetailClient from "./EventDetailClient";
import VenueEventsClient from "./VenueEventsClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  if (estUnLieu(id)) {
    return <VenueEventsClient slug={slug} lieu={id} venue={LIEUX[id]} />;
  }

  return <EventDetailClient slug={slug} id={id} />;
}