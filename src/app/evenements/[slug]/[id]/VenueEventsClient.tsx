"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styled, { keyframes } from "styled-components";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection, query, where, getDocs, doc, getDoc,
  addDoc, runTransaction, increment, serverTimestamp,
} from "firebase/firestore";
import Navigation from "@/components/Navigation";

type EventDoc = {
  id: string;
  titre: string;
  date: string;
  heure: string;
  duree?: string;
  places: number;
  inscrits: number;
  lieu?: string;
  systeme?: string;
};

type TableMJ = {
  id: string;
  mjId: string;
  mjNom: string;
  systeme: string;
  description: string;
  placesMax: number;
  inscrits: number;
  status: "pending" | "approved" | "rejected";
};

type VenueInfo = { venue: string; ville: string; adresse: string; schedule: string; image?: string };
type UserProfile = { pseudo: string; email: string; role?: string };

// ─── Styled ──────────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Page = styled.main`
  min-height: 100vh;
  background: #0d0d14;
  color: #fff;
  font-family: 'Inter', system-ui, sans-serif;
  padding-bottom: 4rem;
`;

const Hero = styled.div<{ $bgImage?: string }>`
  position: relative;
  min-height: 220px;
  padding: 6rem 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background:
    linear-gradient(180deg, rgba(13,13,20,0.2) 0%, rgba(13,13,20,0.94) 100%),
    ${p => p.$bgImage ? `url(${p.$bgImage}) center/cover` : "linear-gradient(135deg, rgba(0,188,212,0.25), rgba(0,188,212,0.05))"};
`;

const HeroContent = styled.div`
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
`;

const Container = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 0 1.5rem;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: rgba(255,255,255,0.6);
  text-decoration: none;
  margin-bottom: 1.25rem;
  &:hover { color: #fff; }
`;

const Title = styled.h1`
  font-size: clamp(1.8rem, 4.5vw, 2.4rem);
  font-weight: 800;
  margin: 0 0 0.5rem;
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.85rem;
  color: rgba(255,255,255,0.6);
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const RecurringBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 3px 11px;
  border-radius: 999px;
  background: rgba(0,188,212,0.18);
  border: 1px solid rgba(0,188,212,0.4);
  color: #4dd0e1;
`;

const SectionTitle = styled.h2`
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(160,120,255,0.8);
  margin: 2rem 0 1rem;
  &:first-child { margin-top: 2.5rem; }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const EventCard = styled.div<{ $isNext?: boolean }>`
  border-radius: 14px;
  background: ${p => p.$isNext ? "rgba(120,80,255,0.08)" : "rgba(255,255,255,0.04)"};
  border: 1px solid ${p => p.$isNext ? "rgba(160,120,255,0.35)" : "rgba(255,255,255,0.09)"};
  overflow: hidden;
  transition: border-color 150ms;
`;

const CardTop = styled.div`
  padding: 1.25rem 1.4rem;
  cursor: pointer;
`;

const NextTag = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #c8a8ff;
  margin-bottom: 0.6rem;
`;

const EventTopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
`;

const EventInfo = styled.div``;

const EventDay = styled.div`
  font-size: 1.05rem;
  font-weight: 700;
  color: #fff;
`;

const EventTimeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.82rem;
  color: rgba(255,255,255,0.5);
  margin-top: 0.25rem;
`;

const RightCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
`;

const PlacesBadge = styled.span<{ $level: "ok" | "low" | "full" }>`
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 999px;
  white-space: nowrap;
  background: ${p =>
    p.$level === "full" ? "rgba(255,80,80,0.15)" :
    p.$level === "low"  ? "rgba(255,170,0,0.15)" :
                          "rgba(80,200,120,0.15)"};
  color: ${p =>
    p.$level === "full" ? "#ff8080" :
    p.$level === "low"  ? "#ffbb44" :
                          "#7dffb3"};
  border: 1px solid ${p =>
    p.$level === "full" ? "rgba(255,80,80,0.3)" :
    p.$level === "low"  ? "rgba(255,170,0,0.3)" :
                          "rgba(80,200,120,0.3)"};
`;

const ExpandHint = styled.span`
  font-size: 0.72rem;
  color: rgba(160,120,255,0.8);
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ExpandedZone = styled.div`
  padding: 0 1.4rem 1.4rem;
  animation: ${fadeUp} 0.2s ease both;
`;

const Divider = styled.div`
  height: 0.5px;
  background: rgba(255,255,255,0.08);
  margin-bottom: 1.1rem;
`;

const SubLabel = styled.p`
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
  margin: 0 0 0.7rem;
`;

const GeneralRegisterBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  margin-bottom: 1.1rem;
`;

const GeneralRegisterText = styled.p`
  font-size: 0.8rem;
  color: rgba(255,255,255,0.55);
  margin: 0;
`;

const TablesGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1.1rem;
`;

const TableRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.8rem 1rem;
  border-radius: 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  flex-wrap: wrap;
`;

const TableInfo = styled.div`
  flex: 1;
  min-width: 200px;
`;

const TableMjLabel = styled.p`
  font-size: 0.83rem;
  font-weight: 700;
  color: #c8a8ff;
  margin: 0;
`;

const TableDesc = styled.p`
  font-size: 0.78rem;
  color: rgba(255,255,255,0.5);
  margin: 0.25rem 0 0;
  line-height: 1.4;
`;

const SmallBtn = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  background: rgba(120,80,255,0.2);
  border: 1px solid rgba(160,120,255,0.4);
  color: #c8a8ff;
  transition: background 150ms;
  &:hover:not(:disabled) { background: rgba(120,80,255,0.35); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const NoTablesMsg = styled.p`
  font-size: 0.8rem;
  color: rgba(255,255,255,0.35);
  margin: 0 0 1.1rem;
`;

// ── Formulaire "Proposer ma table" (inline) ────────────────────────────────

const MjSection = styled.div`
  margin-top: 1.1rem;
  padding-top: 1.1rem;
  border-top: 0.5px dashed rgba(0,188,212,0.25);
`;

const ProposeTableBtn = styled.button`
  width: 100%;
  padding: 0.65rem 1rem;
  border-radius: 10px;
  border: 1px dashed rgba(0,188,212,0.4);
  background: rgba(0,188,212,0.08);
  color: #4dd0e1;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms;
  &:hover:not(:disabled) { background: rgba(0,188,212,0.16); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const MyTableStatus = styled.div<{ $status: "pending" | "approved" | "rejected" }>`
  padding: 0.65rem 0.9rem;
  border-radius: 10px;
  font-size: 0.8rem;
  background: ${p => p.$status === "approved" ? "rgba(80,200,120,0.1)" : p.$status === "rejected" ? "rgba(255,80,80,0.1)" : "rgba(255,180,60,0.1)"};
  border: 1px solid ${p => p.$status === "approved" ? "rgba(80,200,120,0.3)" : p.$status === "rejected" ? "rgba(255,80,80,0.3)" : "rgba(255,180,60,0.3)"};
  color: ${p => p.$status === "approved" ? "#7dffb3" : p.$status === "rejected" ? "#ff8080" : "#ffcf7d"};
`;

const TableFormBox = styled.div`
  padding: 1rem;
  border-radius: 12px;
  background: rgba(0,188,212,0.04);
  border: 1px solid rgba(0,188,212,0.2);
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
`;

const FieldLabel = styled.label`
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.4);
  margin-bottom: 0.35rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
  font-size: 0.85rem;
  outline: none;
  box-sizing: border-box;
  &:focus { border-color: rgba(0,188,212,0.5); }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
  font-size: 0.85rem;
  outline: none;
  resize: vertical;
  min-height: 70px;
  box-sizing: border-box;
  font-family: inherit;
  &:focus { border-color: rgba(0,188,212,0.5); }
`;

const FormActionsRow = styled.div`
  display: flex;
  gap: 0.6rem;
`;

const CancelSmallBtn = styled.button`
  flex: 1;
  padding: 0.55rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: rgba(255,255,255,0.5);
  font-size: 0.8rem;
  cursor: pointer;
  &:hover { background: rgba(255,255,255,0.05); }
`;

const SubmitTableBtn = styled.button`
  flex: 2;
  padding: 0.55rem;
  border-radius: 8px;
  border: 1px solid rgba(0,188,212,0.4);
  background: rgba(0,188,212,0.18);
  color: #4dd0e1;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  &:hover:not(:disabled) { background: rgba(0,188,212,0.3); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const Empty = styled.div`
  text-align: center;
  padding: 3.5rem 1rem;
  color: rgba(255,255,255,0.4);
  font-size: 0.92rem;
`;

const SkeletonCard = styled.div`
  height: 130px;
  border-radius: 14px;
  background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

const LoginBtn = styled(Link)`
  display: block;
  text-align: center;
  padding: 0.6rem 1rem;
  border-radius: 9px;
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
  background: rgba(120,80,255,0.2);
  border: 1px solid rgba(160,120,255,0.4);
  color: #c8a8ff;
`;

// ── Modal inscription ──────────────────────────────────────────────────────

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
  max-width: 420px;
`;

const ModalTitle = styled.h2`
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0 0 0.4rem;
`;

const ModalSub = styled.p`
  font-size: 0.85rem;
  color: rgba(255,255,255,0.5);
  margin: 0 0 1.5rem;
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
  &:hover:not(:disabled) { background: rgba(120,80,255,0.4); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const SuccessMsg = styled.div`
  text-align: center;
  padding: 1rem 0;
  color: #7dffb3;
  font-size: 0.95rem;
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function formatJourComplet(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${JOURS[date.getDay()]} ${d} ${MOIS[m - 1]}`;
}

function formatMoisAnnee(dateISO: string): string {
  const [y, m] = dateISO.split("-").map(Number);
  return `${MOIS[m - 1]} ${y}`;
}

function getPlacesLevel(dispo: number): "ok" | "low" | "full" {
  if (dispo <= 0) return "full";
  if (dispo <= 2) return "low";
  return "ok";
}

const TABLE_FORM_VIDE = { systeme: "", description: "", placesMax: 4 };

// ─── Composant ────────────────────────────────────────────────────────────────

export default function VenueEventsClient({
  slug,
  lieu,
  venue,
}: {
  slug: string;
  lieu: string;
  venue: VenueInfo;
}) {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tablesParEvent, setTablesParEvent] = useState<Record<string, TableMJ[]>>({});
  const [loadingTables, setLoadingTables] = useState<Record<string, boolean>>({});
  const [mesInscriptions, setMesInscriptions] = useState<Record<string, { tableId?: string } | null>>({});

  // Formulaire "Proposer ma table", par événement (clé = eventId)
  const [tableFormOpen, setTableFormOpen] = useState<Record<string, boolean>>({});
  const [tableForm, setTableForm] = useState<Record<string, typeof TABLE_FORM_VIDE>>({});
  const [submittingTable, setSubmittingTable] = useState<Record<string, boolean>>({});

  const [selected, setSelected] = useState<{ event: EventDoc; table: TableMJ | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);

  const estMJ = userProfile?.role === "mj" || userProfile?.role === "admin";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        const data = snap.exists() ? snap.data() : {};
        setUserProfile({ pseudo: data.pseudo || "", email: firebaseUser.email || "", role: data.role });
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const todayISO = new Date().toISOString().split("T")[0];

    getDocs(
      query(
        collection(db, "evenements"),
        where("categorie", "==", slug),
        where("lieu", "==", lieu)
      )
    ).then(snap => {
      if (cancelled) return;
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as EventDoc[];
      const upcoming = all
        .filter(e => e.date >= todayISO)
        .sort((a, b) => a.date.localeCompare(b.date));
      setEvents(upcoming);
      setLoading(false);
    }).catch(() => setLoading(false));

    return () => { cancelled = true; };
  }, [lieu, slug]);

  async function toggleExpand(eventId: string) {
    if (expandedId === eventId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(eventId);

    if (!tablesParEvent[eventId]) {
      setLoadingTables(prev => ({ ...prev, [eventId]: true }));
      try {
        const snap = await getDocs(collection(db, "evenements", eventId, "tables"));
        const tables = snap.docs.map(d => ({ id: d.id, inscrits: 0, ...d.data() })) as TableMJ[];
        setTablesParEvent(prev => ({ ...prev, [eventId]: tables }));
      } catch {
        setTablesParEvent(prev => ({ ...prev, [eventId]: [] }));
      } finally {
        setLoadingTables(prev => ({ ...prev, [eventId]: false }));
      }
    }

    if (user && !(eventId in mesInscriptions)) {
      try {
        const snap = await getDocs(
          query(collection(db, "evenements", eventId, "inscriptions"), where("userId", "==", user.uid))
        );
        if (!snap.empty) {
          const d = snap.docs[0].data() as any;
          setMesInscriptions(prev => ({ ...prev, [eventId]: { tableId: d.tableId } }));
        } else {
          setMesInscriptions(prev => ({ ...prev, [eventId]: null }));
        }
      } catch {
        setMesInscriptions(prev => ({ ...prev, [eventId]: null }));
      }
    }
  }

  function openRegisterModal(event: EventDoc, table: TableMJ | null) {
    if (authLoading) return;
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setSelected({ event, table });
  }

  function closeModal() {
    setSelected(null);
    setSuccess(false);
    setWaitlisted(false);
  }

  async function handleConfirmInscription() {
    if (!selected || !user || !userProfile) return;
    const { event, table } = selected;
    setSubmitting(true);
    try {
      const dejaInscritSnap = await getDocs(
        query(collection(db, "evenements", event.id, "inscriptions"), where("userId", "==", user.uid))
      );
      if (!dejaInscritSnap.empty) {
        alert("Vous êtes déjà inscrit pour cette animation.");
        setSubmitting(false);
        return;
      }

      const result: { statut: "confirme" | "attente" } = { statut: "confirme" };

      if (table) {
        await runTransaction(db, async (transaction) => {
          const tableRef = doc(db, "evenements", event.id, "tables", table.id);
          const tableSnap = await transaction.get(tableRef);
          if (!tableSnap.exists()) throw new Error("Cette table n'existe plus.");
          const d = tableSnap.data();
          const placesRestantes = (d.placesMax ?? 0) - (d.inscrits || 0);
          if (placesRestantes > 0) {
            result.statut = "confirme";
            transaction.update(tableRef, { inscrits: increment(1) });
          } else {
            result.statut = "attente";
          }
        });
      } else {
        await runTransaction(db, async (transaction) => {
          const eventRef = doc(db, "evenements", event.id);
          const eventSnap = await transaction.get(eventRef);
          if (!eventSnap.exists()) throw new Error("Animation introuvable");
          const d = eventSnap.data();
          const placesRestantes = (d.places ?? 0) - (d.inscrits || 0);
          if (placesRestantes > 0) {
            result.statut = "confirme";
            transaction.update(eventRef, { inscrits: increment(1) });
          } else {
            result.statut = "attente";
          }
        });
      }

      await addDoc(collection(db, "evenements", event.id, "inscriptions"), {
        userId: user.uid,
        tableId: table?.id || null,
        tableMjNom: table?.mjNom || null,
        systeme: table?.systeme || null,
        prenom: userProfile.pseudo,
        pseudo: userProfile.pseudo,
        email: userProfile.email,
        statut: result.statut,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "inscriptions"), {
        eventId: event.id,
        eventTitle: event.titre,
        categorie: slug,
        nom: userProfile.pseudo || userProfile.email,
        email: userProfile.email,
        pseudo: userProfile.pseudo,
        userId: user.uid,
        statut: result.statut,
        date: event.date,
        heure: event.heure,
        tableId: table?.id || null,
        tableMjNom: table?.mjNom || null,
        createdAt: serverTimestamp(),
      });

      if (table) {
        setTablesParEvent(prev => ({
          ...prev,
          [event.id]: prev[event.id].map(t =>
            t.id === table.id && result.statut === "confirme"
              ? { ...t, inscrits: (t.inscrits ?? 0) + 1 }
              : t
          ),
        }));
      } else {
        setEvents(prev => prev.map(e =>
          e.id === event.id && result.statut === "confirme"
            ? { ...e, inscrits: (e.inscrits ?? 0) + 1 }
            : e
        ));
      }
      setMesInscriptions(prev => ({ ...prev, [event.id]: { tableId: table?.id } }));

      setWaitlisted(result.statut === "attente");
      setSuccess(true);
    } catch (err: any) {
      alert(err.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Proposer une table (formulaire inline MJ) ─────────────────────────────

  function ouvrirFormulaireTable(eventId: string) {
    setTableForm(prev => ({ ...prev, [eventId]: prev[eventId] ?? { ...TABLE_FORM_VIDE } }));
    setTableFormOpen(prev => ({ ...prev, [eventId]: true }));
  }

  function fermerFormulaireTable(eventId: string) {
    setTableFormOpen(prev => ({ ...prev, [eventId]: false }));
  }

  async function proposerTable(eventId: string) {
    if (!user || !userProfile) return;
    const form = tableForm[eventId];
    if (!form || !form.systeme || !form.description) {
      alert("Merci de renseigner le système et la description de la table.");
      return;
    }
    setSubmittingTable(prev => ({ ...prev, [eventId]: true }));
    try {
      const docRef = await addDoc(collection(db, "evenements", eventId, "tables"), {
        mjId: user.uid,
        mjNom: userProfile.pseudo || userProfile.email,
        systeme: form.systeme,
        description: form.description,
        placesMax: Number(form.placesMax) || 1,
        inscrits: 0,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setTablesParEvent(prev => ({
        ...prev,
        [eventId]: [
          ...(prev[eventId] ?? []),
          {
            id: docRef.id,
            mjId: user.uid,
            mjNom: userProfile.pseudo || userProfile.email,
            systeme: form.systeme,
            description: form.description,
            placesMax: Number(form.placesMax) || 1,
            inscrits: 0,
            status: "pending",
          },
        ],
      }));

      setTableFormOpen(prev => ({ ...prev, [eventId]: false }));
      setTableForm(prev => ({ ...prev, [eventId]: { ...TABLE_FORM_VIDE } }));
    } catch (err: any) {
      alert("Erreur lors de la proposition de table : " + (err.message || "inconnue"));
    } finally {
      setSubmittingTable(prev => ({ ...prev, [eventId]: false }));
    }
  }

  const groupesParMois = events.reduce<{ mois: string; events: EventDoc[] }[]>((acc, e) => {
    const mois = formatMoisAnnee(e.date);
    const dernier = acc[acc.length - 1];
    if (dernier && dernier.mois === mois) dernier.events.push(e);
    else acc.push({ mois, events: [e] });
    return acc;
  }, []);

  return (
    <Page>
      <Navigation />

      <Hero $bgImage={venue.image}>
        <HeroContent>
          <BackLink href={`/evenements/${slug}`}>← Retour aux animations</BackLink>
          <Title>{venue.venue}</Title>
          <MetaRow>
            <MetaItem>📍 {venue.adresse}</MetaItem>
            <RecurringBadge>🔁 {venue.schedule}</RecurringBadge>
          </MetaRow>
        </HeroContent>
      </Hero>

      <Container>
        {loading || authLoading ? (
          <List style={{ marginTop: "2rem" }}>
            <SkeletonCard />
            <SkeletonCard />
          </List>
        ) : events.length === 0 ? (
          <Empty>
            🎲 Aucune animation programmée pour le moment à ce lieu.<br />
            Revenez bientôt !
          </Empty>
        ) : (
          groupesParMois.map(({ mois, events: eventsDuMois }) => (
            <div key={mois}>
              <SectionTitle>{mois}</SectionTitle>
              <List>
                {eventsDuMois.map(e => {
                  const dispo = e.places - (e.inscrits ?? 0);
                  const level = getPlacesLevel(dispo);
                  const estProchaine = events[0].id === e.id;
                  const isExpanded = expandedId === e.id;
                  const tables = tablesParEvent[e.id] ?? [];
                  const tablesApprouvees = tables.filter(t => t.status === "approved");
                  const monInscription = mesInscriptions[e.id];
                  const myTable = user ? tables.find(t => t.mjId === user.uid) ?? null : null;
                  const formOuvert = tableFormOpen[e.id] ?? false;
                  const formValues = tableForm[e.id] ?? TABLE_FORM_VIDE;
                  const busyTable = submittingTable[e.id] ?? false;

                  return (
                    <EventCard key={e.id} $isNext={estProchaine}>
                      <CardTop onClick={() => toggleExpand(e.id)}>
                        {estProchaine && <NextTag>⭐ Prochaine séance</NextTag>}
                        <EventTopRow>
                          <EventInfo>
                            <EventDay>{formatJourComplet(e.date)}</EventDay>
                            <EventTimeRow>
                              🕒 {e.heure}
                              {e.duree && <span>· {e.duree}</span>}
                            </EventTimeRow>
                          </EventInfo>
                          <RightCol>
                            <PlacesBadge $level={level}>
                              {level === "full" ? "Complet" : `${dispo} place${dispo > 1 ? "s" : ""}`}
                            </PlacesBadge>
                            <ExpandHint>{isExpanded ? "▲ Réduire" : "▼ Voir les tables"}</ExpandHint>
                          </RightCol>
                        </EventTopRow>
                      </CardTop>

                      {isExpanded && (
                        <ExpandedZone>
                          <Divider />

                          {!user ? (
                            <LoginBtn href={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}>
                              Se connecter pour s&apos;inscrire
                            </LoginBtn>
                          ) : monInscription ? (
                            <GeneralRegisterBox>
                              <GeneralRegisterText>
                                {monInscription.tableId
                                  ? "✅ Vous êtes inscrit à une table de cette animation."
                                  : "✅ Vous êtes inscrit à cette animation (sans table précise)."}
                              </GeneralRegisterText>
                            </GeneralRegisterBox>
                          ) : (
                            <>
                              <SubLabel>Tables proposées par les MJ</SubLabel>

                              {loadingTables[e.id] ? (
                                <NoTablesMsg>Chargement des tables…</NoTablesMsg>
                              ) : tablesApprouvees.length === 0 ? (
                                <NoTablesMsg>Aucune table proposée pour le moment.</NoTablesMsg>
                              ) : (
                                <TablesGrid>
                                  {tablesApprouvees.map(t => {
                                    const placesTableDispo = t.placesMax - (t.inscrits ?? 0);
                                    const tableComplete = placesTableDispo <= 0;
                                    return (
                                      <TableRow key={t.id}>
                                        <TableInfo>
                                          <TableMjLabel>
                                            🧙 {t.mjNom}{t.systeme ? ` · ${t.systeme}` : ""}
                                          </TableMjLabel>
                                          <TableDesc>{t.description}</TableDesc>
                                        </TableInfo>
                                        <SmallBtn
                                          onClick={(ev) => { ev.stopPropagation(); openRegisterModal(e, t); }}
                                        >
                                          {tableComplete
                                            ? "📋 Liste d'attente"
                                            : `✋ S'inscrire (${placesTableDispo} places)`}
                                        </SmallBtn>
                                      </TableRow>
                                    );
                                  })}
                                </TablesGrid>
                              )}

                              <GeneralRegisterBox>
                                <GeneralRegisterText>
                                  Pas de préférence de table ? Inscrivez-vous directement à l&apos;animation.
                                </GeneralRegisterText>
                                <SmallBtn onClick={(ev) => { ev.stopPropagation(); openRegisterModal(e, null); }}>
                                  {level === "full" ? "📋 Liste d'attente" : "S'inscrire"}
                                </SmallBtn>
                              </GeneralRegisterBox>
                            </>
                          )}

                          {/* ── Bloc MJ : proposer sa table, inline ── */}
                          {estMJ && (
                            <MjSection>
                              {myTable ? (
                                <MyTableStatus $status={myTable.status}>
                                  {myTable.status === "pending"  && "⏳ Votre table est en attente de validation par un admin."}
                                  {myTable.status === "approved" && "✅ Votre table est validée et visible ci-dessus."}
                                  {myTable.status === "rejected" && "❌ Votre proposition de table n'a pas été retenue."}
                                </MyTableStatus>
                              ) : !formOuvert ? (
                                <ProposeTableBtn onClick={(ev) => { ev.stopPropagation(); ouvrirFormulaireTable(e.id); }}>
                                  🧙 Proposer ma table pour cette animation
                                </ProposeTableBtn>
                              ) : (
                                <TableFormBox onClick={(ev) => ev.stopPropagation()}>
                                  <div>
                                    <FieldLabel>Système / jeu</FieldLabel>
                                    <Input
                                      value={formValues.systeme}
                                      onChange={ev => setTableForm(prev => ({
                                        ...prev,
                                        [e.id]: { ...formValues, systeme: ev.target.value },
                                      }))}
                                      placeholder="D&D 5e, Croc, Star Wars…"
                                    />
                                  </div>
                                  <div>
                                    <FieldLabel>Description de la table</FieldLabel>
                                    <Textarea
                                      value={formValues.description}
                                      onChange={ev => setTableForm(prev => ({
                                        ...prev,
                                        [e.id]: { ...formValues, description: ev.target.value },
                                      }))}
                                      placeholder="Scénario, ton de la table, ce que les joueurs peuvent attendre…"
                                    />
                                  </div>
                                  <div>
                                    <FieldLabel>Nombre de places max</FieldLabel>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={formValues.placesMax}
                                      onChange={ev => setTableForm(prev => ({
                                        ...prev,
                                        [e.id]: { ...formValues, placesMax: Number(ev.target.value) },
                                      }))}
                                    />
                                  </div>
                                  <FormActionsRow>
                                    <CancelSmallBtn onClick={() => fermerFormulaireTable(e.id)}>
                                      Annuler
                                    </CancelSmallBtn>
                                    <SubmitTableBtn
                                      disabled={busyTable || !formValues.systeme || !formValues.description}
                                      onClick={() => proposerTable(e.id)}
                                    >
                                      {busyTable ? "Envoi…" : "Proposer la table"}
                                    </SubmitTableBtn>
                                  </FormActionsRow>
                                </TableFormBox>
                              )}
                            </MjSection>
                          )}
                        </ExpandedZone>
                      )}
                    </EventCard>
                  );
                })}
              </List>
            </div>
          ))
        )}
      </Container>

      {/* ── Modal inscription ── */}
      {selected && (
        <Overlay onClick={closeModal}>
          <Modal onClick={e => e.stopPropagation()}>
            {!success ? (
              <>
                <ModalTitle>
                  {selected.table ? "S'inscrire à cette table" : "S'inscrire à l'animation"}
                </ModalTitle>
                <ModalSub>
                  {selected.table
                    ? `${selected.table.mjNom}${selected.table.systeme ? ` · ${selected.table.systeme}` : ""}`
                    : `${formatJourComplet(selected.event.date)} · ${selected.event.heure}`}
                </ModalSub>
                <ModalActions>
                  <CancelBtn onClick={closeModal}>Annuler</CancelBtn>
                  <ConfirmBtn onClick={handleConfirmInscription} disabled={submitting}>
                    {submitting ? "Envoi…" : "Confirmer"}
                  </ConfirmBtn>
                </ModalActions>
              </>
            ) : (
              <>
                <SuccessMsg>
                  <div style={{ fontSize: "2.2rem", marginBottom: "0.6rem" }}>
                    {waitlisted ? "📋" : "🎉"}
                  </div>
                  <strong>{waitlisted ? "Vous êtes en liste d'attente !" : "Inscription confirmée !"}</strong>
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