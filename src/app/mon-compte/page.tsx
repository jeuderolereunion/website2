"use client";

import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import Navigation from "@/components/Navigation";
import Profileniveauselector from "@/components/Profileniveauselector";
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
  deleteDoc,
  runTransaction,
  increment,
} from "firebase/firestore";

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const Page = styled.main`
  min-height: 100vh;
  background: #0d0d14;
  color: #fff;
  padding: 6rem 1rem 4rem;
`;

const Container = styled.div`
  max-width: 920px;
  margin: 0 auto;
`;

// ─── Header ────────────────────────────────────────────────────────────────────

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1.1rem;
  margin-bottom: 1.75rem;
  flex-wrap: wrap;

  @media (max-width: 520px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.85rem;
  }
`;

const Avatar = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(120,80,255,0.55), rgba(80,40,200,0.55));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.08);
`;

const ProfileInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const Name = styled.h1`
  font-size: clamp(1.25rem, 4vw, 1.65rem);
  font-weight: 800;
  margin-bottom: 0.15rem;
  line-height: 1.2;
`;

const Email = styled.p`
  font-size: 0.82rem;
  color: rgba(255,255,255,0.4);
  margin-bottom: 0.5rem;
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`;

const Pill = styled.span<{ $tone?: "mj" | "officer" | "niveau" | "default" }>`
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  background: ${p =>
    p.$tone === "mj" ? "rgba(255,180,80,0.15)"
    : p.$tone === "officer" ? "rgba(120,220,180,0.15)"
    : p.$tone === "niveau" ? "rgba(120,80,255,0.15)"
    : "rgba(255,255,255,0.08)"};
  color: ${p =>
    p.$tone === "mj" ? "rgba(255,200,120,1)"
    : p.$tone === "officer" ? "rgba(140,230,200,1)"
    : p.$tone === "niveau" ? "rgba(180,150,255,1)"
    : "rgba(255,255,255,0.6)"};
`;

const LogoutBtn = styled.button`
  margin-left: auto;
  padding: 0.55rem 1.1rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.6);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover { background: rgba(255,255,255,0.08); color: white; }

  @media (max-width: 520px) {
    margin-left: 0;
  }
`;

// ─── Cartes de résumé (accès rapide) ────────────────────────────────────────────

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.75rem;
`;

const StatCard = styled.button<{ $accent?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  text-align: left;
  padding: 0.95rem 1.1rem;
  border-radius: 14px;
  border: 1px solid ${p => p.$accent ? "rgba(160,120,255,0.35)" : "rgba(255,255,255,0.08)"};
  background: ${p => p.$accent
    ? "linear-gradient(135deg, rgba(120,80,255,0.16), rgba(120,80,255,0.04))"
    : "rgba(255,255,255,0.03)"};
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s, background 0.15s;
  animation: ${fadeUp} 0.3s ease both;

  &:hover {
    border-color: rgba(160,120,255,0.5);
    transform: translateY(-1px);
  }
`;

const StatValue = styled.span`
  font-size: 1.5rem;
  font-weight: 800;
  color: white;
  line-height: 1;
`;

const StatLabel = styled.span`
  font-size: 0.76rem;
  color: rgba(255,255,255,0.45);
  font-weight: 600;
`;

// ─── Onglets ────────────────────────────────────────────────────────────────────

const TabBar = styled.div`
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1.75rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const TabBtn = styled.button<{ $active: boolean }>`
  flex-shrink: 0;
  padding: 0.7rem 0.95rem;
  background: none;
  border: none;
  border-bottom: 2px solid ${p => p.$active ? "rgba(160,120,255,0.9)" : "transparent"};
  color: ${p => p.$active ? "white" : "rgba(255,255,255,0.45)"};
  font-size: 0.87rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
  transition: color 0.15s;

  &:hover { color: white; }
`;

const TabBadge = styled.span`
  font-size: 0.68rem;
  font-weight: 800;
  background: rgba(120,80,255,0.9);
  color: white;
  padding: 1px 7px;
  border-radius: 999px;
`;

const SectionTitle = styled.h2`
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Count = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255,255,255,0.4);
  background: rgba(255,255,255,0.06);
  padding: 2px 9px;
  border-radius: 999px;
`;

// ── Inscriptions ──────────────────────────────────────────────────────────────

const Card = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 14px;
  padding: 1.1rem 1.4rem;
  margin-bottom: 0.8rem;
  animation: ${fadeUp} 0.3s ease both;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: border-color 0.15s;

  &:hover { border-color: rgba(255,255,255,0.15); }

  @media (min-width: 560px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
`;

const EventTitleTxt = styled.p`
  font-weight: 700;
  font-size: 0.96rem;
  margin-bottom: 0.25rem;
`;

const EventMeta = styled.p`
  font-size: 0.8rem;
  color: rgba(255,255,255,0.5);
`;

const CancelBtn = styled.button`
  padding: 0.5rem 0.95rem;
  border-radius: 8px;
  border: 1px solid rgba(255,80,80,0.25);
  background: rgba(255,80,80,0.08);
  color: #ff9a9a;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
  flex-shrink: 0;

  &:hover:not(:disabled) { background: rgba(255,80,80,0.18); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// ── Événements MJ ──────────────────────────────────────────────────────────────

const EventCard = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 16px;
  margin-bottom: 1rem;
  overflow: hidden;
  animation: ${fadeUp} 0.3s ease both;
`;

const EventHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.3rem;
  background: linear-gradient(135deg, rgba(120,80,255,0.14), rgba(120,80,255,0.03));
  border: none;
  cursor: pointer;
  text-align: left;
  color: white;
`;

const EventHeaderInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const Chevron = styled.span<{ $open: boolean }>`
  font-size: 0.85rem;
  color: rgba(255,255,255,0.4);
  transition: transform 0.2s;
  transform: rotate(${p => p.$open ? "180deg" : "0deg"});
  flex-shrink: 0;
`;

const PlacesBadge = styled.span`
  font-size: 0.76rem;
  font-weight: 600;
  color: #c8a8ff;
  background: rgba(120,80,255,0.15);
  padding: 3px 10px;
  border-radius: 999px;
  flex-shrink: 0;
  white-space: nowrap;
`;

const ParticipantsList = styled.div`
  padding: 0.5rem 1.3rem 1.1rem;
`;

const ParticipantRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0;
  border-top: 1px solid rgba(255,255,255,0.06);

  &:first-child { border-top: none; }
`;

const ParticipantInfo = styled.div`
  min-width: 0;
  flex: 1;
`;

const ParticipantName = styled.p`
  font-size: 0.86rem;
  font-weight: 600;
`;

const ParticipantEmail = styled.p`
  font-size: 0.74rem;
  color: rgba(255,255,255,0.4);
`;

const RemoveBtn = styled.button`
  padding: 0.4rem 0.7rem;
  border-radius: 8px;
  border: 1px solid rgba(255,80,80,0.22);
  background: rgba(255,80,80,0.07);
  color: #ff9a9a;
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;

  &:hover:not(:disabled) { background: rgba(255,80,80,0.18); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const Muted = styled.p`
  font-size: 0.84rem;
  color: rgba(255,255,255,0.35);
  padding: 0.6rem 0;
`;

const Empty = styled.div`
  text-align: center;
  padding: 2.5rem 1rem;
  color: rgba(255,255,255,0.35);
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
`;

const Loading = styled.div`
  text-align: center;
  padding: 4rem 1rem;
  color: rgba(255,255,255,0.3);
`;

const BrowseLink = styled(Link)`
  display: inline-block;
  margin-top: 0.6rem;
  color: #c8a8ff;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;

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
};

const NIVEAU_LABEL: Record<NiveauChoice, string> = {
  debutant: "🌱 Débutant",
  confirme: "🎯 Confirmé",
  expert: "🏆 Expert",
};

const POSTE_LABEL: Record<Poste, string> = {
  president: "🏛️ Président",
  tresorier: "🏛️ Trésorier",
  secretaire: "🏛️ Secrétaire",
};

type TabKey = "apercu" | "inscriptions" | "evenements" | "messages" | "profil";

// ─── Composant ────────────────────────────────────────────────────────────────

export default function MonComptePage() {
  const [user, setUser]               = useState<User | null>(null);
  const [profile, setProfile]         = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Inscriptions (joueur)
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loadingInsc, setLoadingInsc]   = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Événements (MJ)
  const [events, setEvents]           = useState<EventDoc[]>([]);
  const [loadingEvts, setLoadingEvts] = useState(true);
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Record<string, ParticipantInscription[]>>({});
  const [loadingParticipants, setLoadingParticipants] = useState<string | null>(null);
  const [removingId, setRemovingId]   = useState<string | null>(null);

  // Onglets + compteur de messages non lus
  const [activeTab, setActiveTab] = useState<TabKey>("apercu");
  const [unreadCount, setUnreadCount] = useState(0);

  const isMJ = profile?.role === "mj" || profile?.role === "admin";
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
        });
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
      setInscriptions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Inscription[]);
      setLoadingInsc(false);
    });
    return () => unsub();
  }, [user]);

  // ── Événements créés (si MJ) ───────────────────────────────────────────────
  useEffect(() => {
    if (!user || !isMJ) {
      setLoadingEvts(false);
      return;
    }
    const q = query(collection(db, "evenements"), where("mjId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })) as EventDoc[]);
      setLoadingEvts(false);
    });
    return () => unsub();
  }, [user, isMJ]);

  // ── Compteur de messages non lus (membres du bureau uniquement) ─────────────
  useEffect(() => {
    if (!user || !isOfficer) {
      setUnreadCount(0);
      return;
    }
    const unsub = subscribeToConversations(user.uid, (convs: Conversation[]) => {
      setUnreadCount(convs.filter(c => c.unreadBy?.includes(user.uid)).length);
    });
    return () => unsub();
  }, [user, isOfficer]);

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/";
  }

  async function annulerInscription(insc: Inscription) {
    if (!confirm(`Annuler votre inscription à "${insc.eventTitle}" ?`)) return;
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
      console.log("Participants trouvés:", snap.docs.length, snap.docs.map(d => d.data()));
      setParticipants(prev => ({
        ...prev,
        [eventId]: snap.docs.map(d => ({ id: d.id, ...d.data() })) as ParticipantInscription[],
      }));
    } catch (err) {
      console.error("Erreur chargement participants:", err);
      setParticipants(prev => ({ ...prev, [eventId]: [] }));
    } finally {
      setLoadingParticipants(null);
    }
  }
}

  async function retirerParticipant(eventId: string, p: ParticipantInscription) {
    if (!confirm(`Retirer ${p.pseudo || p.nom} de cet événement ?`)) return;
    setRemovingId(p.id);
    try {
      const eventRef = doc(db, "evenements", eventId);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(eventRef);
        if (snap.exists()) transaction.update(eventRef, { inscrits: increment(-1) });
      });
      await deleteDoc(doc(db, "inscriptions", p.id));
      setParticipants(prev => ({
        ...prev,
        [eventId]: (prev[eventId] || []).filter(x => x.id !== p.id),
      }));
    } catch (err) {
      console.error(err);
      alert("Erreur lors du retrait du participant.");
    } finally {
      setRemovingId(null);
    }
  }

  if (!authChecked) {
    return (
      <Page>
        <Navigation />
        <Container><Loading>Chargement…</Loading></Container>
      </Page>
    );
  }

  const displayName = profile?.prenom && profile?.nom
    ? `${profile.prenom} ${profile.nom}`
    : profile?.pseudo || "Aventurier";

  return (
    <Page>
      <Navigation />
      <Container>

        {/* ── En-tête compact ── */}
        <ProfileHeader>
          <Avatar>🧙</Avatar>
          <ProfileInfo>
            <Name>{displayName}</Name>
            <Email>{profile?.email}</Email>
            <BadgeRow>
              <Pill $tone={isMJ ? "mj" : "default"}>
                {isMJ ? "🧙 MJ & Joueur" : "🎲 Joueur"}
              </Pill>
              {profile?.niveau && (
                <Pill $tone="niveau">{NIVEAU_LABEL[profile.niveau]}</Pill>
              )}
              {profile?.poste && (
                <Pill $tone="officer">{POSTE_LABEL[profile.poste]}</Pill>
              )}
            </BadgeRow>
          </ProfileInfo>
          <LogoutBtn onClick={handleLogout}>Déconnexion</LogoutBtn>
        </ProfileHeader>

        {/* ── Cartes de résumé : accès rapide aux sections ── */}
        <StatGrid>
          <StatCard onClick={() => setActiveTab("inscriptions")} style={{ animationDelay: "0s" }}>
            <StatValue>{loadingInsc ? "…" : inscriptions.length}</StatValue>
            <StatLabel>🎟️ Mes inscriptions</StatLabel>
          </StatCard>

          {isMJ && (
            <StatCard onClick={() => setActiveTab("evenements")} style={{ animationDelay: "0.04s" }}>
              <StatValue>{loadingEvts ? "…" : events.length}</StatValue>
              <StatLabel>🧙 Mes événements</StatLabel>
            </StatCard>
          )}

          {isOfficer && (
            <StatCard
              $accent={unreadCount > 0}
              onClick={() => setActiveTab("messages")}
              style={{ animationDelay: "0.08s" }}
            >
              <StatValue>{unreadCount}</StatValue>
              <StatLabel>💬 Messages non lus</StatLabel>
            </StatCard>
          )}

          {!profile?.niveau && (
            <StatCard $accent onClick={() => setActiveTab("profil")} style={{ animationDelay: "0.12s" }}>
              <StatValue>!</StatValue>
              <StatLabel>Compléter mon profil</StatLabel>
            </StatCard>
          )}
        </StatGrid>

        {/* ── Onglets ── */}
        <TabBar>
          <TabBtn $active={activeTab === "apercu"} onClick={() => setActiveTab("apercu")}>
            Aperçu
          </TabBtn>
          <TabBtn $active={activeTab === "inscriptions"} onClick={() => setActiveTab("inscriptions")}>
            🎟️ Inscriptions
          </TabBtn>
          {isMJ && (
            <TabBtn $active={activeTab === "evenements"} onClick={() => setActiveTab("evenements")}>
              🧙 Mes événements
            </TabBtn>
          )}
          {isOfficer && (
            <TabBtn $active={activeTab === "messages"} onClick={() => setActiveTab("messages")}>
              💬 Messages
              {unreadCount > 0 && <TabBadge>{unreadCount}</TabBadge>}
            </TabBtn>
          )}
          <TabBtn $active={activeTab === "profil"} onClick={() => setActiveTab("profil")}>
            👤 Profil
          </TabBtn>
        </TabBar>

        {/* ── Contenu : Aperçu ── */}
        {activeTab === "apercu" && (
          <>
            <SectionTitle>🎟️ Dernières inscriptions</SectionTitle>
            {loadingInsc ? (
              <Loading>Chargement…</Loading>
            ) : inscriptions.length === 0 ? (
              <Empty>
                Vous n'êtes inscrit à aucun événement pour le moment.
                <br />
                <BrowseLink href="/#events">Parcourir les événements →</BrowseLink>
              </Empty>
            ) : (
              inscriptions.slice(0, 3).map((insc, i) => (
                <Card key={insc.id} style={{ animationDelay: `${i * 0.04}s` }}>
                  <Info>
                    <EventTitleTxt>{insc.eventTitle}</EventTitleTxt>
                    <EventMeta>Catégorie : {insc.categorie}</EventMeta>
                  </Info>
                </Card>
              ))
            )}
            {inscriptions.length > 3 && (
              <BrowseLink href="#" onClick={(e) => { e.preventDefault(); setActiveTab("inscriptions"); }}>
                Voir toutes mes inscriptions ({inscriptions.length}) →
              </BrowseLink>
            )}
          </>
        )}

        {/* ── Contenu : Inscriptions ── */}
        {activeTab === "inscriptions" && (
          <>
            <SectionTitle>
              🎟️ Mes inscriptions
              {!loadingInsc && <Count>{inscriptions.length}</Count>}
            </SectionTitle>

            {loadingInsc ? (
              <Loading>Chargement…</Loading>
            ) : inscriptions.length === 0 ? (
              <Empty>
                Vous n'êtes inscrit à aucun événement pour le moment.
                <br />
                <BrowseLink href="/#events">Parcourir les événements →</BrowseLink>
              </Empty>
            ) : (
              inscriptions.map((insc, i) => (
                <Card key={insc.id} style={{ animationDelay: `${i * 0.04}s` }}>
                  <Info>
                    <EventTitleTxt>{insc.eventTitle}</EventTitleTxt>
                    <EventMeta>Catégorie : {insc.categorie}</EventMeta>
                  </Info>
                  <CancelBtn
                    onClick={() => annulerInscription(insc)}
                    disabled={cancellingId === insc.id}
                  >
                    {cancellingId === insc.id ? "Annulation…" : "Annuler"}
                  </CancelBtn>
                </Card>
              ))
            )}
          </>
        )}

        {/* ── Contenu : Mes événements (MJ) ── */}
        {activeTab === "evenements" && isMJ && (
          <>
            <SectionTitle>
              🧙 Mes événements
              {!loadingEvts && <Count>{events.length}</Count>}
            </SectionTitle>

            {loadingEvts ? (
              <Loading>Chargement…</Loading>
            ) : events.length === 0 ? (
              <Empty>
                Vous n'avez encore créé aucun événement.
                <br />
                <BrowseLink href="/proposer-evenement">➕ Proposer un événement</BrowseLink>
              </Empty>
            ) : (
              events.map((event, i) => {
                const isOpen = openEventId === event.id;
                const list = participants[event.id] || [];

                return (
                  <EventCard key={event.id} style={{ animationDelay: `${i * 0.04}s` }}>
                    <EventHeader onClick={() => toggleEvent(event.id)}>
                      <EventHeaderInfo>
                        <EventTitleTxt>{event.titre}</EventTitleTxt>
                        <EventMeta>{event.date} · {event.heure}</EventMeta>
                      </EventHeaderInfo>
                      <PlacesBadge>
                        {event.inscrits ?? 0}/{event.places} inscrits
                      </PlacesBadge>
                      <Chevron $open={isOpen}>▾</Chevron>
                    </EventHeader>

                    {isOpen && (
                      <ParticipantsList>
                        {loadingParticipants === event.id && (
                          <Muted>Chargement des inscrits…</Muted>
                        )}
                        {loadingParticipants !== event.id && list.length === 0 && (
                          <Muted>Aucun inscrit pour le moment.</Muted>
                        )}
                        {list.map(p => (
                          <ParticipantRow key={p.id}>
                            <ParticipantInfo>
                              <ParticipantName>{p.pseudo || p.nom}</ParticipantName>
                              <ParticipantEmail>{p.email}</ParticipantEmail>
                            </ParticipantInfo>
                            <RemoveBtn
                              onClick={() => retirerParticipant(event.id, p)}
                              disabled={removingId === p.id}
                            >
                              {removingId === p.id ? "…" : "Retirer"}
                            </RemoveBtn>
                          </ParticipantRow>
                        ))}
                      </ParticipantsList>
                    )}
                  </EventCard>
                );
              })
            )}
          </>
        )}

        {/* ── Contenu : Messages (bureau) ── */}
        {activeTab === "messages" && isOfficer && user && (
          <OfficerInbox currentUid={user.uid} />
        )}

        {/* ── Contenu : Profil ── */}
        {activeTab === "profil" && user && (
          <>
            <SectionTitle>👤 Mon profil</SectionTitle>
            <Profileniveauselector
              uid={user.uid}
              currentNiveau={profile?.niveau ?? null}
              onSaved={(niveau: NiveauChoice) => setProfile(prev => prev ? { ...prev, niveau } : prev)}
            />
            {isDebutant && (
              <div style={{ marginTop: "1rem" }}>
                <ContactOfficers
                  currentUid={user.uid}
                  currentName={profile?.pseudo || `${profile?.prenom || ""} ${profile?.nom || ""}`.trim() || "Aventurier"}
                />
              </div>
            )}
          </>
        )}

      </Container>
    </Page>
  );
}