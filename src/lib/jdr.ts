import { db } from "@/lib/firebase";
import {
  addDoc, collection, doc, getDocs, increment, query,
  runTransaction, serverTimestamp, where,
} from "firebase/firestore";

// ─── Types partagés (à retirer de VenueEventsClient) ─────────────────────────
export type EventDoc = {
  id: string; titre: string; date: string; heure: string; duree?: string;
  places: number; inscrits: number; lieu?: string; ville?: string;
  systeme?: string; mjId?: string; annule?: boolean;
  lien?: string;                  // chemin de la page publique de l'animation
  // ── Contenu éditorial (tous optionnels : une section vide n'est pas affichée)
  image?: string;                 // couverture
  accroche?: string;              // une phrase qui donne envie
  description?: string;           // "De quoi s'agit-il ?"
  programme?: ProgrammeItem[];    // déroulé dans l'ordre
  propose?: ProposeItem[];        // ce qu'on y fait / ce qu'on trouve
  tarif?: string;                 // "Gratuit", "5 € la séance"…
  ageMin?: number;
  debutants?: boolean;            // débutants bienvenus ?
  aApporter?: string;
  adresse?: string;
};
export type ProgrammeItem = { heure: string; titre: string; detail?: string };
export type ProposeItem = { icone?: string; titre: string; detail?: string };
export type TableMJ = {
  id: string; mjId: string; mjNom: string; systeme: string; description: string;
  placesMax: number; inscrits: number; status: "pending" | "approved" | "rejected";
  image?: string; duree?: string; personnages?: "pretires" | "creation";
  ageTag?: "tous" | "16" | "18";
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function formatJourComplet(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  return `${JOURS[new Date(y, m - 1, d).getDay()]} ${d} ${MOIS[m - 1]}`;
}

/** Teinte stable (0-359) dérivée du nom du système : chaque jeu garde "sa" couleur. */
export function systemeHue(systeme: string): number {
  let h = 0;
  for (const c of systeme || "?") h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/** Chemin de la page publique d'une animation : le champ `lien` s'il est
 *  enregistré, sinon recalculé depuis le lieu et l'id (même format que l'admin). */
export function cheminAnimation(a: { id: string; lieu?: string; lien?: string }): string {
  return a.lien || `/evenements/animations/${a.lieu || "autre"}/${a.id}`;
}

export function getInitiales(nom: string): string {
  return nom.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

// ─── Inscription (logique extraite de handleConfirmInscription) ──────────────
export async function inscrire(params: {
  event: EventDoc;
  table: TableMJ | null;
  slug: string;
  user: { uid: string; pseudo: string; email: string };
}): Promise<"confirme" | "attente"> {
  const { event, table, slug, user } = params;

  const deja = await getDocs(
    query(collection(db, "evenements", event.id, "inscriptions"), where("userId", "==", user.uid))
  );
  if (!deja.empty) throw new Error("Vous êtes déjà inscrit pour cette animation.");

  let statut: "confirme" | "attente" = "confirme";
  const ref = table
    ? doc(db, "evenements", event.id, "tables", table.id)
    : doc(db, "evenements", event.id);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Cet élément n'existe plus.");
    const d = snap.data();
    const max = table ? d.placesMax ?? 0 : d.places ?? 0;
    if (max - (d.inscrits || 0) > 0) {
      statut = "confirme";
      tx.update(ref, { inscrits: increment(1) });
    } else {
      statut = "attente";
    }
  });

  await addDoc(collection(db, "evenements", event.id, "inscriptions"), {
    userId: user.uid, tableId: table?.id || null, tableMjNom: table?.mjNom || null,
    systeme: table?.systeme || null, prenom: user.pseudo, pseudo: user.pseudo,
    email: user.email, statut, createdAt: serverTimestamp(),
  });
  await addDoc(collection(db, "inscriptions"), {
    eventId: event.id, eventTitle: event.titre, categorie: slug,
    nom: user.pseudo || user.email, email: user.email, pseudo: user.pseudo,
    userId: user.uid, statut, date: event.date, heure: event.heure,
    tableId: table?.id || null, tableMjNom: table?.mjNom || null,
    createdAt: serverTimestamp(),
  });

  try {
    await fetch("/api/inscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email, pseudo: user.pseudo, eventTitle: event.titre,
        date: event.date, heure: event.heure,
        table: table?.mjNom ? `${table.mjNom}${table.systeme ? ` - ${table.systeme}` : ""}` : null,
        statut,
        // Lien direct vers l'animation, à placer dans le gabarit de l'email
        lien: (typeof window !== "undefined" ? window.location.origin : "") +
          (event.lien || `/evenements/${slug}/${event.lieu || "autre"}/${event.id}`),
      }),
    });
  } catch (err) {
    console.error("Erreur envoi email :", err);
  }
  return statut;
}