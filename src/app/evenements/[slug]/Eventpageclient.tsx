"use client";

import { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import Link from "next/link";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { createGlobalStyle } from "styled-components";
import { usePathname } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { runTransaction } from "firebase/firestore";
import Navigation from "@/components/Navigation";

import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  increment,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Styled components ────────────────────────────────────────────────────────

const Page = styled.main`
  min-height: 100vh;
  background: #0d0d14;
  color: #fff;
  font-family: 'Inter', system-ui, sans-serif;
  padding: 0 0 5rem;
`;

const Hero = styled.section`
  position: relative;
  padding: 6rem 1.5rem 3.5rem;
  text-align: center;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(120,80,255,0.18) 0%, transparent 70%);
    pointer-events: none;
  }
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 500;
  color: rgba(255,255,255,0.5);
  text-decoration: none;
  margin-bottom: 2rem;
  transition: color 150ms;
  &:hover { color: rgba(255,255,255,0.85); }
`;

const HeroIcon = styled.span`
  font-size: 3.5rem;
  display: block;
  margin-bottom: 1rem;
  animation: ${fadeUp} 0.4s ease both;
`;

const HeroTitle = styled.h1`
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 800;
  margin: 0 0 0.75rem;
  letter-spacing: -0.02em;
  animation: ${fadeUp} 0.45s ease 0.05s both;
`;

const HeroSubtitle = styled.p`
  font-size: 1rem;
  color: rgba(255,255,255,0.55);
  max-width: 520px;
  margin: 0 auto;
  line-height: 1.6;
  animation: ${fadeUp} 0.45s ease 0.1s both;
`;

const ProposeLink = styled(Link)`
  display: block;
  width: fit-content;
  margin: 0 auto 2rem;
  padding: 0.5rem 1.25rem;
  border-radius: 999px;
  border: 1px solid rgba(160,120,255,0.35);
  background: rgba(120,80,255,0.12);
  color: #c8a8ff;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  text-align: center;
  transition: all 150ms;
  &:hover {
    background: rgba(120,80,255,0.25);
    border-color: rgba(160,120,255,0.6);
  }
`;

const ProposeRow = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const FiltersRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0 1.5rem;
  margin-bottom: 2.5rem;
`;

const FilterBtn = styled.button<{ $active: boolean }>`
  padding: 0.4rem 1rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid ${p => p.$active ? "rgba(160,120,255,0.7)" : "rgba(255,255,255,0.15)"};
  background: ${p => p.$active ? "rgba(120,80,255,0.2)" : "transparent"};
  color: ${p => p.$active ? "#c8a8ff" : "rgba(255,255,255,0.5)"};
  transition: all 150ms;
  &:hover { border-color: rgba(160,120,255,0.5); color: #c8a8ff; }
`;

const Section = styled.section`
  max-width: 960px;
  margin: 0 auto;
  padding: 0 1.5rem;
`;

const SectionLabel = styled.p`
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(160,120,255,0.8);
  margin: 0 0 1rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 3rem;
  @media (max-width: 400px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.article`
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  overflow: hidden;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
  animation: ${fadeUp} 0.4s ease both;
  display: flex;
  flex-direction: column;
  &:hover {
    transform: translateY(-3px);
    background: rgba(255,255,255,0.08);
    border-color: rgba(160,120,255,0.3);
  }
  @media (hover: none) {
    &:hover { transform: none; }
  }
`;

const CardHeader = styled.div<{ $bgImage?: string }>`
  padding: 2.1rem 1.1rem 0.75rem;  /* ← padding-top augmenté pour dégager les badges */
  background: ${p =>
    p.$bgImage
      ? `linear-gradient(180deg, rgba(13,13,20,0.15) 0%, rgba(13,13,20,0.88) 100%), url(${p.$bgImage})`
      : "linear-gradient(135deg, rgba(80,60,160,0.3) 0%, rgba(40,30,80,0.1) 100%)"};
  background-size: cover;
  background-position: center;
  min-height: ${p => (p.$bgImage ? "130px" : "96px")};  /* ← min-height garanti même sans image */
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: relative;
`;

const CatBadge = styled.span`
  position: absolute;
  top: 0.6rem;
  left: 0.75rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0,0,0,0.35);
  color: rgba(255,255,255,0.75);
  backdrop-filter: blur(4px);
`;

const StatusBadge = styled.span<{ $status: "ok" | "low" | "full" }>`
  position: absolute;
  top: 0.6rem;
  right: 0.75rem;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${p =>
    p.$status === "full" ? "rgba(255,80,80,0.2)" :
    p.$status === "low"  ? "rgba(255,170,0,0.2)"  :
                           "rgba(80,200,100,0.2)"};
  border: 1px solid ${p =>
    p.$status === "full" ? "rgba(255,80,80,0.4)" :
    p.$status === "low"  ? "rgba(255,170,0,0.4)"  :
                           "rgba(80,200,100,0.35)"};
  color: ${p =>
    p.$status === "full" ? "#ff8080" :
    p.$status === "low"  ? "#ffbb44"  :
                           "#7dffb3"};
`;

const CardDate = styled.time`
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.6);
  display: block;
  margin-bottom: 0.3rem;
`;

const CardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.3;
`;

const CardBody = styled.div`
  padding: 0.85rem 1.1rem 1.1rem;
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const TagRow = styled.div`
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-bottom: 0.6rem;
`;

const Tag = styled.span`
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  border: 0.5px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.5);
`;

const CardDesc = styled.p`
  font-size: 0.83rem;
  color: rgba(255,255,255,0.55);
  margin: 0 0 0.9rem;
  line-height: 1.55;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 0.5px solid rgba(255,255,255,0.08);
  margin-top: auto;
`;

const MJRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
`;

const MJAvatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(120,80,255,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-weight: 700;
  color: #c8a8ff;
  flex-shrink: 0;
`;

const MJName = styled.span`
  font-size: 0.72rem;
  color: rgba(255,255,255,0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;
`;

const BtnGroup = styled.div`
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
`;

const DetailBtn = styled(Link)`
  padding: 0.35rem 0.7rem;
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: 7px;
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: rgba(255,255,255,0.5);
  text-decoration: none;
  transition: all 150ms;
  white-space: nowrap;
  &:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.85); }
`;

const RegisterBtn = styled.button`
  padding: 0.35rem 0.8rem;
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: 7px;
  background: rgba(120,80,255,0.2);
  border: 1px solid rgba(160,120,255,0.4);
  color: #c8a8ff;
  cursor: pointer;
  transition: background 150ms, border-color 150ms;
  white-space: nowrap;
  &:hover { background: rgba(120,80,255,0.35); border-color: rgba(160,120,255,0.7); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 1rem;
  color: rgba(255,255,255,0.35);
  font-size: 0.95rem;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 4rem 1rem;
  color: rgba(255,255,255,0.3);
  font-size: 0.9rem;
`;

// ── Modal ─────────────────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const Modal = styled.div`
  background: #1a1a2e;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  padding: 2rem;
  width: 100%;
  max-width: 440px;
  animation: ${fadeUp} 0.25s ease both;
`;

const ModalImage = styled.img`
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 10px;
  margin: 0.25rem 0 1.25rem;
  display: block;
`;

const ModalTitle = styled.h2`
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 0.4rem;
`;

const ModalSubtitle = styled.p`
  font-size: 0.85rem;
  color: rgba(255,255,255,0.5);
  margin: 0 0 1.5rem;
`;

const UserInfoBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(120,80,255,0.1);
  border: 1px solid rgba(160,120,255,0.2);
  border-radius: 10px;
  margin-bottom: 1.25rem;
`;

const UserAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(120,80,255,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
`;

const UserDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserName = styled.p`
  font-size: 0.88rem;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserEmail = styled.p`
  font-size: 0.78rem;
  color: rgba(255,255,255,0.45);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

const CancelBtn = styled.button`
  flex: 1;
  padding: 0.6rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: rgba(255,255,255,0.5);
  font-size: 0.85rem;
  cursor: pointer;
  &:hover { background: rgba(255,255,255,0.05); }
`;

const ConfirmBtn = styled.button`
  flex: 2;
  padding: 0.6rem;
  border-radius: 8px;
  border: 1px solid rgba(160,120,255,0.5);
  background: rgba(120,80,255,0.25);
  color: #c8a8ff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: rgba(120,80,255,0.4); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const SuccessMsg = styled.div`
  text-align: center;
  padding: 1rem 0;
  color: #7dffb3;
  font-size: 0.95rem;
`;

// ── Calendar ──────────────────────────────────────────────────────────────────

const CalendarGlobal = createGlobalStyle`
  .fc {
    --fc-border-color: rgba(255,255,255,0.08);
    --fc-today-bg-color: rgba(160,120,255,0.1);
    --fc-page-bg-color: transparent;
    color: rgba(255,255,255,0.85);
    font-family: inherit;
  }
  .fc-toolbar-title {
    font-size: 1rem !important;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: white;
  }
  .fc-button {
    background: rgba(255,255,255,0.07) !important;
    border: 1px solid rgba(255,255,255,0.12) !important;
    color: rgba(255,255,255,0.8) !important;
    border-radius: 8px !important;
    font-size: 0.8rem !important;
    padding: 4px 12px !important;
  }
  .fc-button:hover {
    background: rgba(255,255,255,0.14) !important;
    color: white !important;
  }
  .fc-button-active, .fc-button:focus {
    background: rgba(160,120,255,0.3) !important;
    box-shadow: none !important;
  }
  .fc-col-header-cell {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    padding: 8px 0;
    background: rgba(255,255,255,0.03);
  }
  .fc-daygrid-day-number {
    color: rgba(255,255,255,0.4);
    font-size: 0.8rem;
    padding: 6px 8px;
  }
  .fc-day-today .fc-daygrid-day-number {
    background: rgba(160,120,255,0.5);
    border-radius: 50%;
    color: white;
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 4px;
    padding: 0;
  }
  .fc-event {
    border: none !important;
    border-radius: 6px !important;
    font-size: 0.73rem !important;
    font-weight: 600 !important;
    padding: 2px 6px !important;
    cursor: pointer;
  }
  .fc-daygrid-more-link {
    color: rgba(160,120,255,0.9);
    font-size: 0.72rem;
    font-weight: 600;
  }
`;

const CalendarWrapper = styled.div`
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 3rem;
`;

const CalendarToggle = styled.button<{ $active: boolean }>`
  padding: 0.4rem 1rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid ${p => p.$active ? "rgba(160,120,255,0.7)" : "rgba(255,255,255,0.15)"};
  background: ${p => p.$active ? "rgba(120,80,255,0.2)" : "transparent"};
  color: ${p => p.$active ? "#c8a8ff" : "rgba(255,255,255,0.5)"};
  transition: all 150ms;
  margin-bottom: 1.25rem;
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type EventDoc = {
  id: string;
  titre: string;
  date: string;
  heure: string;
  duree?: string;
  places: number;
  inscrits: number;
  niveau: string;
  organisateur?: string;
  mjId?: string;
  mjNom?: string;
  description: string;
  categorie: string;
  systeme?: string;
  tags?: string[];
  image?: string;
};

type UserProfile = {
  pseudo: string;
  email: string;
};

// ─── Catégories ───────────────────────────────────────────────────────────────

const categories: Record<string, { icon: string; title: string; subtitle: string }> = {
  "soirees-jdr":  { icon: "🎲", title: "Soirées JDR",   subtitle: "Sessions de jeu de rôle régulières ouvertes à tous les niveaux." },
  "tournois":     { icon: "🏆", title: "Tournois",       subtitle: "Compétitions amicales entre joueurs pour tester vos compétences." },
  "soirees-jeux": { icon: "🃏", title: "Soirées Jeux",   subtitle: "Jeux de société et de plateau pour varier les plaisirs." },
  "initiations":  { icon: "📖", title: "Initiations",    subtitle: "Ateliers pour découvrir le jeu de rôle de zéro, dans un cadre bienveillant." },
};

const TYPE_COLORS: Record<string, string> = {
  "soirees-jdr":  "#7c4dff",
  "tournois":     "#c9a84c",
  "soirees-jeux": "#e91e8c",
  "initiations":  "#00bcd4",
  default:        "#5c6bc0",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────


// Convertit une date ISO "AAAA-MM-JJ" (stockée en base, format natif <input type="date">)
// en format français "JJ/MM/AAAA" pour l'affichage.
function formatDateFr(dateISO: string): string {
  if (!dateISO) return "";
  const [y, m, d] = dateISO.split("-");
  if (!y || !m || !d) return dateISO; // filet de sécurité si le format est inattendu
  return `${d}/${m}/${y}`;
}
function getInitiales(nom: string): string {
  return nom
    .split(" ")
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getStatusBadge(placesDispo: number): { status: "ok" | "low" | "full"; label: string } {
  if (placesDispo <= 0) return { status: "full", label: "Complet" };
  if (placesDispo <= 2) return { status: "low",  label: `${placesDispo} place${placesDispo > 1 ? "s" : ""}` };
  return { status: "ok", label: `${placesDispo} places` };
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function EventPageClient({ slug }: { slug: string }) {
  const cat      = categories[slug];
  const pathname = usePathname();

  const [showCalendar, setShowCalendar] = useState(false);
  const [user, setUser]                 = useState<User | null>(null);
  const [userProfile, setUserProfile]   = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading]   = useState(true);
  const [events, setEvents]             = useState<EventDoc[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<"all" | "upcoming" | "past">("all");
  const [selectedEvent, setSelectedEvent] = useState<EventDoc | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [success, setSuccess]           = useState(false);
  const [waitlisted, setWaitlisted]     = useState(false);

  // Cache des noms MJ résolus depuis Firestore "users", pour les events
  // qui n'ont pas encore le champ dénormalisé mjNom.
  const [mjProfiles, setMjProfiles]     = useState<Record<string, string>>({});

  // ── Auth + profil ─────────────────────────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserProfile({ pseudo: data.pseudo || "", email: firebaseUser.email || "" });
        } else {
          setUserProfile({ pseudo: "", email: firebaseUser.email || "" });
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Chargement événements ─────────────────────────────────────────────────

  useEffect(() => {
    if (!cat) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, "evenements"), where("categorie", "==", slug));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })) as EventDoc[]);
        setLoading(false);
      },
      (error) => {
        console.error("❌ Erreur chargement événements :", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [slug, cat]);

  // ── Fetch profils MJ (fallback pour les events sans mjNom) ────────────────

  useEffect(() => {
    if (events.length === 0) return;

    const idsToFetch = [...new Set(
      events
        .filter(e => e.mjId && !e.mjNom && !mjProfiles[e.mjId])
        .map(e => e.mjId as string)
    )];
    if (idsToFetch.length === 0) return;

    Promise.all(
      idsToFetch.map(uid =>
        getDoc(doc(db, "users", uid)).then(snap => ({
          uid,
          nom: snap.exists()
            ? (`${snap.data().prenom || ""} ${snap.data().nom || ""}`.trim()
                || snap.data().pseudo
                || null)
            : null,
        }))
      )
    ).then(results => {
      const map: Record<string, string> = {};
      results.forEach(r => { if (r.nom) map[r.uid] = r.nom; });
      if (Object.keys(map).length > 0) {
        setMjProfiles(prev => ({ ...prev, ...map }));
      }
    });
    // mjProfiles volontairement absent des deps pour éviter une boucle :
    // on ne veut relancer le fetch que quand la liste d'events change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  // ── FullCalendar events ───────────────────────────────────────────────────

  const fcEvents = events
    .filter(e => !!e.date)
    .map(e => ({
      id: e.id,
      title: e.titre,
      date: e.date,
      backgroundColor: TYPE_COLORS[e.categorie] ?? TYPE_COLORS.default,
      borderColor: "transparent",
      extendedProps: e,
    }));

  // ── Inscription ───────────────────────────────────────────────────────────

  function handleRegisterClick(event: EventDoc) {
    if (authLoading) return;
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
      return;
    }
    if (event.mjId && event.mjId === user.uid) {
      alert("Vous êtes l'organisateur de cet événement, vous ne pouvez pas vous y inscrire.");
      return;
    }
    setSelectedEvent(event);
  }

  async function handleSubmit() {
    if (!selectedEvent || !user || !userProfile) return;
    setSubmitting(true);

    try {
      const existingQuery = query(
        collection(db, "inscriptions"),
        where("eventId", "==", selectedEvent.id),
        where("userId",  "==", user.uid)
      );
      const existing = await getDocs(existingQuery);
      if (!existing.empty) {
        alert("Vous êtes déjà inscrit (ou en liste d'attente) pour cet événement.");
        setSubmitting(false);
        return;
      }

      const result: { statut: "confirme" | "attente" } = { statut: "confirme" };

      await runTransaction(db, async (transaction) => {
        const eventRef  = doc(db, "evenements", selectedEvent.id);
        const eventSnap = await transaction.get(eventRef);
        if (!eventSnap.exists()) throw new Error("Événement introuvable");

        const data = eventSnap.data();
        const placesRestantes = data.places - (data.inscrits || 0);

        if (placesRestantes > 0) {
          result.statut = "confirme";
          transaction.update(eventRef, { inscrits: increment(1) });
        } else {
          result.statut = "attente";
        }
      });

      const statut = result.statut;

      await addDoc(collection(db, "inscriptions"), {
        eventId:    selectedEvent.id,
        eventTitle: selectedEvent.titre,
        categorie:  slug,
        nom:        userProfile.pseudo || userProfile.email,
        email:      userProfile.email,
        pseudo:     userProfile.pseudo,
        userId:     user.uid,
        statut,
        createdAt:  serverTimestamp(),
      });

      if (statut === "confirme") {
        const emailRes = await fetch("/api/inscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nom:        userProfile.pseudo || userProfile.email,
            email:      userProfile.email,
            eventTitle: selectedEvent.titre,
            date:       selectedEvent.date,
            time:       selectedEvent.heure,
          }),
        });
        if (!emailRes.ok) {
          console.error("❌ Email échoué :", await emailRes.text());
        }
      }

      setWaitlisted(statut === "attente");
      setSuccess(true);
    } catch (error: any) {
      console.error("❌ Erreur :", error.message, error);
      alert(error.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setSubmitting(false);
    }
  }

  function closeModal() {
    setSelectedEvent(null);
    setSuccess(false);
    setWaitlisted(false);
  }

  // ── Rendu page inconnue ───────────────────────────────────────────────────

  if (!cat) {
    return (
      <Page>
        <Navigation />
        <Hero>
          <BackLink href="/#events">← Retour aux événements</BackLink>
          <HeroTitle>Page introuvable</HeroTitle>
          <HeroSubtitle>Cette catégorie n&apos;existe pas.</HeroSubtitle>
        </Hero>
      </Page>
    );
  }

  // ── Filtrage ──────────────────────────────────────────────────────────────

  const now      = new Date().toISOString().split("T")[0];
  const filtered = events.filter(e => {
    if (filter === "upcoming") return e.date >= now;
    if (filter === "past")     return e.date < now;
    return true;
  });
  const upcoming = filtered.filter(e => e.date >= now);
  const past     = filtered.filter(e => e.date < now);

  // ── Rendu card ────────────────────────────────────────────────────────────

  function renderCard(event: EventDoc, i: number, isPast = false) {
    const placesDispo     = event.places - (event.inscrits ?? 0);
    const complet         = placesDispo <= 0;
    const estOrganisateur = !!user && !!event.mjId && event.mjId === user.uid;
    const { status, label: statusLabel } = getStatusBadge(placesDispo);

    const mjNom = event.mjNom
      || (event.mjId ? mjProfiles[event.mjId] : null)
      || null;
    const initiales = mjNom ? getInitiales(mjNom) : "MJ";

    let registerLabel = "S'inscrire";
    if (!user)                registerLabel = "Se connecter";
    else if (estOrganisateur) registerLabel = "Vous organisez";
    else if (complet)         registerLabel = "Liste d'attente";

    return (
      <Card key={event.id} style={{ animationDelay: `${i * 0.06}s`, opacity: isPast ? 0.55 : 1 }}>
        <CardHeader $bgImage={event.image}>
          <CatBadge>{cat.icon} {cat.title}</CatBadge>

          {!isPast && (
            <StatusBadge $status={status}>{statusLabel}</StatusBadge>
          )}

          <CardDate dateTime={event.date}>
  {formatDateFr(event.date)} · {event.heure}
  {event.duree && ` · ${event.duree}`}
</CardDate>
          <CardTitle>{event.titre}</CardTitle>
        </CardHeader>

        <CardBody>
          <TagRow>
            {event.systeme && <Tag>{event.systeme}</Tag>}
            {event.niveau  && <Tag>⭐ {event.niveau}</Tag>}
            {event.tags?.slice(0, 2).map(t => <Tag key={t}>{t}</Tag>)}
          </TagRow>

          <CardDesc>{event.description}</CardDesc>

          <CardFooter>
            <MJRow>
              <MJAvatar>{initiales}</MJAvatar>
              <MJName>
                {mjNom ?? (event.mjId ? "Chargement…" : "MJ non renseigné")}
              </MJName>
            </MJRow>

            <BtnGroup>
              <DetailBtn href={`/evenements/${slug}/${event.id}`}>
                Voir →
              </DetailBtn>

              {!isPast && (
                <RegisterBtn
                  disabled={estOrganisateur}
                  onClick={(e) => {
                    e.preventDefault();
                    handleRegisterClick(event);
                  }}
                >
                  {registerLabel}
                </RegisterBtn>
              )}
            </BtnGroup>
          </CardFooter>
        </CardBody>
      </Card>
    );
  }

  // ── Rendu principal ───────────────────────────────────────────────────────

  return (
    <Page>
      <Navigation />

      <Hero>
        <BackLink href="/#events">← Tous les événements</BackLink>
        <HeroIcon>{cat.icon}</HeroIcon>
        <HeroTitle>{cat.title}</HeroTitle>
        <HeroSubtitle>{cat.subtitle}</HeroSubtitle>
      </Hero>

      <ProposeRow>
        <ProposeLink href="/proposer-evenement">
          ➕ Proposer un événement
        </ProposeLink>
      </ProposeRow>

      <FiltersRow>
        {(["all", "upcoming", "past"] as const).map(f => (
          <FilterBtn key={f} $active={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? "Tous" : f === "upcoming" ? "À venir" : "Passés"}
          </FilterBtn>
        ))}
      </FiltersRow>

      <CalendarGlobal />

      <Section>
        <CalendarToggle
          $active={showCalendar}
          onClick={() => setShowCalendar(v => !v)}
        >
          {showCalendar ? "📋 Vue liste" : "📅 Vue calendrier"}
        </CalendarToggle>

        {showCalendar && (
          <CalendarWrapper>
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale="fr"
              events={fcEvents}
              eventClick={(info) => {
                const e = info.event.extendedProps as EventDoc;
                if (e.date >= now) handleRegisterClick(e);
              }}
              headerToolbar={{ left: "prev,next", center: "title", right: "today" }}
              height="auto"
              dayMaxEvents={3}
            />
          </CalendarWrapper>
        )}
      </Section>

      <Section>
        {loading && <LoadingState>Chargement des événements…</LoadingState>}

        {!loading && filtered.length === 0 && (
          <EmptyState>Aucun événement pour le moment. Revenez bientôt !</EmptyState>
        )}

        {!loading && upcoming.length > 0 && (
          <>
            <SectionLabel>À venir</SectionLabel>
            <Grid>
              {upcoming.map((event, i) => renderCard(event, i, false))}
            </Grid>
          </>
        )}

        {!loading && past.length > 0 && (
          <>
            <SectionLabel>Événements passés</SectionLabel>
            <Grid>
              {past.map((event, i) => renderCard(event, i, true))}
            </Grid>
          </>
        )}
      </Section>

      {/* ── Modal inscription ── */}
      {selectedEvent && (
        <Overlay onClick={closeModal}>
          <Modal onClick={e => e.stopPropagation()}>
            {!success ? (
              <>
                <ModalTitle>
                  {(selectedEvent.places - (selectedEvent.inscrits ?? 0)) <= 0
                    ? "Rejoindre la liste d'attente"
                    : "S'inscrire"}
                </ModalTitle>

                {selectedEvent.image && (
                  <ModalImage src={selectedEvent.image} alt={selectedEvent.titre} />
                )}

                <ModalSubtitle>
                  {selectedEvent.titre} · {selectedEvent.date} à {selectedEvent.heure}
                </ModalSubtitle>

                {userProfile && (
                  <UserInfoBox>
                    <UserAvatar>🧙</UserAvatar>
                    <UserDetails>
                      <UserName>{userProfile.pseudo || "Aventurier"}</UserName>
                      <UserEmail>{userProfile.email}</UserEmail>
                    </UserDetails>
                  </UserInfoBox>
                )}

                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)", marginBottom: "1.5rem" }}>
                  {(selectedEvent.places - (selectedEvent.inscrits ?? 0)) <= 0
                    ? "Cet événement est complet. Vous serez ajouté à la liste d'attente et prévenu si une place se libère."
                    : "Votre inscription sera enregistrée avec ce compte. Un email de confirmation vous sera envoyé."}
                </p>

                <ModalActions>
                  <CancelBtn onClick={closeModal}>Annuler</CancelBtn>
                  <ConfirmBtn onClick={handleSubmit} disabled={submitting}>
                    {submitting ? "Envoi…" : "Confirmer l'inscription"}
                  </ConfirmBtn>
                </ModalActions>
              </>
            ) : (
              <>
                <SuccessMsg>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
                    {waitlisted ? "📋" : "🎉"}
                  </div>
                  <strong>
                    {waitlisted ? "Vous êtes en liste d'attente !" : "Inscription confirmée !"}
                  </strong>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    {waitlisted
                      ? "L'événement est complet. Vous serez prévenu si une place se libère."
                      : <>Un email a été envoyé à <strong>{userProfile?.email}</strong>.</>}
                  </p>
                </SuccessMsg>
                <ModalActions>
                  <ConfirmBtn onClick={closeModal}>Fermer</ConfirmBtn>
                </ModalActions>
              </>
            )}
          </Modal>
        </Overlay>
      )}
    </Page>
  );
}