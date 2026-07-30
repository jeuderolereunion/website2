"use client";
import styled, { keyframes } from "styled-components";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import Navigation from "@/components/Navigation";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Types ───────────────────────────────────────────────────────────────────

type UserDoc = {
  uid: string;
  pseudo?: string;
  prenom?: string;
  nom?: string;
  email?: string;
  role?: string;
  poste?: Poste;
  bio?: string;
  avatarUrl?: string;
  createdAt?: any;
  contact?: string;
  contactPublic?: boolean;
};

type Poste = "president" | "tresorier" | "secretaire";

type EventSummary = {
  id: string;
  titre: string;
  date: string;
  heure: string;
  categorie: string;
  annule?: boolean;
  places: number;
  inscrits: number;
};

const CAT_LABELS: Record<string, string> = {
  "soirees-jdr":  "🎲 Sessions JDR",
  "tournois":     "🏆 Tournois",
  "soirees-jeux": "🃏 Soirées Jeux",
  "animations":   "📖 Animations",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  mj: "Maître de jeu",
  joueur: "Joueur",
};

const POSTE_LABELS: Record<Poste, string> = {
  president: "Président",
  tresorier: "Trésorier",
  secretaire: "Secrétaire",
};

function getInitiales(nom: string): string {
  return nom.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function formatDateFr(dateISO: string): string {
  if (!dateISO) return "";
  const [date] = dateISO.split("T");
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return dateISO;
  return `${d}/${m}/${y}`;
}

function formatMembreDepuis(createdAt: any): string | null {
  if (!createdAt) return null;
  const d: Date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

// ─── Styled ──────────────────────────────────────────────────────────────────

const Page = styled.main`
  min-height: 100vh;
  background: #0d0d14;
  color: #fff;
  font-family: 'Inter', system-ui, sans-serif;
  padding-bottom: 5rem;
`;

const CenterState = styled.div`
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 6rem 1.5rem 2rem;
  text-align: center;
`;

const StateTitle = styled.h1`font-size: 1.4rem; font-weight: 700;`;
const StateSub = styled.p`
  font-size: 0.9rem;
  color: rgba(255,255,255,0.5);
  max-width: 420px;
`;

const BackLinkPlain = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.95rem;
  color: rgba(160,120,255,0.9);
  text-decoration: none;
  margin-top: 0.5rem;
  &:hover { color: #c8a8ff; }
`;

const Hero = styled.section`
  position: relative;
  padding: 6rem 1.5rem 2.5rem;
  background: linear-gradient(135deg, #3C3489, #534AB7);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const BackLink = styled(Link)`
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: rgba(255,255,255,0.6);
  text-decoration: none;
  &:hover { color: rgba(255,255,255,0.9); }
`;

const AvatarLarge = styled.div<{ $bg?: string }>`
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: ${p => p.$bg ? `url(${p.$bg}) center/cover` : "rgba(255,255,255,0.15)"};
  border: 3px solid rgba(255,255,255,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 1rem;
  animation: ${fadeUp} 0.4s ease both;
`;

const ProfileName = styled.h1`
  font-size: clamp(1.5rem, 3.5vw, 2.1rem);
  font-weight: 800;
  margin: 0 0 0.5rem;
`;

const RoleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
  color: #fff;
  margin-bottom: 0.75rem;
`;

const MemberSince = styled.p`
  font-size: 0.8rem;
  color: rgba(255,255,255,0.6);
  margin: 0;
`;

const EditProfileBtn = styled.button`
  margin-top: 1.25rem;
  padding: 0.5rem 1.2rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.1);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms;
  &:hover { background: rgba(255,255,255,0.2); }
`;

const Body = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Card = styled.div`
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  padding: 1.5rem;
`;

const SectionLabel = styled.p`
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(160,120,255,0.8);
  margin: 0 0 0.9rem;
`;

const Bio = styled.p`
  font-size: 0.9rem;
  color: rgba(255,255,255,0.7);
  line-height: 1.65;
  white-space: pre-line;
  margin: 0;
`;

const ContactRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.88rem;
  color: rgba(255,255,255,0.75);
  margin-top: 0.75rem;
`;

const NoContactHint = styled.p`
  font-size: 0.78rem;
  color: rgba(255,255,255,0.35);
  margin: 0.75rem 0 0;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
`;

const StatBox = styled.div`
  text-align: center;
  background: rgba(255,255,255,0.04);
  border-radius: 10px;
  padding: 0.9rem 0.5rem;
`;

const StatVal = styled.div`font-size: 1.3rem; font-weight: 800; color: #c8a8ff;`;
const StatLbl = styled.div`font-size: 0.7rem; color: rgba(255,255,255,0.4); margin-top: 3px;`;

const EventList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const EventRow = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  text-decoration: none;
  color: inherit;
  transition: background 150ms, border-color 150ms;
  &:hover { background: rgba(255,255,255,0.08); border-color: rgba(160,120,255,0.3); }
`;

const EventInfo = styled.div`min-width: 0;`;
const EventTitle = styled.p`
  font-size: 0.88rem;
  font-weight: 600;
  margin: 0 0 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const EventMeta = styled.p`
  font-size: 0.75rem;
  color: rgba(255,255,255,0.45);
  margin: 0;
`;

const EventCatPill = styled.span`
  font-size: 0.68rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(120,80,255,0.2);
  color: #c8a8ff;
  white-space: nowrap;
  flex-shrink: 0;
`;

const CancelledPill = styled.span`
  font-size: 0.68rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(255,80,80,0.15);
  color: #ff8080;
  white-space: nowrap;
  flex-shrink: 0;
`;

const EmptyEvents = styled.p`
  font-size: 0.85rem;
  color: rgba(255,255,255,0.35);
  padding: 0.5rem 0;
`;

// ── Modal édition profil ──────────────────────────────────────────────────

const ModalOverlay = styled.div`
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

const ModalBox = styled.div`
  background: #1a1a2e;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  padding: 1.75rem;
  width: 100%;
  max-width: 460px;
  max-height: 90vh;
  overflow-y: auto;
  animation: ${fadeUp} 0.25s ease both;
`;

const ModalTitle = styled.h2`font-size: 1.15rem; font-weight: 700; margin: 0 0 1.25rem;`;

const Field = styled.div`margin-bottom: 1rem;`;

const Label = styled.label`
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(160,120,255,0.8);
  margin-bottom: 0.4rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
  font-size: 0.88rem;
  outline: none;
  box-sizing: border-box;
  &:focus { border-color: rgba(160,120,255,0.5); background: rgba(255,255,255,0.09); }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
  font-size: 0.88rem;
  outline: none;
  resize: vertical;
  min-height: 80px;
  box-sizing: border-box;
  font-family: inherit;
  line-height: 1.6;
  &:focus { border-color: rgba(160,120,255,0.5); background: rgba(255,255,255,0.09); }
`;

const HintText = styled.p`
  font-size: 0.72rem;
  color: rgba(255,255,255,0.35);
  margin: 0.35rem 0 0;
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  user-select: none;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: #7c4dff;
  cursor: pointer;
`;

const ModalActions = styled.div`display: flex; gap: 0.75rem; margin-top: 1.5rem;`;

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

const SaveBtn = styled.button`
  flex: 2;
  padding: 0.6rem;
  border-radius: 8px;
  border: 1px solid rgba(160,120,255,0.5);
  background: rgba(120,80,255,0.25);
  color: #c8a8ff;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  &:hover { background: rgba(120,80,255,0.4); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ProfilClient({ userId }: { userId: string }) {
  const [profile, setProfile]   = useState<UserDoc | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [events, setEvents]         = useState<EventSummary[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const isOwnProfile = currentUser?.uid === userId;

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ bio: string; contact: string; contactPublic: boolean }>({
    bio: "",
    contact: "",
    contactPublic: false,
  });
  const [saving, setSaving] = useState(false);

  // ── Auth (pour savoir si c'est le profil du visiteur connecté) ─────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setCurrentUser(u));
    return () => unsub();
  }, []);

  // ── Chargement du profil ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    getDoc(doc(db, "users", userId)).then(snap => {
      if (cancelled) return;
      if (!snap.exists()) { setNotFound(true); setLoading(false); return; }
      const data = { uid: snap.id, ...snap.data() } as UserDoc;
      setProfile(data);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) { setNotFound(true); setLoading(false); }
    });

    return () => { cancelled = true; };
  }, [userId]);

  // ── Chargement des événements organisés par ce membre ──────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoadingEvents(true);

    getDocs(
      query(
        collection(db, "evenements"),
        where("mjId", "==", userId),
        orderBy("date", "desc")
      )
    ).then(snap => {
      if (cancelled) return;
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })) as EventSummary[]);
      setLoadingEvents(false);
    }).catch(() => {
      // Si l'index composite mjId+date n'existe pas encore côté Firestore,
      // on retombe sur une requête simple sans tri.
      getDocs(query(collection(db, "evenements"), where("mjId", "==", userId)))
        .then(snap => {
          if (cancelled) return;
          setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })) as EventSummary[]);
          setLoadingEvents(false);
        })
        .catch(() => { if (!cancelled) setLoadingEvents(false); });
    });

    return () => { cancelled = true; };
  }, [userId]);

  function openEdit() {
    if (!profile) return;
    setEditForm({
      bio: profile.bio ?? "",
      contact: profile.contact ?? "",
      contactPublic: profile.contactPublic ?? false,
    });
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!profile) return;
    setSaving(true);
    try {
      const payload = {
        bio: editForm.bio || "",
        contact: editForm.contact || "",
        contactPublic: !!editForm.contactPublic && !!editForm.contact,
      };
      await updateDoc(doc(db, "users", profile.uid), payload);
      setProfile(prev => prev ? { ...prev, ...payload } : prev);
      setEditOpen(false);
    } catch (err: any) {
      alert("Erreur lors de la sauvegarde : " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── États de chargement / erreur ──────────────────────────────────────────

  if (loading) {
    return (
      <Page>
        <Navigation />
        <CenterState><StateTitle>Chargement du profil…</StateTitle></CenterState>
      </Page>
    );
  }

  if (notFound || !profile) {
    return (
      <Page>
        <Navigation />
        <CenterState>
          <StateTitle>Profil introuvable</StateTitle>
          <StateSub>Ce membre n'existe pas ou son profil a été supprimé.</StateSub>
          <BackLinkPlain href="/">← Retour à l'accueil</BackLinkPlain>
        </CenterState>
      </Page>
    );
  }

  const displayName = profile.pseudo || `${profile.prenom ?? ""} ${profile.nom ?? ""}`.trim() || "Aventurier";
  const initiales = getInitiales(displayName);
  const roleLabel = profile.role ? ROLE_LABELS[profile.role] ?? profile.role : null;
  const membreDepuis = formatMembreDepuis(profile.createdAt);

  // Coordonnées affichées uniquement si consentement explicite ET valeur renseignée
  const afficherContact = !!profile.contactPublic && !!profile.contact;

  const now = new Date().toISOString().slice(0, 10);
  const eventsActifs = events.filter(e => !e.annule);
  const evenementsAVenir = eventsActifs.filter(e => e.date >= now);
  const evenementsPasses = eventsActifs.filter(e => e.date < now);

  return (
    <Page>
      <Navigation />

      <Hero>
        <BackLink href="/">← Accueil</BackLink>
        <AvatarLarge $bg={profile.avatarUrl}>
          {!profile.avatarUrl && initiales}
        </AvatarLarge>
        <ProfileName>{displayName}</ProfileName>
        {roleLabel && <RoleBadge>🎭 {roleLabel}</RoleBadge>}
        {profile.poste && (
  <RoleBadge>🏛️ {POSTE_LABELS[profile.poste]}</RoleBadge>
)}
        {membreDepuis && <MemberSince>Membre depuis {membreDepuis}</MemberSince>}
        {isOwnProfile && (
          <EditProfileBtn onClick={openEdit}>✏️ Modifier mon profil</EditProfileBtn>
        )}
      </Hero>

      <Body>
        {/* Bio + contact */}
        {(profile.bio || afficherContact || isOwnProfile) && (
          <Card>
            <SectionLabel>À propos</SectionLabel>
            {profile.bio ? (
              <Bio>{profile.bio}</Bio>
            ) : (
              <Bio style={{ color: "rgba(255,255,255,0.3)" }}>Aucune présentation renseignée.</Bio>
            )}

            {afficherContact ? (
              <ContactRow>✉️ {profile.contact}</ContactRow>
            ) : isOwnProfile ? (
              <NoContactHint>
                Vos coordonnées ne sont pas visibles publiquement. Vous pouvez les ajouter et choisir de les partager via « Modifier mon profil ».
              </NoContactHint>
            ) : null}
          </Card>
        )}

        {/* Stats */}
        <Card>
          <SectionLabel>Statistiques</SectionLabel>
          <StatsGrid>
            <StatBox>
              <StatVal>{eventsActifs.length}</StatVal>
              <StatLbl>Événements organisés</StatLbl>
            </StatBox>
            <StatBox>
              <StatVal>–</StatVal>
              <StatLbl>Note moyenne</StatLbl>
            </StatBox>
            <StatBox>
              <StatVal>–</StatVal>
              <StatLbl>Joueurs accueillis</StatLbl>
            </StatBox>
          </StatsGrid>
        </Card>

        {/* Événements à venir */}
        <Card>
          <SectionLabel>Événements à venir</SectionLabel>
          {loadingEvents ? (
            <EmptyEvents>Chargement…</EmptyEvents>
          ) : evenementsAVenir.length === 0 ? (
            <EmptyEvents>Aucun événement à venir pour le moment.</EmptyEvents>
          ) : (
            <EventList>
              {evenementsAVenir.map(ev => (
                <EventRow key={ev.id} href={`/evenements/${ev.categorie}/${ev.id}`}>
                  <EventInfo>
                    <EventTitle>{ev.titre}</EventTitle>
                    <EventMeta>{formatDateFr(ev.date)} · {ev.heure}</EventMeta>
                  </EventInfo>
                  {ev.annule ? (
                    <CancelledPill>Annulé</CancelledPill>
                  ) : (
                    <EventCatPill>{CAT_LABELS[ev.categorie] ?? ev.categorie}</EventCatPill>
                  )}
                </EventRow>
              ))}
            </EventList>
          )}
        </Card>

        {/* Historique */}
        {evenementsPasses.length > 0 && (
          <Card>
            <SectionLabel>Historique</SectionLabel>
            <EventList>
              {evenementsPasses.slice(0, 10).map(ev => (
                <EventRow key={ev.id} href={`/evenements/${ev.categorie}/${ev.id}`}>
                  <EventInfo>
                    <EventTitle>{ev.titre}</EventTitle>
                    <EventMeta>{formatDateFr(ev.date)} · {ev.heure}</EventMeta>
                  </EventInfo>
                  <EventCatPill>{CAT_LABELS[ev.categorie] ?? ev.categorie}</EventCatPill>
                </EventRow>
              ))}
            </EventList>
          </Card>
        )}
      </Body>

      {/* ── Modal édition profil ── */}
      {editOpen && (
        <ModalOverlay onClick={() => setEditOpen(false)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>✏️ Modifier mon profil</ModalTitle>

            <Field>
              <Label>Présentation</Label>
              <Textarea
                value={editForm.bio}
                onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Parlez un peu de vous, vos systèmes préférés, votre style de MJ…"
                rows={4}
              />
            </Field>

            <Field>
              <Label>Contact (email ou téléphone)</Label>
              <Input
                value={editForm.contact}
                onChange={e => setEditForm(f => ({ ...f, contact: e.target.value }))}
                placeholder="votremail@exemple.com"
              />
              <HintText>
                Ce contact n'est jamais partagé automatiquement — il ne sera visible sur votre profil et transmis aux joueurs de vos parties que si vous cochez la case ci-dessous.
              </HintText>
            </Field>

            <CheckboxRow>
              <Checkbox
                type="checkbox"
                checked={editForm.contactPublic}
                onChange={e => setEditForm(f => ({ ...f, contactPublic: e.target.checked }))}
              />
              J'accepte que mon contact soit visible publiquement sur mon profil
            </CheckboxRow>

            <ModalActions>
              <CancelBtn onClick={() => setEditOpen(false)}>Annuler</CancelBtn>
              <SaveBtn onClick={handleSaveEdit} disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </SaveBtn>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}
    </Page>
  );
}