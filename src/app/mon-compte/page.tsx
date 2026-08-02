"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import Navigation from "@/components/Navigation";
import Profileniveauselector from "@/components/Profileniveauselector";
import CoordonneesForm from "@/components/CoordonneesForm";
import ContactOfficers from "@/components/ContactOfficers";
import OfficerInbox from "@/components/OfficerInbox";
import { subscribeToConversations, Conversation } from "@/lib/chat";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  runTransaction,
  increment,
  deleteField,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  RPG_THEMES,
  THEME_ORDER,
  FONT_IMPORT_URL,
  loadStoredTheme,
  storeTheme,
  ThemeId,
} from "@/app/mon-compte/rpgThemes";

// ─── Cloudinary (photo de profil) ─────────────────────────────────────────────

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

async function uploadToCloudinary(
  file: File,
  onProgress: (pct: number) => void,
  resourceType: "image" | "raw" | "auto" = "image"
): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.secure_url as string);
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error(`Échec de l'upload Cloudinary (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Échec de l'upload Cloudinary"));

    xhr.send(formData);
  });
}

function getInitiales(nom: string): string {
  return nom
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Petit helper pour lire une CSS custom property injectée par le thème actif
function tv(name: string) {
  return `var(${name})`;
}

// rpgThemes.ts ne fournit pas de variante assombrie (--accent-dark, etc.) :
// on la calcule à la volée avec color-mix plutôt que d'inventer une variable.
function shade(name: string, pct = 60) {
  return `color-mix(in srgb, var(${name}) ${pct}%, black)`;
}

// ─── Fonds décoratifs par univers (purement visuel, aucune donnée métier) ─────

const U = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;

// Illustrations de secours par catégorie d'événement (utilisées tant qu'aucune
// photo réelle n'est enregistrée sur le document Firestore de l'événement)
const EVENT_FALLBACK_IMAGES: Record<string, string> = {
  fantasy: U("photo-1650024520226-b63a33baff60", 600, 200),
  cyber: U("photo-1519608487953-e999c86e7455", 600, 200),
  horror: U("photo-1641667838410-b257ca266e38", 600, 200),
  scifi: U("photo-1462331940025-496dfbfc7564", 600, 200),
};

// Déduit un "genre" visuel (fantasy / cyber / horror / scifi) à partir du nom
// de catégorie ou de système enregistré sur l'événement, pour choisir la bonne
// teinte / image de secours — n'affecte jamais les données, purement cosmétique.
function genreFromCategorie(categorie?: string): "fantasy" | "cyber" | "horror" | "scifi" {
  const s = (categorie || "").toLowerCase();
  if (/(cyber|shadowrun|néon|neon)/.test(s)) return "cyber";
  if (/(horreur|horror|cthulhu|lovecraft)/.test(s)) return "horror";
  if (/(sci-?fi|starfinder|space|spatial)/.test(s)) return "scifi";
  return "fantasy";
}

// Particules décoratives (braises fantasy / étoiles sci-fi), seeds fixes pour éviter le re-render aléatoire
const EMBER_SEEDS = [
  { left: 8, delay: 0, duration: 7, drift: 10 },
  { left: 22, delay: 1.4, duration: 8, drift: -14 },
  { left: 38, delay: 2.6, duration: 6.5, drift: 8 },
  { left: 55, delay: 0.8, duration: 7.5, drift: -10 },
  { left: 70, delay: 3.2, duration: 8.5, drift: 12 },
  { left: 84, delay: 1.9, duration: 7, drift: -8 },
  { left: 93, delay: 4, duration: 9, drift: 6 },
];

const STAR_SEEDS = Array.from({ length: 26 }, (_, i) => ({
  top: (i * 37) % 100,
  left: (i * 53) % 100,
  size: 1 + (i % 3),
  delay: (i % 7) * 0.4,
  duration: 2.5 + (i % 5) * 0.6,
}));

// ─── Types ────────────────────────────────────────────────────────────────────

type NiveauChoice = "debutant" | "confirme" | "expert";
type Poste = "president" | "tresorier" | "secretaire";

type UserProfile = {
  prenom?: string;
  nom?: string;
  pseudo?: string;
  email: string;
  role: string;
  niveau?: NiveauChoice;
  poste?: Poste;
  telephone?: string;
  emailVisible?: boolean;
  telephoneVisible?: boolean;
  avatarUrl?: string;
  ficheTheme?: ThemeId;
};

type Inscription = {
  id: string;
  eventId: string;
  eventTitle: string;
  categorie: string;
};

type ParticipantInscription = {
  id: string;
  eventId: string;
  nom: string;
  email: string;
  pseudo?: string;
};

type EventDoc = {
  id: string;
  titre: string;
  date: string;
  heure: string;
  places: number;
  inscrits: number;
  categorie?: string;
  photoUrl?: string;
  photos?: string[];
  mjNom?: string;
};

// Infos complémentaires d'un événement, mises en cache pour habiller les
// cartes "Mes Inscriptions" (le document inscriptions ne stocke que
// eventId/eventTitle/categorie ; le reste vient du document evenements lié).
type EventInfo = {
  date?: string;
  heure?: string;
  mjNom?: string;
  photoUrl?: string;
  places?: number;
  inscrits?: number;
};

function eventPhotoUrl(data: { photoUrl?: string; photos?: string[] } | undefined, categorie?: string) {
  return data?.photoUrl || data?.photos?.[0] || EVENT_FALLBACK_IMAGES[genreFromCategorie(categorie)];
}

type TabKey = "apercu" | "inscriptions" | "evenements" | "fiches" | "messages" | "profil";

// Fiche de personnage importée par le joueur (PDF, image ou export JSON) —
// stockée dans la collection "fiches", un fichier hébergé sur Cloudinary par doc.
type FicheDoc = {
  id: string;
  userId: string;
  nom: string;
  systeme?: string;
  fileUrl: string;
  fileType: "pdf" | "image" | "json" | "autre";
  updatedAt?: Timestamp;
};

function fileTypeFromFile(file: File): FicheDoc["fileType"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  if (file.type === "application/json" || file.name.toLowerCase().endsWith(".json")) return "json";
  return "autre";
}

function formatUpdated(ts?: Timestamp) {
  if (!ts) return "à l'instant";
  try {
    return ts.toDate().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}


// ─── Composant ────────────────────────────────────────────────────────────────

export default function MonComptePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Univers de la fiche (thème)
  const [themeId, setThemeId] = useState<ThemeId>("fantasy");
  useEffect(() => {
    setThemeId(loadStoredTheme());
  }, []);
  const theme = RPG_THEMES[themeId];
  const vocab = theme.vocab;

  // Fond d'écran par univers : réglage PARTAGÉ (un seul par thème pour tout le
  // site), stocké dans settings/themeBackgrounds. Lecture ouverte à tous les
  // utilisateurs connectés, écriture réservée aux admins — à faire respecter
  // aussi côté règles Firestore (allow write: if request.auth.token.role == "admin"
  // ou équivalent selon comment le rôle admin est vérifié chez toi).
  const [sharedBackgrounds, setSharedBackgrounds] = useState<Partial<Record<ThemeId, string>>>({});
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "themeBackgrounds"), (snap) => {
      if (snap.exists()) setSharedBackgrounds(snap.data() as Partial<Record<ThemeId, string>>);
    });
    return () => unsub();
  }, []);
  const bgImage = sharedBackgrounds[themeId] || theme.bgImg;

  function handleChangeTheme(id: ThemeId) {
    setThemeId(id);
    storeTheme(id);
    if (user) {
      updateDoc(doc(db, "users", user.uid), { ficheTheme: id }).catch(() => {});
    }
  }

  // Upload du fond partagé (admin uniquement — le bouton lui-même n'est rendu
  // que si isAdmin, mais on protège aussi ici par sécurité)
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [bgUploadPct, setBgUploadPct] = useState<number | null>(null);

  async function handleBgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user || !isAdmin) return;

    setBgUploadPct(0);
    try {
      const url = await uploadToCloudinary(file, setBgUploadPct);
      await setDoc(doc(db, "settings", "themeBackgrounds"), { [themeId]: url }, { merge: true });
    } catch (err: any) {
      alert("Erreur lors de l'upload du fond : " + (err.message || "inconnue"));
    } finally {
      setBgUploadPct(null);
      if (bgInputRef.current) bgInputRef.current.value = "";
    }
  }

  async function handleResetBg() {
    if (!user || !isAdmin) return;
    try {
      await updateDoc(doc(db, "settings", "themeBackgrounds"), {
        [themeId]: deleteField(),
      });
    } catch (err: any) {
      alert("Erreur lors de la réinitialisation du fond : " + (err.message || "inconnue"));
    }
  }

  // Photo de profil
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploadPct, setAvatarUploadPct] = useState<number | null>(null);

  // Inscriptions (joueur)
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loadingInsc, setLoadingInsc] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  // Cache des infos d'événement (photo, date, heure, MJ) pour habiller les
  // cartes d'inscriptions, puisque le document "inscriptions" ne stocke que
  // eventId / eventTitle / categorie.
  const [eventInfo, setEventInfo] = useState<Record<string, EventInfo>>({});

  // Événements (MJ)
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loadingEvts, setLoadingEvts] = useState(true);
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Record<string, ParticipantInscription[]>>({});
  const [loadingParticipants, setLoadingParticipants] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Fiches de personnage (upload)
  const [fiches, setFiches] = useState<FicheDoc[]>([]);
  const [loadingFiches, setLoadingFiches] = useState(true);
  const [ficheUploadPct, setFicheUploadPct] = useState<number | null>(null);
  const [ficheUploadMsg, setFicheUploadMsg] = useState<string | null>(null);
  const [removingFicheId, setRemovingFicheId] = useState<string | null>(null);

  // Onglets + compteur de messages non lus
  const [activeTab, setActiveTab] = useState<TabKey>("apercu");
  const [unreadCount, setUnreadCount] = useState(0);

  const isMJ = profile?.role === "mj" || profile?.role === "admin";
  const isAdmin = profile?.role === "admin";
  const isOfficer = !!profile?.poste;
  const isDebutant = profile?.niveau === "debutant";

  // ── Auth + profil ─────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        window.location.href = "/login?redirect=/mon-compte";
        return;
      }
      setUser(u);
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) {
        const data = snap.data();
        setProfile({
          prenom: data.prenom,
          nom: data.nom,
          pseudo: data.pseudo,
          email: u.email || "",
          role: data.role || "joueur",
          niveau: data.niveau,
          poste: data.poste,
          telephone: data.telephone,
          emailVisible: data.emailVisible ?? false,
          telephoneVisible: data.telephoneVisible ?? false,
          avatarUrl: data.avatarUrl,
          ficheTheme: data.ficheTheme,
        });
        // Le thème enregistré sur le profil prime sur le localStorage,
        // pour retrouver son univers sur un autre appareil.
        if (data.ficheTheme && THEME_ORDER.includes(data.ficheTheme)) {
          setThemeId(data.ficheTheme);
          storeTheme(data.ficheTheme);
        }
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  // ── Inscriptions du joueur ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "inscriptions"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setInscriptions(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Inscription[]);
      setLoadingInsc(false);
    });
    return () => unsub();
  }, [user]);

  // ── Détails des événements liés aux inscriptions (photo, date, MJ) ────────
  useEffect(() => {
    const missing = Array.from(new Set(inscriptions.map((i) => i.eventId))).filter(
      (id) => id && !(id in eventInfo)
    );
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      const entries: Record<string, EventInfo> = {};
      for (const eventId of missing) {
        try {
          const snap = await getDoc(doc(db, "evenements", eventId));
          if (snap.exists()) {
            const d = snap.data() as any;
            entries[eventId] = {
              date: d.date,
              heure: d.heure,
              mjNom: d.mjNom || d.mjPseudo,
              photoUrl: eventPhotoUrl(d, d.categorie),
              places: d.places,
              inscrits: d.inscrits,
            };
          } else {
            entries[eventId] = {};
          }
        } catch {
          entries[eventId] = {};
        }
      }
      if (!cancelled) setEventInfo((prev) => ({ ...prev, ...entries }));
    })();

    return () => {
      cancelled = true;
    };
  }, [inscriptions, eventInfo]);

  // ── Événements créés (si MJ) ───────────────────────────────────────────────
  useEffect(() => {
    if (!user || !isMJ) {
      setLoadingEvts(false);
      return;
    }
    const q = query(collection(db, "evenements"), where("mjId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as EventDoc[]);
      setLoadingEvts(false);
    });
    return () => unsub();
  }, [user, isMJ]);

  // ── Fiches de personnage de l'utilisateur ─────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "fiches"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as FicheDoc[];
      list.sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0));
      setFiches(list);
      setLoadingFiches(false);
    });
    return () => unsub();
  }, [user]);

  // ── Compteur de messages non lus ─────────────────────────────────────────
  useEffect(() => {
    if (!user || !isOfficer) {
      setUnreadCount(0);
      return;
    }
    const unsub = subscribeToConversations(user.uid, (convs: Conversation[]) => {
      setUnreadCount(convs.filter((c) => c.unreadBy?.includes(user.uid)).length);
    });
    return () => unsub();
  }, [user, isOfficer]);

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/";
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setAvatarUploadPct(0);
    try {
      const url = await uploadToCloudinary(file, setAvatarUploadPct);
      await updateDoc(doc(db, "users", user.uid), { avatarUrl: url });
      setProfile((prev) => (prev ? { ...prev, avatarUrl: url } : prev));
    } catch (err: any) {
      alert("Erreur lors de l'upload de la photo : " + (err.message || "inconnue"));
    } finally {
      setAvatarUploadPct(null);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function handleRemoveAvatar() {
    if (!user || !window.confirm("Retirer votre photo de profil ?")) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { avatarUrl: "" });
      setProfile((prev) => (prev ? { ...prev, avatarUrl: "" } : prev));
    } catch (err: any) {
      alert("Erreur lors de la suppression : " + (err.message || "inconnue"));
    }
  }

  async function annulerInscription(insc: Inscription) {
    if (!confirm(`${vocab.cancelLabel} votre inscription à "${insc.eventTitle}" ?`)) return;
    setCancellingId(insc.id);
    try {
      const eventRef = doc(db, "evenements", insc.eventId);
      const eventSnap = await getDoc(eventRef);
      if (eventSnap.exists()) {
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(eventRef);
          if (snap.exists()) transaction.update(eventRef, { inscrits: increment(-1) });
        });
      }
      await deleteDoc(doc(db, "inscriptions", insc.id));
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'annulation.");
    } finally {
      setCancellingId(null);
    }
  }

  async function toggleEvent(eventId: string) {
    if (openEventId === eventId) {
      setOpenEventId(null);
      return;
    }
    setOpenEventId(eventId);

    if (!participants[eventId]) {
      setLoadingParticipants(eventId);
      try {
        const q = query(collection(db, "inscriptions"), where("eventId", "==", eventId));
        const snap = await getDocs(q);
        setParticipants((prev) => ({
          ...prev,
          [eventId]: snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ParticipantInscription[],
        }));
      } catch (err) {
        console.error("Erreur chargement participants:", err);
        setParticipants((prev) => ({ ...prev, [eventId]: [] }));
      } finally {
        setLoadingParticipants(null);
      }
    }
  }

  async function retirerParticipant(eventId: string, p: ParticipantInscription) {
    if (!confirm(`${vocab.removeLabel} ${p.pseudo || p.nom} de cet événement ?`)) return;
    setRemovingId(p.id);
    try {
      const eventRef = doc(db, "evenements", eventId);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(eventRef);
        if (snap.exists()) transaction.update(eventRef, { inscrits: increment(-1) });
      });
      await deleteDoc(doc(db, "inscriptions", p.id));
      setParticipants((prev) => ({
        ...prev,
        [eventId]: (prev[eventId] || []).filter((x) => x.id !== p.id),
      }));
    } catch (err) {
      console.error(err);
      alert("Erreur lors du retrait du participant.");
    } finally {
      setRemovingId(null);
    }
  }

  async function importFicheFile(file: File) {
    if (!user) return;
    setFicheUploadPct(0);
    try {
      const fileType = fileTypeFromFile(file);
      const url = await uploadToCloudinary(file, setFicheUploadPct, fileType === "image" ? "image" : "auto");
      await addDoc(collection(db, "fiches"), {
        userId: user.uid,
        nom: file.name.replace(/\.[^.]+$/, ""),
        systeme: "Système non précisé",
        fileUrl: url,
        fileType,
        updatedAt: serverTimestamp(),
      });
      setFicheUploadMsg(`"${file.name}" importée avec succès !`);
      setTimeout(() => setFicheUploadMsg(null), 3000);
    } catch (err: any) {
      alert("Erreur lors de l'import de la fiche : " + (err.message || "inconnue"));
    } finally {
      setFicheUploadPct(null);
    }
  }

  async function retirerFiche(fiche: FicheDoc) {
    if (!confirm(`Retirer la fiche "${fiche.nom}" ?`)) return;
    setRemovingFicheId(fiche.id);
    try {
      await deleteDoc(doc(db, "fiches", fiche.id));
    } catch (err: any) {
      alert("Erreur lors de la suppression : " + (err.message || "inconnue"));
    } finally {
      setRemovingFicheId(null);
    }
  }

  // ── CSS custom properties du thème actif, injectées sur le conteneur racine ──
  const themeVars = theme.vars as CSSProperties;

  const displayName =
    profile?.prenom && profile?.nom
      ? `${profile.prenom} ${profile.nom}`
      : profile?.pseudo || "Aventurier";
  const initiales = getInitiales(displayName);

  const TABS: { key: TabKey; label: string; count?: number; show: boolean }[] = [
    { key: "apercu", label: vocab.tabApercu, show: true },
    {
      key: "inscriptions",
      label: vocab.tabInscriptions,
      count: inscriptions.length,
      show: true,
    },
    {
      key: "evenements",
      label: vocab.tabEvenements,
      count: events.length,
      show: isMJ,
    },
    {
      key: "fiches",
      label: "Mes Fiches",
      count: fiches.length,
      show: true,
    },
    {
      key: "messages",
      label: vocab.tabMessages,
      count: unreadCount || undefined,
      show: isOfficer,
    },
    { key: "profil", label: vocab.tabProfil, show: true },
  ];

  // ── Écran de chargement initial ──────────────────────────────────────────
  if (!authChecked) {
    return (
      <>
        <style>{`@import url('${FONT_IMPORT_URL}');`}</style>
        <Navigation />
        <main
          style={{
            ...themeVars,
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: tv("--font-b"),
            fontStyle: "italic",
            color: tv("--ink-p"),
            background: tv("--surface"),
          }}
        >
          {vocab.loading}
        </main>
      </>
    );
  }

  // ── Sous-composants locaux (fonctions de rendu) ───────────────────────────

  function InscriptionCard({
    insc,
    onCancel,
    cancelling,
    cancelLabel,
  }: {
    insc: Inscription;
    onCancel?: () => void;
    cancelling?: boolean;
    cancelLabel?: string;
  }) {
    const info = eventInfo[insc.eventId];
    const genre = genreFromCategorie(insc.categorie);
    const img = info?.photoUrl || EVENT_FALLBACK_IMAGES[genre];
    const complet = info?.places !== undefined && (info?.inscrits ?? 0) >= info.places;

    return (
      <div
        style={{
          borderRadius: tv("--r"),
          overflow: "hidden",
          border: `1px solid ${tv("--line")}`,
          marginBottom: "0.9rem",
          animation: "fadeUp 0.3s ease both",
        }}
      >
        <div className="insc-card-media" style={{ height: 120, overflow: "hidden", position: "relative", background: tv("--surface2") }}>
          <img
            src={img}
            alt=""
            aria-hidden
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.55,
              filter:
                genre === "cyber"
                  ? "saturate(1.5) hue-rotate(180deg)"
                  : genre === "horror"
                  ? "saturate(0.4) brightness(0.8)"
                  : genre === "scifi"
                  ? "saturate(1.2) hue-rotate(200deg)"
                  : "saturate(0.85)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(to right, rgba(0,0,0,0.85) 20%, transparent 80%), linear-gradient(to top, ${tv(
                "--surface"
              )} 0%, transparent 40%)`,
            }}
          />
          <div
            className="insc-card-text"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              maxWidth: "75%",
            }}
          >
            <div
              style={{
                fontFamily: tv("--font-l"),
                fontSize: "0.8rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: tv("--accent"),
                marginBottom: 6,
              }}
            >
              {insc.categorie}
            </div>
            <div
              style={{
                fontFamily: tv("--font-d"),
                fontSize: "clamp(1.05rem, 4vw, 1.5rem)",
                fontWeight: 700,
                color: tv("--ink"),
                lineHeight: 1.2,
                marginBottom: 4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {insc.eventTitle}
            </div>
            <div
              style={{
                fontFamily: tv("--font-b"),
                fontStyle: "italic",
                fontSize: "0.85rem",
                color: tv("--ink-f"),
              }}
            >
              {info?.date || "Date à confirmer"}
              {info?.heure ? ` à ${info.heure}` : ""}
              {info?.mjNom ? ` · MJ : ${info.mjNom}` : ""}
            </div>
          </div>
          {info?.places !== undefined && (
            <div
              className="insc-card-badge"
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                padding: "3px 9px",
                borderRadius: 999,
                background: complet
                  ? `color-mix(in srgb, ${tv("--accent2")} 15%, transparent)`
                  : `color-mix(in srgb, ${tv("--good")} 12%, transparent)`,
                border: `1px solid ${complet ? tv("--accent2") : tv("--good")}`,
                fontFamily: tv("--font-l"),
                fontSize: "0.72rem",
                whiteSpace: "nowrap",
                color: complet ? tv("--accent2") : tv("--good"),
              }}
            >
              {info.inscrits ?? 0}/{info.places}
            </div>
          )}
        </div>

        {onCancel && (
          <div
            style={{
              padding: "0.6rem 1rem",
              background: tv("--surface2"),
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={onCancel}
              disabled={cancelling}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: 3,
                border: `1px solid color-mix(in srgb, ${tv("--accent")} 35%, transparent)`,
                background: `color-mix(in srgb, ${tv("--accent")} 7%, transparent)`,
                color: tv("--accent"),
                fontFamily: tv("--font-l"),
                fontSize: "0.82rem",
                cursor: cancelling ? "not-allowed" : "pointer",
                opacity: cancelling ? 0.4 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {cancelling ? "…" : cancelLabel}
            </button>
          </div>
        )}
      </div>
    );
  }

  function DropZone({ onFile, busy }: { onFile: (file: File) => void; busy: boolean }) {
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (busy) return;
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        onClick={() => !busy && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? tv("--accent") : tv("--edge")}`,
          borderRadius: tv("--r"),
          padding: "2.25rem 1.25rem",
          textAlign: "center",
          cursor: busy ? "not-allowed" : "pointer",
          opacity: busy ? 0.6 : 1,
          background: dragging
            ? `color-mix(in srgb, ${tv("--accent")} 6%, transparent)`
            : "rgba(255,255,255,0.03)",
          transition: "all 0.2s",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.json"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
        <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>📜</div>
        <div
          style={{
            fontFamily: tv("--font-d"),
            fontSize: "0.95rem",
            color: tv("--ink"),
            marginBottom: "0.2rem",
          }}
        >
          {busy ? "Import en cours…" : "Importer une fiche de personnage"}
        </div>
        <div
          style={{
            fontFamily: tv("--font-b"),
            fontStyle: "italic",
            fontSize: "0.82rem",
            color: tv("--ink-p"),
          }}
        >
          Glisser-déposer ou cliquer · PDF, PNG, JPG, JSON
        </div>
      </div>
    );
  }

  function FicheCard({ fiche }: { fiche: FicheDoc }) {
    const icon = fiche.fileType === "pdf" ? "📄" : fiche.fileType === "json" ? "🗂️" : fiche.fileType === "image" ? "🖼️" : "📎";
    const removing = removingFicheId === fiche.id;

    return (
      <div
        className="fiche-card"
        style={{
          borderRadius: tv("--r"),
          overflow: "hidden",
          border: `1px solid ${tv("--line")}`,
          marginBottom: "0.7rem",
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          padding: "0.8rem 1rem",
          background: "rgba(255,255,255,0.03)",
          animation: "fadeUp 0.3s ease both",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            flexShrink: 0,
            borderRadius: tv("--r"),
            overflow: "hidden",
            background: tv("--surface2"),
            border: `1px solid ${tv("--edge")}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.4rem",
          }}
        >
          {fiche.fileType === "image" ? (
            <img src={fiche.fileUrl} alt={fiche.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            icon
          )}
        </div>

        <div className="fiche-card-info" style={{ flex: "1 1 160px", minWidth: 0 }}>
          <p
            style={{
              fontFamily: tv("--font-d"),
              fontWeight: 700,
              fontSize: "0.95rem",
              color: tv("--ink"),
              marginBottom: "0.1rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {fiche.nom}
          </p>
          <p
            style={{
              fontFamily: tv("--font-b"),
              fontStyle: "italic",
              fontSize: "0.8rem",
              color: tv("--ink-f"),
            }}
          >
            {fiche.systeme || "Système non précisé"} · Mis à jour {formatUpdated(fiche.updatedAt)}
          </p>
        </div>

        <div className="fiche-card-actions" style={{ display: "flex", gap: "0.5rem", flexShrink: 0, marginLeft: "auto" }}>
          <a
            href={fiche.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: 3,
              border: `1px solid color-mix(in srgb, ${tv("--accent")} 40%, transparent)`,
              background: `color-mix(in srgb, ${tv("--accent")} 12%, transparent)`,
              color: tv("--accent"),
              fontFamily: tv("--font-l"),
              fontSize: "0.8rem",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Voir la fiche
          </a>
          <button
            onClick={() => retirerFiche(fiche)}
            disabled={removing}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: 3,
              border: `1px solid color-mix(in srgb, ${tv("--accent2")} 25%, transparent)`,
              background: `color-mix(in srgb, ${tv("--accent2")} 6%, transparent)`,
              color: tv("--accent2"),
              fontFamily: tv("--font-l"),
              fontSize: "0.8rem",
              cursor: removing ? "not-allowed" : "pointer",
              opacity: removing ? 0.4 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {removing ? "…" : "Retirer"}
          </button>
        </div>
      </div>
    );
  }

  function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
      <h2
        style={{
          fontFamily: tv("--font-d"),
          fontSize: "1.05rem",
          fontWeight: 600,
          color: tv("--ink"),
          marginBottom: "0.9rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        {children}
      </h2>
    );
  }

  function CountBadge({ children }: { children: React.ReactNode }) {
    return (
      <span
        style={{
          fontFamily: tv("--font-b"),
          fontSize: "0.78rem",
          fontWeight: 600,
          color: tv("--ink-f"),
          background: "rgba(128,128,128,0.15)",
          padding: "2px 9px",
          borderRadius: 999,
        }}
      >
        {children}
      </span>
    );
  }

  function EmptyBlock({ children }: { children: React.ReactNode }) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "2.5rem 1.25rem",
          fontFamily: tv("--font-b"),
          fontStyle: "italic",
          color: tv("--ink-p"),
          background: "rgba(255,255,255,0.04)",
          border: `1px dashed ${tv("--edge")}`,
          borderRadius: tv("--r"),
        }}
      >
        {children}
      </div>
    );
  }

  function LoadingLine({ text }: { text: string }) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "2rem 1rem",
          fontFamily: tv("--font-b"),
          fontStyle: "italic",
          color: tv("--ink-p"),
          animation: "flicker 1.6s ease-in-out infinite",
        }}
      >
        {text}
      </div>
    );
  }

  function BrowseLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
      <Link
        href={href}
        style={{
          display: "inline-block",
          marginTop: "0.6rem",
          color: tv("--accent"),
          fontFamily: tv("--font-l"),
          fontSize: "0.88rem",
          textDecoration: "none",
        }}
      >
        {children}
      </Link>
    );
  }

  function statCardStyle(accent: boolean): CSSProperties {
    return {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: "0.15rem",
      textAlign: "left",
      padding: "0.9rem 1.05rem",
      borderRadius: tv("--r"),
      border: `1px solid ${accent ? tv("--accent") : tv("--edge")}`,
      background: accent
        ? `linear-gradient(135deg, color-mix(in srgb, ${tv("--accent")} 12%, transparent), transparent)`
        : "rgba(255,255,255,0.06)",
      cursor: "pointer",
      transition: "border-color 0.15s, transform 0.15s",
      animation: "fadeUp 0.3s ease both",
      width: "100%",
    };
  }

  function statCardHover(e: React.MouseEvent<HTMLButtonElement>) {
    e.currentTarget.style.borderColor = tv("--accent");
    e.currentTarget.style.transform = "translateY(-1px)";
  }

  function statCardLeave(accent: boolean) {
    return (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.borderColor = accent ? tv("--accent") : tv("--edge");
      e.currentTarget.style.transform = "none";
    };
  }



  return (
    <>
      <style>{`
        @import url('${FONT_IMPORT_URL}');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes inkSettle {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.88; }
        }
        @keyframes emberRise {
          0% { transform: translateY(0) translateX(0) scale(0.6); opacity: 0; }
          15% { opacity: 0.9; }
          100% { transform: translateY(-160px) translateX(var(--drift, 12px)) scale(1); opacity: 0; }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.9; }
        }
        @keyframes fogDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(6%, -4%) scale(1.15); }
        }
        @keyframes gridDrift {
          from { background-position: 0 0, 0 0; }
          to { background-position: 0 44px, 44px 0; }
        }
        @keyframes dashFlow {
          to { stroke-dashoffset: -60; }
        }
        @keyframes sweepDown {
          from { transform: translateY(-120%); }
          to { transform: translateY(420%); }
        }
        @keyframes bracketPulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
        @keyframes radarSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes blipPing {
          0% { transform: scale(0.4); opacity: 0.9; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes holoFlicker {
          0%, 96%, 100% { opacity: 1; transform: none; filter: none; }
          97% { opacity: 0.6; transform: translateX(1px) scaleY(1.02); filter: blur(0.4px); }
          98% { opacity: 0.85; transform: translateX(-1px); filter: none; }
        }
        @keyframes madnessPulse {
          0%, 100% { text-shadow: 0 0 8px color-mix(in srgb, var(--accent2) 45%, transparent); filter: blur(0px); }
          50% { text-shadow: 0 0 18px color-mix(in srgb, var(--accent) 55%, transparent); filter: blur(0.3px); }
        }
        @keyframes tentacleWave {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-6deg); }
        }
        @keyframes eyeBlink {
          0%, 88%, 100% { transform: scaleY(0.08); }
          92%, 96% { transform: scaleY(1); }
        }
        @keyframes glitchSlice {
          0%, 91%, 100% { transform: translate(0, 0); opacity: 0; }
          92% { transform: translate(-3px, 1px); opacity: 0.85; }
          93% { transform: translate(2px, -1px); opacity: 0.85; }
          94% { transform: translate(-2px, 0); opacity: 0.6; }
          95% { transform: translate(1px, 1px); opacity: 0; }
        }

        :focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        .cyber-grid {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.3;
          background-image:
            linear-gradient(color-mix(in srgb, var(--accent2) 45%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in srgb, var(--accent2) 45%, transparent) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 20%, black, transparent 75%);
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 20%, black, transparent 75%);
          animation: gridDrift 4s linear infinite;
        }
        .scan-sweep { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
        .scan-sweep::after {
          content: ''; position: absolute; left: 0; right: 0; height: 35%;
          background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--accent2) 22%, transparent), transparent);
          mix-blend-mode: screen; animation: sweepDown 5s linear infinite;
        }
        .ember { position: absolute; bottom: 6%; width: 4px; height: 4px; border-radius: 50%;
          background: var(--gold); box-shadow: 0 0 6px 2px var(--gold); opacity: 0;
          animation: emberRise var(--dur, 7s) ease-in infinite; }
        .star { position: absolute; border-radius: 50%; background: var(--ink);
          animation: twinkle var(--dur, 3s) ease-in-out infinite; }
        .fog-blob { position: absolute; border-radius: 50%; filter: blur(30px);
          animation: fogDrift 14s ease-in-out infinite; mix-blend-mode: screen; }
        .corner-bracket { position: absolute; width: 26px; height: 26px; border: 2px solid var(--accent2);
          opacity: 0.8; pointer-events: none; animation: bracketPulse 2.4s ease-in-out infinite;
          filter: drop-shadow(0 0 4px var(--accent2)); }
        .radar-corner { position: absolute; top: -30px; right: -30px; width: 60px; height: 60px; border-radius: 50%;
          border: 1px solid var(--line); overflow: hidden; pointer-events: none;
          background: radial-gradient(circle, transparent 60%, color-mix(in srgb, var(--accent2) 8%, transparent) 100%); }
        .radar-corner::before {
          content: ''; position: absolute; inset: 0;
          background: conic-gradient(from 0deg, transparent 0deg, color-mix(in srgb, var(--accent2) 55%, transparent) 26deg, transparent 55deg);
          animation: radarSpin 3s linear infinite;
        }
        .radar-blip { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: var(--accent2);
          animation: blipPing 2.4s ease-out infinite; }
        .manuscript-corner path { stroke: var(--gold); stroke-width: 1.4; fill: none; }
        .manuscript-corner circle { fill: var(--gold); }
        .crack-corner { animation: bracketPulse 3.6s ease-in-out infinite; }
        .crack-corner path { stroke: var(--accent); stroke-width: 1; fill: none; }
        .tentacle-corner path { fill: none; stroke: var(--accent2); stroke-width: 2; filter: drop-shadow(0 0 4px var(--accent2)); }
        .eldritch-eye .lid { fill: var(--surface2); }
        .eldritch-eye .iris { fill: var(--accent); transform-origin: center; animation: eyeBlink 7s ease-in-out infinite; }
        .eldritch-eye .outline { fill: none; stroke: var(--ink-p); stroke-width: 1; }
        .circuit-layer path { fill: none; stroke: var(--accent2); stroke-width: 1; stroke-dasharray: 5 9;
          filter: drop-shadow(0 0 3px var(--accent2)); animation: dashFlow 2.6s linear infinite; }
        .circuit-layer circle { fill: var(--accent); filter: drop-shadow(0 0 4px var(--accent)); }

        .glitch-name { position: relative; text-shadow: 0 0 10px color-mix(in srgb, var(--accent2) 55%, transparent); }
        .glitch-name::before, .glitch-name::after {
          content: attr(data-text); position: absolute; inset: 0; pointer-events: none;
        }
        .glitch-name::before {
          color: var(--accent2); clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
          animation: glitchSlice 6s infinite;
        }
        .glitch-name::after {
          color: var(--accent); clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%);
          animation: glitchSlice 6s infinite reverse; animation-delay: 0.12s;
        }
        .holo-name { text-shadow: 0 0 12px color-mix(in srgb, var(--accent2) 50%, transparent); animation: holoFlicker 5s ease-in-out infinite; }
        .madness-name { animation: madnessPulse 4s ease-in-out infinite; }

        /* ── Responsive : mobile & tablette ─────────────────────────────── */

        .account-card {
          padding: clamp(1.25rem, 4vw, 3rem) clamp(1rem, 5vw, 3.25rem) clamp(1.5rem, 4vw, 3.25rem);
        }

        .account-header-row {
          display: flex;
          align-items: flex-start;
          gap: 1.4rem;
          flex-wrap: wrap;
        }

        .account-logout-btn {
          margin-left: auto;
        }

        .stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 0.65rem;
        }

        .universe-picker {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .tabs-bar {
          display: flex;
          gap: 2px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
        }

        @media (max-width: 640px) {
          main.account-main {
            padding: 5.5rem 0.6rem 3rem !important;
          }
          .account-header-row {
            gap: 1rem;
          }
          .account-logout-btn {
            margin-left: 0;
            width: 100%;
            text-align: center;
          }
          .account-identity {
            min-width: 0 !important;
            flex: 1 1 100%;
          }
          .insc-card-media {
            height: 150px !important;
          }
          .insc-card-text {
            max-width: 68% !important;
            padding: 12px 14px !important;
          }
          .insc-card-badge {
            top: 8px !important;
            right: 8px !important;
          }
          .fiche-card-actions {
            width: 100%;
            margin-left: 0 !important;
            justify-content: flex-start;
          }
          .fiche-card-info {
            flex-basis: 100% !important;
          }
          .radar-corner,
          .manuscript-corner,
          .tentacle-corner,
          .eldritch-eye,
          .corner-bracket,
          .crack-corner {
            transform: scale(0.7);
          }
        }

        @media (max-width: 400px) {
          .stat-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .universe-picker {
            justify-content: center;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
          }
        }
      `}</style>

      <Navigation />

      <main
        className="account-main"
        style={{
          ...themeVars,
          position: "relative",
          minHeight: "100vh",
          overflow: "hidden",
          fontFamily: tv("--font-b"),
          color: tv("--ink"),
          padding: "6rem 1rem 4rem",
          background: `linear-gradient(160deg, ${tv("--surface")} 0%, ${tv("--bg")} 100%)`,
        }}
      >
        {/* Fond décoratif */}
        <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
          <img
            src={bgImage}
            alt=""
            aria-hidden
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.22,
              filter:
                themeId === "cyberpunk"
                  ? "saturate(1.4) hue-rotate(200deg)"
                  : themeId === "scifi"
                  ? "saturate(1.2) hue-rotate(220deg)"
                  : "saturate(0.6)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in srgb, var(--accent) 10%, transparent) 0%, transparent 60%), linear-gradient(180deg, transparent 0%, ${tv(
                "--bg"
              )} 75%)`,
            }}
          />

          {themeId === "cyberpunk" && <div className="cyber-grid" />}

          {themeId === "fantasy" && (
            <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
              {EMBER_SEEDS.map((s, i) => (
                <span
                  key={i}
                  className="ember"
                  style={
                    {
                      left: `${s.left}%`,
                      animationDelay: `${s.delay}s`,
                      "--dur": `${s.duration}s`,
                      "--drift": `${s.drift}px`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}

          {themeId === "scifi" && (
            <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
              {STAR_SEEDS.map((s, i) => (
                <span
                  key={i}
                  className="star"
                  style={
                    {
                      top: `${s.top}%`,
                      left: `${s.left}%`,
                      width: s.size,
                      height: s.size,
                      animationDelay: `${s.delay}s`,
                      "--dur": `${s.duration}s`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}

          {themeId === "horror" && (
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", mixBlendMode: "screen" }}>
              <div
                className="fog-blob"
                style={{ top: "10%", left: "5%", width: 280, height: 280, background: `radial-gradient(circle, color-mix(in srgb, ${tv("--accent2")} 22%, transparent), transparent 70%)` }}
              />
              <div
                className="fog-blob"
                style={{ top: "55%", left: "60%", width: 320, height: 320, animationDelay: "4s", background: `radial-gradient(circle, color-mix(in srgb, ${tv("--accent")} 22%, transparent), transparent 70%)` }}
              />
              <div
                className="fog-blob"
                style={{ top: "30%", left: "75%", width: 220, height: 220, animationDelay: "8s", background: `radial-gradient(circle, color-mix(in srgb, ${tv("--accent2")} 22%, transparent), transparent 70%)` }}
              />
            </div>
          )}
        </div>

        {/* Fiche */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 920, margin: "0 auto" }}>
          <div
            className="account-card"
            style={{
              position: "relative",
              background: tv("--surface"),
              border: `1px solid ${tv("--edge")}`,
              borderTop: `2px solid ${tv("--accent")}`,
              borderRadius: tv("--r"),
              boxShadow: "0 8px 60px rgba(0,0,0,0.6)",
              backdropFilter: "blur(10px)",
              overflow: "hidden",
            }}
          >
            {themeId === "cyberpunk" && (
              <>
                <span className="corner-bracket" style={{ top: -10, left: -10, borderRight: "none", borderBottom: "none" }} />
                <span className="corner-bracket" style={{ top: -10, right: -10, borderLeft: "none", borderBottom: "none" }} />
                <span className="corner-bracket" style={{ bottom: -10, left: -10, borderRight: "none", borderTop: "none" }} />
                <span className="corner-bracket" style={{ bottom: -10, right: -10, borderLeft: "none", borderTop: "none" }} />
              </>
            )}

            {themeId === "fantasy" && (
              <>
                <svg className="manuscript-corner" viewBox="0 0 40 40" style={{ position: "absolute", width: 40, height: 40, top: -8, left: -8, opacity: 0.7, pointerEvents: "none" }}>
                  <path d="M2 30 Q2 2 30 2" /><circle cx="30" cy="2" r="2" />
                </svg>
                <svg className="manuscript-corner" viewBox="0 0 40 40" style={{ position: "absolute", width: 40, height: 40, top: -8, right: -8, opacity: 0.7, pointerEvents: "none", transform: "scaleX(-1)" }}>
                  <path d="M2 30 Q2 2 30 2" /><circle cx="30" cy="2" r="2" />
                </svg>
                <svg className="manuscript-corner" viewBox="0 0 40 40" style={{ position: "absolute", width: 40, height: 40, bottom: -8, left: -8, opacity: 0.7, pointerEvents: "none", transform: "scaleY(-1)" }}>
                  <path d="M2 30 Q2 2 30 2" /><circle cx="30" cy="2" r="2" />
                </svg>
                <svg className="manuscript-corner" viewBox="0 0 40 40" style={{ position: "absolute", width: 40, height: 40, bottom: -8, right: -8, opacity: 0.7, pointerEvents: "none", transform: "scale(-1,-1)" }}>
                  <path d="M2 30 Q2 2 30 2" /><circle cx="30" cy="2" r="2" />
                </svg>
              </>
            )}

            {themeId === "scifi" && (
              <div className="radar-corner">
                <span className="radar-blip" style={{ top: "30%", left: "40%" }} />
                <span className="radar-blip" style={{ top: "60%", left: "65%", animationDelay: "1.1s" }} />
              </div>
            )}

            {themeId === "horror" && (
              <>
                <svg className="crack-corner" viewBox="0 0 44 44" style={{ position: "absolute", width: 44, height: 44, top: -6, left: -6, opacity: 0.65, pointerEvents: "none" }}>
                  <path d="M0 12 L14 16 L10 26 L22 24 L18 40" />
                </svg>
                <svg className="crack-corner" viewBox="0 0 44 44" style={{ position: "absolute", width: 44, height: 44, bottom: -6, right: -6, opacity: 0.65, pointerEvents: "none", transform: "scale(-1,-1)" }}>
                  <path d="M0 12 L14 16 L10 26 L22 24 L18 40" />
                </svg>
                <svg
                  className="tentacle-corner"
                  viewBox="0 0 220 220"
                  style={{ position: "absolute", bottom: "-6%", right: "-4%", width: 220, height: 220, opacity: 0.5, pointerEvents: "none", transformOrigin: "80% 90%", animation: "tentacleWave 6s ease-in-out infinite" }}
                >
                  <path d="M210 210 C 160 210 150 160 120 150 C 90 140 100 100 70 90 C 50 82 40 60 46 40" />
                  <path d="M210 210 C 180 190 190 150 165 130 C 145 114 150 90 130 78" />
                </svg>
                <svg className="eldritch-eye" viewBox="0 0 46 46" style={{ position: "absolute", top: "8%", left: "6%", width: 46, height: 46, opacity: 0.6, pointerEvents: "none" }}>
                  <ellipse className="lid" cx="23" cy="23" rx="20" ry="12" />
                  <ellipse className="outline" cx="23" cy="23" rx="20" ry="12" />
                  <circle className="iris" cx="23" cy="23" r="7" />
                </svg>
              </>
            )}

            {/* Sélecteur d'univers */}
            <div className="universe-picker" style={{ marginBottom: "1.1rem" }}>
              {THEME_ORDER.map((id) => (
                <button
                  key={id}
                  type="button"
                  title={RPG_THEMES[id].label}
                  aria-label={`Univers : ${RPG_THEMES[id].label}`}
                  aria-pressed={id === themeId}
                  onClick={() => handleChangeTheme(id)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    cursor: "pointer",
                    flexShrink: 0,
                    border: `2px solid ${id === themeId ? tv("--accent") : tv("--line")}`,
                    background:
                      id === themeId
                        ? "color-mix(in srgb, var(--accent) 18%, transparent)"
                        : "rgba(255,255,255,0.08)",
                    boxShadow:
                      id === themeId
                        ? "0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent)"
                        : "none",
                    color: tv("--ink"),
                    transition: "transform 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  {RPG_THEMES[id].seal}
                </button>
              ))}
            </div>

            {isAdmin && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                  gap: "0.6rem",
                  marginBottom: "1.1rem",
                  marginTop: "-0.4rem",
                }}
              >
                <input
                  ref={bgInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleBgChange}
                />
                <button
                  type="button"
                  onClick={() => bgInputRef.current?.click()}
                  disabled={bgUploadPct !== null}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: tv("--ink-p"),
                    fontFamily: tv("--font-l"),
                    fontSize: "0.72rem",
                    cursor: bgUploadPct !== null ? "not-allowed" : "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {bgUploadPct !== null
                    ? `Envoi… ${bgUploadPct}%`
                    : `🖼️ Changer le fond « ${theme.label} »`}
                </button>
                {sharedBackgrounds[themeId] && (
                  <button
                    type="button"
                    onClick={handleResetBg}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: tv("--ink-p"),
                      fontFamily: tv("--font-l"),
                      fontSize: "0.72rem",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            )}

            {/* En-tête : fiche de personnage */}
            <p
              style={{
                fontFamily: tv("--font-l"),
                fontSize: "0.75rem",
                letterSpacing: "0.22em",
                color: tv("--ink-p"),
                marginBottom: "0.5rem",
              }}
            >
              {vocab.eyebrow}
            </p>

            <div
              className="account-header-row"
              style={{
                marginBottom: "1.5rem",
                paddingBottom: "1.4rem",
                borderBottom: `1px solid ${tv("--line")}`,
              }}
            >
              {/* Portrait */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <label
                  htmlFor="avatar-upload"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 96,
                    height: 96,
                    borderRadius: tv("--r"),
                    overflow: "hidden",
                    background: profile?.avatarUrl
                      ? "transparent"
                      : `linear-gradient(150deg, ${tv("--surface2")}, ${tv("--edge")})`,
                    border: `3px double ${tv("--ink-f")}`,
                    boxShadow: "0 3px 8px rgba(0,0,0,0.35), inset 0 0 0 3px rgba(255,255,255,0.15)",
                    cursor: "pointer",
                    position: "relative",
                    animation: "inkSettle 0.4s ease both",
                  }}
                >
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={displayName}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <span
                      style={{
                        fontFamily: tv("--font-d"),
                        fontSize: "1.8rem",
                        fontWeight: 700,
                        color: tv("--ink-f"),
                      }}
                    >
                      {initiales}
                    </span>
                  )}
                  <input
                    id="avatar-upload"
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleAvatarChange}
                  />
                </label>

                <div
                  style={{
                    position: "absolute",
                    bottom: -8,
                    right: -8,
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    color: tv("--surface"),
                    background: isMJ
                      ? `radial-gradient(circle at 32% 28%, ${tv("--accent2")}, ${shade("--accent2")} 72%)`
                      : `radial-gradient(circle at 32% 28%, ${tv("--accent")}, ${shade("--accent")} 72%)`,
                    boxShadow:
                      "0 2px 5px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -3px 5px rgba(0,0,0,0.35)",
                    border: "2px solid rgba(0,0,0,0.15)",
                  }}
                >
                  {isMJ ? vocab.roleIconMJ : vocab.roleIconJoueur}
                </div>

                {avatarUploadPct !== null && (
                  <div style={{ width: 96, marginTop: "0.4rem" }}>
                    <div
                      style={{
                        height: 4,
                        borderRadius: 999,
                        background: "rgba(128,128,128,0.2)",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: `${avatarUploadPct}%`,
                          background: tv("--accent"),
                          transition: "width 150ms",
                        }}
                      />
                    </div>
                  </div>
                )}

                {profile?.avatarUrl && avatarUploadPct === null && (
                  <button
                    onClick={handleRemoveAvatar}
                    style={{
                      display: "block",
                      marginTop: "0.35rem",
                      width: 96,
                      background: "none",
                      border: "none",
                      fontFamily: tv("--font-l"),
                      fontSize: "0.68rem",
                      color: tv("--ink-p"),
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    Retirer la photo
                  </button>
                )}
              </div>

              {/* Identité */}
              <div className="account-identity" style={{ flex: 1, minWidth: 220 }}>
                <h1
                  data-text={displayName}
                  className={
                    themeId === "cyberpunk"
                      ? "glitch-name"
                      : themeId === "scifi"
                      ? "holo-name"
                      : themeId === "horror"
                      ? "madness-name"
                      : undefined
                  }
                  style={{
                    fontFamily: tv("--font-d"),
                    fontSize: "clamp(1.3rem, 4vw, 1.75rem)",
                    fontWeight: 700,
                    color: tv("--ink"),
                    letterSpacing: "0.02em",
                    marginBottom: "0.2rem",
                    lineHeight: 1.2,
                    overflowWrap: "anywhere",
                  }}
                >
                  {displayName}
                </h1>

                <p
                  style={{
                    fontFamily: tv("--font-b"),
                    fontStyle: "italic",
                    fontSize: "0.88rem",
                    color: tv("--ink-f"),
                    marginBottom: "0.7rem",
                    overflowWrap: "anywhere",
                  }}
                >
                  {profile?.email}
                </p>

                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  {[
                    {
                      label: vocab.classLabel,
                      val: isMJ ? vocab.classMJ : vocab.classJoueur,
                      tone: isMJ ? tv("--accent2") : tv("--accent"),
                      toneDark: isMJ ? shade("--accent2") : shade("--accent"),
                    },
                    ...(profile?.niveau
                      ? [
                          {
                            label: vocab.niveauLabel,
                            val: vocab.niveauValues[profile.niveau],
                            tone: tv("--good"),
                            toneDark: tv("--good"),
                          },
                        ]
                      : []),
                    ...(profile?.poste
                      ? [
                          {
                            label: vocab.posteLabel,
                            val: vocab.posteValues[profile.poste],
                            tone: tv("--gold"),
                            toneDark: tv("--gold"),
                          },
                        ]
                      : []),
                  ].map((badge) => (
                    <div
                      key={badge.label}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        minWidth: 84,
                        padding: "0.4rem 0.7rem",
                        borderRadius: tv("--r"),
                        border: `1px solid color-mix(in srgb, ${badge.tone} 45%, transparent)`,
                        borderTop: `2px solid ${badge.toneDark}`,
                        background: `color-mix(in srgb, ${badge.tone} 10%, transparent)`,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: tv("--font-l"),
                          fontSize: "0.62rem",
                          letterSpacing: "0.1em",
                          color: tv("--ink-f"),
                        }}
                      >
                        {badge.label}
                      </span>
                      <span
                        style={{
                          fontFamily: tv("--font-b"),
                          fontSize: "0.88rem",
                          fontWeight: 700,
                          color: tv("--ink"),
                          whiteSpace: "nowrap",
                        }}
                      >
                        {badge.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="account-logout-btn"
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: tv("--r"),
                  border: `1px solid ${tv("--edge")}`,
                  background: "rgba(255,255,255,0.1)",
                  color: tv("--ink-f"),
                  fontFamily: tv("--font-l"),
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  alignSelf: "flex-start",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.2)";
                  e.currentTarget.style.color = tv("--ink");
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.color = tv("--ink-f");
                }}
              >
                {vocab.logout}
              </button>
            </div>

            {/* Cartes de résumé */}
            <div className="stat-grid" style={{ marginBottom: "1.6rem" }}>
              <button
                onClick={() => setActiveTab("inscriptions")}
                style={statCardStyle(false)}
                onMouseEnter={statCardHover}
                onMouseLeave={statCardLeave(false)}
              >
                <span style={statValueStyle}>{loadingInsc ? "…" : inscriptions.length}</span>
                <span style={statLabelStyle}>{vocab.tabInscriptions}</span>
              </button>

              {isMJ && (
                <button
                  onClick={() => setActiveTab("evenements")}
                  style={statCardStyle(false)}
                  onMouseEnter={statCardHover}
                  onMouseLeave={statCardLeave(false)}
                >
                  <span style={statValueStyle}>{loadingEvts ? "…" : events.length}</span>
                  <span style={statLabelStyle}>{vocab.tabEvenements}</span>
                </button>
              )}

              {isOfficer && (
                <button
                  onClick={() => setActiveTab("messages")}
                  style={statCardStyle(unreadCount > 0)}
                  onMouseEnter={statCardHover}
                  onMouseLeave={statCardLeave(unreadCount > 0)}
                >
                  <span style={statValueStyle}>{unreadCount}</span>
                  <span style={statLabelStyle}>{vocab.tabMessages}</span>
                </button>
              )}

              {!profile?.niveau && (
                <button
                  onClick={() => setActiveTab("profil")}
                  style={statCardStyle(true)}
                  onMouseEnter={statCardHover}
                  onMouseLeave={statCardLeave(true)}
                >
                  <span style={statValueStyle}>!</span>
                  <span style={statLabelStyle}>Compléter mon profil</span>
                </button>
              )}
            </div>

            {/* Onglets */}
            <div
              className="tabs-bar"
              style={{
                marginBottom: "1.6rem",
                borderBottom: `1px solid ${tv("--edge")}`,
              }}
            >
              {TABS.filter((t) => t.show).map((t) => {
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    style={{
                      flexShrink: 0,
                      padding: "0.6rem 0.9rem",
                      background: active ? "rgba(255,255,255,0.12)" : "transparent",
                      border: "none",
                      borderBottom: `2px solid ${active ? tv("--accent") : "transparent"}`,
                      color: active ? tv("--ink") : tv("--ink-p"),
                      fontFamily: tv("--font-l"),
                      fontSize: "0.92rem",
                      letterSpacing: "0.02em",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      whiteSpace: "nowrap",
                      marginBottom: -1,
                      borderRadius: `${tv("--r")} ${tv("--r")} 0 0`,
                    }}
                  >
                    {t.label}
                    {t.count !== undefined && (
                      <span
                        style={{
                          fontFamily: tv("--font-b"),
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          background: tv("--accent"),
                          color: tv("--surface"),
                          padding: "1px 7px",
                          borderRadius: 999,
                        }}
                      >
                        {t.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Aperçu ── */}
            {activeTab === "apercu" && (
              <div>
                <SectionTitle>{vocab.sectionInscriptions}</SectionTitle>
                {loadingInsc ? (
                  <LoadingLine text="Chargement…" />
                ) : inscriptions.length === 0 ? (
                  <EmptyBlock>
                    {vocab.emptyInscriptions}
                    <br />
                    <BrowseLink href="/#events">{vocab.browseCta}</BrowseLink>
                  </EmptyBlock>
                ) : (
                  inscriptions
                    .slice(0, 3)
                    .map((insc) => (
                      <InscriptionCard key={insc.id} insc={insc} />
                    ))
                )}
                {inscriptions.length > 3 && (
                  <button
                    onClick={() => setActiveTab("inscriptions")}
                    style={{
                      background: "none",
                      border: "none",
                      color: tv("--accent"),
                      fontFamily: tv("--font-l"),
                      fontSize: "0.88rem",
                      cursor: "pointer",
                      padding: 0,
                      marginTop: "0.6rem",
                    }}
                  >
                    Voir toutes mes inscriptions ({inscriptions.length}) →
                  </button>
                )}

                {isMJ && (
                  <>
                    <div style={{ borderTop: `1px solid ${tv("--line")}`, margin: "1.5rem 0" }} />
                    <SectionTitle>Mes Tables</SectionTitle>
                    {loadingEvts ? (
                      <LoadingLine text="Chargement…" />
                    ) : events.length === 0 ? (
                      <EmptyBlock>
                        {vocab.emptyEvenements}
                        <br />
                        <BrowseLink href="/proposer-evenement">➕ Proposer un événement</BrowseLink>
                      </EmptyBlock>
                    ) : (
                      events.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          onClick={() => setActiveTab("evenements")}
                          style={{
                            marginBottom: "0.7rem",
                            borderRadius: tv("--r"),
                            overflow: "hidden",
                            border: `1px solid ${tv("--line")}`,
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ height: 80, overflow: "hidden", position: "relative", background: tv("--surface2") }}>
                            <img
                              src={eventPhotoUrl(event, event.categorie)}
                              alt=""
                              aria-hidden
                              style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                background: `linear-gradient(to right, ${tv("--surface")} 25%, transparent)`,
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                padding: "0.7rem 1rem",
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p
                                  style={{
                                    fontFamily: tv("--font-d"),
                                    fontSize: "0.95rem",
                                    fontWeight: 700,
                                    color: tv("--ink"),
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {event.titre}
                                </p>
                                <p
                                  style={{
                                    fontFamily: tv("--font-b"),
                                    fontStyle: "italic",
                                    fontSize: "0.78rem",
                                    color: tv("--ink-f"),
                                  }}
                                >
                                  {event.date} · {event.heure}
                                </p>
                              </div>
                              <span
                                style={{
                                  fontFamily: tv("--font-b"),
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  color: shade("--accent2"),
                                  background: `color-mix(in srgb, ${tv("--accent2")} 15%, transparent)`,
                                  padding: "2px 9px",
                                  borderRadius: 999,
                                  flexShrink: 0,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {event.inscrits ?? 0}/{event.places}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    {events.length > 2 && (
                      <button
                        onClick={() => setActiveTab("evenements")}
                        style={{
                          background: "none",
                          border: "none",
                          color: tv("--accent"),
                          fontFamily: tv("--font-l"),
                          fontSize: "0.88rem",
                          cursor: "pointer",
                          padding: 0,
                          marginTop: "0.6rem",
                        }}
                      >
                        Voir toutes mes tables ({events.length}) →
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Inscriptions ── */}
            {activeTab === "inscriptions" && (
              <div>
                <SectionTitle>
                  {vocab.sectionInscriptions}
                  {!loadingInsc && <CountBadge>{inscriptions.length}</CountBadge>}
                </SectionTitle>

                {loadingInsc ? (
                  <LoadingLine text="Chargement…" />
                ) : inscriptions.length === 0 ? (
                  <EmptyBlock>
                    {vocab.emptyInscriptions}
                    <br />
                    <BrowseLink href="/#events">{vocab.browseCta}</BrowseLink>
                  </EmptyBlock>
                ) : (
                  inscriptions.map((insc) => (
                    <InscriptionCard
                      key={insc.id}
                      insc={insc}
                      onCancel={() => annulerInscription(insc)}
                      cancelling={cancellingId === insc.id}
                      cancelLabel={vocab.cancelLabel}
                    />
                  ))
                )}
              </div>
            )}

            {/* ── Mes événements (MJ) ── */}
            {activeTab === "evenements" && isMJ && (
              <div>
                <SectionTitle>
                  {vocab.sectionEvenements}
                  {!loadingEvts && <CountBadge>{events.length}</CountBadge>}
                </SectionTitle>

                {loadingEvts ? (
                  <LoadingLine text="Chargement…" />
                ) : events.length === 0 ? (
                  <EmptyBlock>
                    {vocab.emptyEvenements}
                    <br />
                    <BrowseLink href="/proposer-evenement">➕ Proposer un événement</BrowseLink>
                  </EmptyBlock>
                ) : (
                  events.map((event) => {
                    const isOpen = openEventId === event.id;
                    const list = participants[event.id] || [];

                    return (
                      <div
                        key={event.id}
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: `1px solid ${tv("--line")}`,
                          borderRadius: tv("--r"),
                          marginBottom: "0.9rem",
                          overflow: "hidden",
                        }}
                      >
                        <div style={{ height: 90, overflow: "hidden", position: "relative", background: tv("--surface2") }}>
                          <img
                            src={eventPhotoUrl(event, event.categorie)}
                            alt=""
                            aria-hidden
                            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: `linear-gradient(to right, ${tv("--surface")} 25%, transparent)`,
                            }}
                          />
                        </div>

                        <button
                          onClick={() => toggleEvent(event.id)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "1rem",
                            padding: "0.9rem 1.2rem",
                            background: `linear-gradient(135deg, color-mix(in srgb, ${tv(
                              "--accent2"
                            )} 14%, transparent), transparent)`,
                            border: "none",
                            cursor: "pointer",
                            textAlign: "left",
                            color: tv("--ink"),
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                fontFamily: tv("--font-b"),
                                fontWeight: 600,
                                fontSize: "0.98rem",
                                color: tv("--ink"),
                                marginBottom: "0.2rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {event.titre}
                            </p>
                            <p
                              style={{
                                fontFamily: tv("--font-b"),
                                fontStyle: "italic",
                                fontSize: "0.85rem",
                                color: tv("--ink-f"),
                              }}
                            >
                              {event.date} · {event.heure}
                            </p>
                          </div>
                          <span
                            style={{
                              fontFamily: tv("--font-b"),
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              color: shade("--accent2"),
                              background: `color-mix(in srgb, ${tv("--accent2")} 15%, transparent)`,
                              padding: "3px 10px",
                              borderRadius: 999,
                              flexShrink: 0,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {event.inscrits ?? 0}/{event.places} inscrits
                          </span>
                          <span
                            style={{
                              fontSize: "0.95rem",
                              color: tv("--ink-f"),
                              transform: isOpen ? "rotate(180deg)" : "none",
                              transition: "transform 0.2s",
                              flexShrink: 0,
                            }}
                          >
                            ▾
                          </span>
                        </button>

                        {isOpen && (
                          <div style={{ padding: "0.4rem 1.2rem 1rem" }}>
                            {loadingParticipants === event.id && (
                              <p
                                style={{
                                  fontFamily: tv("--font-b"),
                                  fontStyle: "italic",
                                  fontSize: "0.86rem",
                                  color: tv("--ink-p"),
                                  padding: "0.6rem 0",
                                }}
                              >
                                Chargement des inscrits…
                              </p>
                            )}
                            {loadingParticipants !== event.id && list.length === 0 && (
                              <p
                                style={{
                                  fontFamily: tv("--font-b"),
                                  fontStyle: "italic",
                                  fontSize: "0.86rem",
                                  color: tv("--ink-p"),
                                  padding: "0.6rem 0",
                                }}
                              >
                                Aucun inscrit pour le moment.
                              </p>
                            )}
                            {list.map((p, i) => (
                              <div
                                key={p.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: "0.75rem",
                                  padding: "0.55rem 0",
                                  borderTop: i === 0 ? "none" : `1px dashed ${tv("--line")}`,
                                }}
                              >
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <p
                                    style={{
                                      fontFamily: tv("--font-b"),
                                      fontSize: "0.88rem",
                                      fontWeight: 600,
                                      color: tv("--ink"),
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {p.pseudo || p.nom}
                                  </p>
                                  <p
                                    style={{
                                      fontFamily: tv("--font-b"),
                                      fontStyle: "italic",
                                      fontSize: "0.76rem",
                                      color: tv("--ink-f"),
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {p.email}
                                  </p>
                                </div>
                                <button
                                  onClick={() => retirerParticipant(event.id, p)}
                                  disabled={removingId === p.id}
                                  style={{
                                    padding: "0.4rem 0.7rem",
                                    borderRadius: 3,
                                    border: `1px solid color-mix(in srgb, ${tv("--accent")} 30%, transparent)`,
                                    background: `color-mix(in srgb, ${tv("--accent")} 6%, transparent)`,
                                    color: tv("--accent"),
                                    fontFamily: tv("--font-l"),
                                    fontSize: "0.76rem",
                                    cursor: removingId === p.id ? "not-allowed" : "pointer",
                                    opacity: removingId === p.id ? 0.4 : 1,
                                    whiteSpace: "nowrap",
                                    flexShrink: 0,
                                  }}
                                >
                                  {removingId === p.id ? "…" : vocab.removeLabel}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Mes Fiches ── */}
            {activeTab === "fiches" && (
              <div>
                <SectionTitle>
                  Mes Fiches de Personnage
                  {!loadingFiches && <CountBadge>{fiches.length}</CountBadge>}
                </SectionTitle>

                {ficheUploadMsg && (
                  <div
                    style={{
                      padding: "0.7rem 1.1rem",
                      background: `color-mix(in srgb, ${tv("--good")} 12%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${tv("--good")} 30%, transparent)`,
                      borderRadius: tv("--r"),
                      color: tv("--good"),
                      fontFamily: tv("--font-b"),
                      fontSize: "0.86rem",
                      marginBottom: "1rem",
                    }}
                  >
                    ✓ {ficheUploadMsg}
                  </div>
                )}

                <DropZone onFile={importFicheFile} busy={ficheUploadPct !== null} />

                {ficheUploadPct !== null && (
                  <div style={{ marginTop: "0.6rem" }}>
                    <div
                      style={{
                        height: 4,
                        borderRadius: 999,
                        background: "rgba(128,128,128,0.2)",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: `${ficheUploadPct}%`,
                          background: tv("--accent"),
                          transition: "width 150ms",
                        }}
                      />
                    </div>
                  </div>
                )}

                <div style={{ marginTop: "1.25rem" }}>
                  {loadingFiches ? (
                    <LoadingLine text="Chargement…" />
                  ) : fiches.length === 0 ? (
                    <EmptyBlock>Aucune fiche importée pour le moment.</EmptyBlock>
                  ) : (
                    fiches.map((fiche) => <FicheCard key={fiche.id} fiche={fiche} />)
                  )}
                </div>
              </div>
            )}

            {/* ── Messages (bureau) ── */}
            {activeTab === "messages" && isOfficer && user && <OfficerInbox currentUid={user.uid} />}

            {/* ── Profil ── */}
            {activeTab === "profil" && user && (
              <div>
                <SectionTitle>{vocab.sectionProfil}</SectionTitle>
                <Profileniveauselector
                  uid={user.uid}
                  currentNiveau={profile?.niveau ?? null}
                  onSaved={(niveau: NiveauChoice) =>
                    setProfile((prev) => (prev ? { ...prev, niveau } : prev))
                  }
                />

                <CoordonneesForm
                  uid={user.uid}
                  currentEmail={profile?.email}
                  currentTelephone={profile?.telephone}
                  currentEmailVisible={profile?.emailVisible}
                  currentTelephoneVisible={profile?.telephoneVisible}
                />

                {isDebutant && (
                  <div style={{ marginTop: "1rem" }}>
                    <ContactOfficers
                      currentUid={user.uid}
                      currentName={
                        profile?.pseudo ||
                        `${profile?.prenom || ""} ${profile?.nom || ""}`.trim() ||
                        "Aventurier"
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );

}

const statValueStyle: CSSProperties = {
  fontFamily: "var(--font-d)",
  fontSize: "1.8rem",
  fontWeight: 700,
  color: "var(--ink)",
  lineHeight: 1,
};

const statLabelStyle: CSSProperties = {
  fontFamily: "var(--font-b)",
  fontSize: "0.72rem",
  color: "var(--ink-f)",
  fontWeight: 600,
};