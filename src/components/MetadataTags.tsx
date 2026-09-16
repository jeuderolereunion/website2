import type { Metadata } from "next";

const keywords: string[] = [
  "jdr",
  "jeu de rôle",
  "jeux de rôle",
  "tabletop rpg",
  "ttrpg",
  "la réunion",
  "réunion",
  "association",
  "jdr-reunion",
  "jdrreunion",
  "role-playing",
  "roleplaying",
  "rpg",
  "soirée jdr",
  "jeu de société",
];

const authors: { name: string; url: string }[] = [
  {
    name: "JDR Réunion",
    url: "https://jdr-reunion.re/",
  },
];

const siteUrl: string = "https://jdr-reunion.re/";
const title = "JDR Réunion — Jeux de rôle sur table à La Réunion";
const description =
  "JDR Réunion est une association dédiée à la promotion des jeux de rôle sur table à l'île de La Réunion. Rejoignez notre communauté de passionnés.";

const data = {
  title,
  description,
  generator: "Next.js",
  manifest: "/manifest.json",
  keywords,
  authors,
};

export const metadata: Metadata = data;

export default function MetadataTags() {
  return (
    <>
      <title>{title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"></meta>
      <meta name="description" content={description} />
      <meta name="generator" content={data.generator} />
      <link rel="manifest" href={data.manifest} />
      <meta name="keywords" content={data.keywords.join(", ")} />

      <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#121212" />
      {data.authors.map(({ name, url: authorUrl }, index) => (
        <meta key={index} name="author" content={name} {...(authorUrl && { href: authorUrl })} />
      ))}
      

      <meta property="og:type" content="website" />
      <meta property="og:url" content={siteUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${siteUrl}images/app/logo.webp`} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={siteUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${siteUrl}images/app/logo.webp`} />

      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          url: siteUrl,
          name: "JDR Réunion",
          description,
        })}
      </script>
    </>
  );
}
