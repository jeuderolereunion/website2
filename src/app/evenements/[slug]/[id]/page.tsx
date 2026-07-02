import { Metadata } from "next";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import EventDetailClient from "@/app/evenements/[slug]/[id]/EventDetailClient";

type Props = {
  params: Promise<{ slug: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const snap = await getDoc(doc(db, "evenements", id));

  if (!snap.exists()) {
    return { title: "Événement introuvable — JDR Réunion" };
  }

  const data = snap.data();
  const titre = data.titre || "Événement";
  const description =
    data.description?.slice(0, 160) ||
    "Rejoins cet événement sur JDR Réunion !";
  const image = data.image || "https://jdr-reunion.com/og-default.jpg";
  const url = `https://jdr-reunion.com/evenements/${slug}/${id}`;

  return {
    title: `${titre} — JDR Réunion`,
    description,
    openGraph: {
      title: titre,
      description,
      url,
      siteName: "JDR Réunion",
      images: [{ url: image, width: 1200, height: 630, alt: titre }],
      locale: "fr_FR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: titre,
      description,
      images: [image],
    },
  };
}

export async function generateStaticParams() {
  return [];
}
export const dynamicParams = true;

export default async function Page({ params }: Props) {
  const { slug, id } = await params;
  return <EventDetailClient slug={slug} id={id} />;
}