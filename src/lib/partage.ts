// Utilitaires SERVEUR pour les aperçus de partage (Discord, Facebook, WhatsApp…).
// Volontairement sans le SDK Firebase client : on lit Firestore par son API REST,
// ce qui fonctionne dans generateMetadata sans dépendre de `window`.

export const NOM_SITE = "JDR Réunion"; // à adapter si besoin

const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function formatQuand(date?: string, heure?: string): string {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${JOURS[new Date(y, m - 1, d).getDay()]} ${d} ${MOIS[m - 1]}${heure ? ` à ${heure}` : ""}`;
}

export function resume(texte: string, max = 180): string {
  const t = texte.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…";
}

/** Recadre une image Cloudinary en 1200×630, le format attendu par les aperçus. */
export function imagePartage(url?: string): string | undefined {
  if (!url) return undefined;
  return url.includes("/upload/")
    ? url.replace("/upload/", "/upload/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/")
    : url;
}

function valeur(v: any): any {
  if (v == null) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("arrayValue" in v) return (v.arrayValue.values ?? []).map(valeur);
  if ("mapValue" in v)
    return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, valeur(x)]));
  return null; // null, timestamp, référence… inutiles ici
}

/** Lit un document Firestore (ex. "evenements/abc") ; renvoie null s'il est
 *  absent ou si les règles Firestore n'autorisent pas la lecture publique. */
export async function lireDocument(chemin: string): Promise<Record<string, any> | null> {
  const projet = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projet) return null;
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projet}/databases/(default)/documents/${chemin}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return Object.fromEntries(Object.entries(json.fields ?? {}).map(([k, v]) => [k, valeur(v)]));
  } catch {
    return null;
  }
}