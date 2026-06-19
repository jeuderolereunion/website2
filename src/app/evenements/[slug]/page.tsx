import EventPageClient from "./Eventpageclient";

export function generateStaticParams() {
  return [
    { slug: "soirees-jdr" },
    { slug: "tournois" },
    { slug: "soirees-jeux" },
    { slug: "initiations" },
  ];
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EventPageClient slug={slug} />;
}