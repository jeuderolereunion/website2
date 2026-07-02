"use client";

import styled from "styled-components";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Navigation from "@/components/Navigation";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

// ─── Types ────────────────────────────────────────────────────────────────────

type Proposition = {
  id: string;
  titre: string;
  description: string;
  categorie: string;
  date: string;
  heure: string;
  niveau: string;
  places: number;
  organisateur: string;
  email: string;
  image?: string;
  // ── Champs ajoutés depuis le formulaire "Proposer un événement" ───────────
  // Optionnels ici pour rester compatibles avec d'anciennes propositions
  // créées avant leur introduction.
  type?: string;              // "one-shot" | "campagne"
  systeme?: string;
  mjId?: string;
  mjNom?: string;
  lieuType?: "presentiel" | "ligne";
  lieuDetail?: string;
  lieuComplement?: string;
  ville?: string;
  duree?: string;
  personnages?: "pretires" | "creation";
  ageTag?: "tous" | "16" | "18";
};

type TypeRessource = "regles" | "fiche" | "carte" | "bestiaire" | "scenario";

type Ressource = {
  id: string;
  titre: string;
  type: TypeRessource;
  univers: string;
  taille: string;
  url: string;
};

// Ressource proposée par un utilisateur, en attente de validation admin
type PropositionRessource = {
  id: string;
  titre: string;
  type: TypeRessource;
  univers: string;
  taille: string;
  url: string;
  auteur?: string;
  email?: string;
  createdAt?: any;
};

type Utilisateur = {
  id: string;
  prenom?: string;
  nom?: string;
  pseudo?: string;
  email: string;
  role: string;
  status?: string;
  createdAt?: any;
};

type PendingUser = {
  id: string;
  prenom?: string;
  nom?: string;
  pseudo?: string;
  email: string;
  role: string;
  createdAt?: any;
};


// ─── Constantes ───────────────────────────────────────────────────────────────

const TYPES_RESSOURCE: { value: TypeRessource; label: string }[] = [
  { value: "regles",    label: "Règles & manuels" },
  { value: "fiche",     label: "Fiche de personnage" },
  { value: "carte",     label: "Carte & lieux" },
  { value: "bestiaire", label: "Bestiaire" },
  { value: "scenario",  label: "Scénario & aventure" },
];

const UNIVERS_SUGGESTIONS = [
  "Donjons & Dragons",
  "Pathfinder",
  "L'Appel de Cthulhu",
  "Warhammer",
  "Shadowrun",
  "Star Wars",
  "Cyberpunk Red",
];

const FORM_VIDE = {
  titre: "",
  type: "regles" as TypeRessource,
  univers: "",
  taille: "",
  url: "",
};

// ─── Styled components ────────────────────────────────────────────────────────

const Page = styled.main`
  min-height: 100vh;
  background: #0d0d14;
  color: white;
  padding: 5rem 1rem 3rem;

  @media (min-width: 640px) {
    padding: 6rem 2rem 3rem;
  }
`;

const Hero = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: clamp(1.5rem, 5vw, 2.8rem);
  font-weight: 800;
  margin-bottom: 0.4rem;
  line-height: 1.2;
`;

const Subtitle = styled.p`
  color: rgba(255,255,255,0.5);
  font-size: clamp(0.85rem, 2vw, 0.95rem);
`;

// ── Onglets ───────────────────────────────────────────────────────────────────

const Tabs = styled.div`
  display: flex;
  gap: 0.5rem;
  max-width: 1100px;
  margin: 0 auto 2rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 0.35rem;
  flex-wrap: wrap;
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  min-width: 120px;
  padding: 0.65rem 1rem;
  border-radius: 9px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: clamp(0.82rem, 2vw, 0.9rem);
  transition: all 0.15s;
  background: ${p => p.$active ? "rgba(120,80,255,0.25)" : "transparent"};
  color: ${p => p.$active ? "rgba(180,150,255,1)" : "rgba(255,255,255,0.4)"};
  border: ${p => p.$active ? "1px solid rgba(160,120,255,0.3)" : "1px solid transparent"};

  &:hover:not([data-active="true"]) {
    color: rgba(255,255,255,0.7);
  }
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.4rem;
  background: rgba(120,80,255,0.3);
  color: rgba(200,180,255,1);
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 1px 7px;
`;

// ── Événements / Comptes (grille commune) ─────────────────────────────────────

const Grid = styled.div`
  max-width: 1100px;
  margin: auto;
  display: grid;
  gap: 1rem;
`;

const Card = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  overflow: hidden;
  transition: .2s;

  &:hover { border-color: rgba(160,120,255,0.3); }

  @media (hover: none) {
    &:hover { transform: none; }
  }
`;

const CardHeader = styled.div`
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, rgba(120,80,255,0.2), rgba(120,80,255,0.05));
`;

const CardTitle = styled.h2`
  margin: 0;
  font-size: clamp(1rem, 3vw, 1.15rem);
  line-height: 1.3;
  word-break: break-word;
`;

const CardBody = styled.div`
  padding: 1rem 1.25rem;
`;

const Description = styled.p`
  color: rgba(255,255,255,0.65);
  line-height: 1.6;
  font-size: clamp(0.85rem, 2vw, 0.95rem);
  word-break: break-word;
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin-top: 0.75rem;
`;

const MetaBadge = styled.div`
  padding: .3rem .65rem;
  border-radius: 999px;
  background: rgba(255,255,255,0.07);
  font-size: clamp(0.75rem, 2vw, 0.82rem);
  white-space: nowrap;
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: .6rem;
  margin-top: 1.25rem;

  @media (min-width: 400px) {
    flex-direction: row;
    flex-wrap: wrap;
  }
`;

const ValidateBtn = styled.button`
  flex: 1;
  min-width: 110px;
  padding: .7rem 1rem;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: clamp(0.82rem, 2.5vw, 0.9rem);
  background: rgba(0,255,120,0.12);
  color: #5dff9d;
  transition: background 0.15s;

  &:hover  { background: rgba(0,255,120,0.22); }
  &:active { background: rgba(0,255,120,0.32); }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RejectBtn = styled.button`
  flex: 1;
  min-width: 110px;
  padding: .7rem 1rem;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: clamp(0.82rem, 2.5vw, 0.9rem);
  background: rgba(255,80,80,0.12);
  color: #ff7b7b;
  transition: background 0.15s;

  &:hover  { background: rgba(255,80,80,0.22); }
  &:active { background: rgba(255,80,80,0.32); }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// ── Ressources ────────────────────────────────────────────────────────────────

const RessourcesLayout = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  gap: 1.5rem;

  @media (min-width: 900px) {
    grid-template-columns: 360px 1fr;
    align-items: start;
  }
`;

const FormCard = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 1.5rem;

  @media (min-width: 900px) {
    position: sticky;
    top: 5rem;
  }
`;

const FormTitle = styled.h2`
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
`;

const Field = styled.div`
  margin-bottom: 0.9rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.45);
  margin-bottom: 0.35rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.6rem 0.85rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.06);
  color: white;
  font-size: 0.88rem;
  outline: none;
  transition: border-color 0.15s;

  &::placeholder { color: rgba(255,255,255,0.2); }
  &:focus { border-color: rgba(160,120,255,0.5); }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.6rem 0.85rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(30,20,50,0.9);
  color: white;
  font-size: 0.88rem;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s;

  &:focus { border-color: rgba(160,120,255,0.5); }
`;

const SubmitBtn = styled.button`
  width: 100%;
  padding: 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(160,120,255,0.3);
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9rem;
  background: rgba(120,80,255,0.2);
  color: rgba(180,150,255,1);
  transition: all 0.15s;
  margin-top: 0.25rem;

  &:hover:not(:disabled) { background: rgba(120,80,255,0.35); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SuccessMsg = styled.div`
  margin-top: 0.65rem;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  background: rgba(0,200,100,0.1);
  color: #5dff9d;
  font-size: 0.82rem;
  text-align: center;
  border: 1px solid rgba(0,200,100,0.2);
`;

const ErrorMsg = styled.div`
  margin-top: 0.65rem;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  background: rgba(255,80,80,0.1);
  color: #ff7b7b;
  font-size: 0.82rem;
  text-align: center;
  border: 1px solid rgba(255,80,80,0.2);
`;

const ListHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const ListTitle = styled.h2`
  font-size: 1rem;
  font-weight: 700;
`;

const ListCount = styled.span`
  font-size: 0.78rem;
  color: rgba(255,255,255,0.4);
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
`;

const RessourceItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.8rem 1rem;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  margin-bottom: 0.5rem;
  transition: border-color 0.15s;

  &:hover { border-color: rgba(255,255,255,0.13); }
`;

const ItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemTitre = styled.p`
  font-size: 0.88rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemMeta = styled.p`
  font-size: 0.75rem;
  color: rgba(255,255,255,0.38);
  margin-top: 2px;
`;

const TypePill = styled.span`
  font-size: 0.7rem;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(120,80,255,0.15);
  color: rgba(180,150,255,1);
  white-space: nowrap;
  flex-shrink: 0;
`;

const RolePill = styled.span<{ $mj?: boolean }>`
  font-size: 0.7rem;
  padding: 3px 8px;
  border-radius: 999px;
  background: ${p => p.$mj ? "rgba(255,180,80,0.15)" : "rgba(120,80,255,0.15)"};
  color: ${p => p.$mj ? "rgba(255,200,120,1)" : "rgba(180,150,255,1)"};
  white-space: nowrap;
  flex-shrink: 0;
`;

const LinkBtn = styled.a`
  padding: 0.35rem 0.65rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.35);
  font-size: 0.75rem;
  text-decoration: none;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover { background: rgba(255,255,255,0.07); color: white; }
`;

const DeleteBtn = styled.button`
  padding: 0.35rem 0.65rem;
  border-radius: 8px;
  border: 1px solid rgba(255,80,80,0.18);
  background: rgba(255,80,80,0.07);
  color: #ff7b7b;
  font-size: 0.75rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover { background: rgba(255,80,80,0.18); }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Empty = styled.p`
  text-align: center;
  color: rgba(255,255,255,0.3);
  padding: 2.5rem;
  font-size: 0.9rem;
`;

const Loading = styled.p`
  text-align: center;
  color: rgba(255,255,255,0.3);
  padding: 2rem;
  font-size: 0.9rem;
`;

// Sous-section "propositions de ressources en attente" dans l'onglet Ressources
const SubSection = styled.div`
  margin-bottom: 2rem;
`;

const SubSectionTitle = styled.h3`
  font-size: 0.9rem;
  font-weight: 700;
  color: rgba(255,200,120,1);
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const PropositionCard = styled.div`
  background: rgba(255,180,80,0.05);
  border: 1px solid rgba(255,180,80,0.2);
  border-radius: 14px;
  padding: 1rem 1.25rem;
  margin-bottom: 0.75rem;
`;

const PropositionHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AdminPage() {
  const [authorized, setAuthorized]     = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [onglet, setOnglet] = useState<"evenements" | "ressources" | "comptes" | "membres">("comptes");
  const [membres, setMembres]             = useState<Utilisateur[]>([]);
  const [loadingMembres, setLoadingMembres] = useState(true);
const [rechercheMembre, setRechercheMembre] = useState("");
const [filtreRole, setFiltreRole]        = useState<"tous" | "joueur" | "mj">("tous");
  // ── État événements ────────────────────────────────────────────────────────
  const [propositions, setPropositions]   = useState<Proposition[]>([]);
  const [loadingEvts, setLoadingEvts]     = useState(true);

  // ── État ressources ────────────────────────────────────────────────────────
  const [ressources, setRessources]       = useState<Ressource[]>([]);
  const [loadingRes, setLoadingRes]       = useState(true);
  const [form, setForm]                   = useState(FORM_VIDE);
  const [submitting, setSubmitting]       = useState(false);
  const [message, setMessage]             = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // ── État propositions de ressources (soumises par les utilisateurs) ───────
  const [propositionsRessources, setPropositionsRessources] = useState<PropositionRessource[]>([]);
  const [loadingPropRes, setLoadingPropRes]                 = useState(true);

  // ── État comptes en attente ───────────────────────────────────────────────
  const [pendingUsers, setPendingUsers]   = useState<PendingUser[]>([]);
  const [loadingUsers, setLoadingUsers]   = useState(true);

  // ── Garde anti-double-clic ─────────────────────────────────────────────────
  // Regroupe les IDs (événements, ressources, comptes, propositions...) en cours
  // de traitement, pour désactiver les boutons et bloquer les appels concurrents.
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
const nbJoueurs = membres.filter(u => u.role !== "mj").length;
const nbMJ      = membres.filter(u => u.role === "mj").length;

const membresFiltres = membres.filter(u => {
  const matchRole = filtreRole === "tous"
    ? true
    : filtreRole === "mj" ? u.role === "mj" : u.role !== "mj";
  const texte = `${u.prenom || ""} ${u.nom || ""} ${u.pseudo || ""} ${u.email}`.toLowerCase();
  return matchRole && texte.includes(rechercheMembre.toLowerCase());
});
  function startProcessing(id: string) {
    setProcessingIds(prev => new Set(prev).add(id));
  }

  function stopProcessing(id: string) {
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = "/login"; return; }

      const userSnap = await getDoc(doc(db, "users", user.uid));

      if (
        !userSnap.exists() ||
        userSnap.data().role !== "admin"
      ) {
        window.location.href = "/";
        return;
      }
      setAuthorized(true);
      setCheckingAuth(false);
      chargerPropositions();
      chargerRessources();
      chargerPropositionsRessources();
      chargerComptesEnAttente();
      chargerMembres();
    });
    return () => unsub();
  }, []);

  // ── Chargements ───────────────────────────────────────────────────────────

  async function chargerPropositions() {
    setLoadingEvts(true);
    const snap = await getDocs(collection(db, "propositions_evenements"));
    setPropositions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Proposition[]);
    setLoadingEvts(false);
  }

  async function chargerMembres() {
  setLoadingMembres(true);
  const snap = await getDocs(collection(db, "users"));
  const tous = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Utilisateur[];
  // On exclut les comptes encore en attente, déjà gérés dans l'onglet Comptes
  setMembres(tous.filter(u => u.status !== "pending"));
  setLoadingMembres(false);
}

  async function chargerRessources() {
    setLoadingRes(true);
    const snap = await getDocs(collection(db, "ressources"));
    setRessources(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Ressource[]);
    setLoadingRes(false);
  }

  async function chargerPropositionsRessources() {
    setLoadingPropRes(true);
    const snap = await getDocs(collection(db, "propositions_ressources"));
    setPropositionsRessources(snap.docs.map(d => ({ id: d.id, ...d.data() })) as PropositionRessource[]);
    setLoadingPropRes(false);
  }

  async function chargerComptesEnAttente() {
    setLoadingUsers(true);
    const snap = await getDocs(
      query(collection(db, "users"), where("status", "==", "pending"))
    );
    setPendingUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })) as PendingUser[]);
    setLoadingUsers(false);
  }

  // ── Actions comptes ───────────────────────────────────────────────────────

  async function validerCompte(userId: string) {
    if (processingIds.has(userId)) return;
    startProcessing(userId);
    try {
      await updateDoc(doc(db, "users", userId), { status: "active" });
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la validation du compte.");
    } finally {
      stopProcessing(userId);
    }
  }

  async function refuserCompte(userId: string) {
    if (processingIds.has(userId)) return;
    if (!confirm("Refuser et supprimer ce compte ? Cette action est irréversible côté Firestore (le compte d'authentification devra être supprimé séparément).")) return;
    startProcessing(userId);
    try {
      await deleteDoc(doc(db, "users", userId));
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error(err);
      alert("Erreur lors du refus du compte.");
    } finally {
      stopProcessing(userId);
    }
  }

  // ── Actions événements ────────────────────────────────────────────────────

  async function accepterEvenement(event: Proposition) {
    if (processingIds.has(event.id)) return; // évite le double-clic / double-soumission
    startProcessing(event.id);
    try {
      await addDoc(collection(db, "evenements"), {
        titre: event.titre,
        description: event.description,
        categorie: event.categorie,
        date: event.date,
        heure: event.heure,
        niveau: event.niveau,
        places: event.places,
        inscrits: 0,
        image: event.image || "",
        mjId: event.mjId || null,
        // ── Champs ajoutés par le formulaire "Proposer un événement" ──────
        // ⚠️ FIX : ces champs étaient collectés dans le formulaire mais
        // jamais recopiés vers "evenements" lors de la validation — ils
        // disparaissaient silencieusement. On les reporte désormais tels
        // quels, avec des valeurs de repli pour les anciennes propositions
        // qui ne les avaient pas encore.
        type:           event.type || "one-shot",
        systeme:        event.systeme || "",
        mjNom:          event.mjNom || event.organisateur || "",
        lieuType:       event.lieuType || "presentiel",
        lieuDetail:     event.lieuDetail || "",
        lieuComplement: event.lieuComplement || "",
        ville:          event.ville || "",
        duree:          event.duree || "",
        personnages:    event.personnages || "pretires",
        ageTag:         event.ageTag || "tous",
      });
      await deleteDoc(doc(db, "propositions_evenements", event.id));
      // Mise à jour optimiste : on retire l'item localement sans refaire
      // un aller-retour réseau complet (évite la fenêtre où la carte
      // reste affichée et cliquable pendant le rechargement).
      setPropositions(prev => prev.filter(p => p.id !== event.id));
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la validation de l'événement.");
    } finally {
      stopProcessing(event.id);
    }
  }

  async function supprimerProposition(id: string) {
    if (processingIds.has(id)) return;
    if (!confirm("Refuser cette proposition ?")) return;
    startProcessing(id);
    try {
      await deleteDoc(doc(db, "propositions_evenements", id));
      setPropositions(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
      alert("Erreur lors du refus de la proposition.");
    } finally {
      stopProcessing(id);
    }
  }

  // ── Actions ressources (ajout direct par l'admin) ─────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titre || !form.univers || !form.url) {
      setMessage({ type: "err", text: "Remplissez tous les champs obligatoires." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await addDoc(collection(db, "ressources"), {
        ...form,
        createdAt: serverTimestamp(),
      });
      setMessage({ type: "ok", text: "Ressource ajoutée !" });
      setForm(FORM_VIDE);
      chargerRessources();
    } catch (err) {
      console.error(err);
      setMessage({ type: "err", text: "Erreur lors de l'ajout." });
    } finally {
      setSubmitting(false);
    }
  }

  async function supprimerRessource(id: string, titre: string) {
    if (processingIds.has(id)) return;
    if (!confirm(`Supprimer "${titre}" ?`)) return;
    startProcessing(id);
    try {
      await deleteDoc(doc(db, "ressources", id));
      setRessources(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la suppression de la ressource.");
    } finally {
      stopProcessing(id);
    }
  }

  // ── Actions propositions de ressources (soumises par les utilisateurs) ────

  async function accepterRessource(proposition: PropositionRessource) {
    if (processingIds.has(proposition.id)) return;
    startProcessing(proposition.id);
    try {
      await addDoc(collection(db, "ressources"), {
        titre: proposition.titre,
        type: proposition.type,
        univers: proposition.univers,
        taille: proposition.taille,
        url: proposition.url,
        createdAt: serverTimestamp(),
      });
      await deleteDoc(doc(db, "propositions_ressources", proposition.id));
      setPropositionsRessources(prev => prev.filter(p => p.id !== proposition.id));
      chargerRessources();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la validation de la ressource.");
    } finally {
      stopProcessing(proposition.id);
    }
  }

  async function refuserPropositionRessource(id: string) {
    if (processingIds.has(id)) return;
    if (!confirm("Refuser cette proposition de ressource ?")) return;
    startProcessing(id);
    try {
      await deleteDoc(doc(db, "propositions_ressources", id));
      setPropositionsRessources(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
      alert("Erreur lors du refus de la ressource.");
    } finally {
      stopProcessing(id);
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (checkingAuth) return null;
  if (!authorized)  return null;

  return (
    <Page>
      <Navigation></Navigation>
      <Hero>
        <Title>⚙️ Administration</Title>
        <Subtitle>Gestion des comptes, événements et ressources</Subtitle>
      </Hero>

      <Tabs>
        <Tab
          $active={onglet === "comptes"}
          onClick={() => setOnglet("comptes")}
        >
          👥 Comptes
          {pendingUsers.length > 0 && <Badge>{pendingUsers.length}</Badge>}
        </Tab>
        <Tab
  $active={onglet === "membres"}
  onClick={() => setOnglet("membres")}
>
  🧑‍🤝‍🧑 Membres
  <Badge>{membres.length}</Badge>
</Tab>
        <Tab
          $active={onglet === "evenements"}
          onClick={() => setOnglet("evenements")}
        >
          📬 Événements
          {propositions.length > 0 && <Badge>{propositions.length}</Badge>}
        </Tab>
        <Tab
          $active={onglet === "ressources"}
          onClick={() => setOnglet("ressources")}
        >
          📚 Ressources
          {propositionsRessources.length > 0 && <Badge>{propositionsRessources.length}</Badge>}
        </Tab>
      </Tabs>

      {/* ── Onglet Comptes en attente ── */}
      {onglet === "comptes" && (
        <Grid>
          {loadingUsers && <Loading>Chargement…</Loading>}

          {!loadingUsers && pendingUsers.length === 0 && (
            <Empty>Aucun compte en attente de validation.</Empty>
          )}

          {pendingUsers.map(u => {
            const busy = processingIds.has(u.id);
            return (
              <Card key={u.id}>
                <CardHeader>
                  <CardTitle>
                    {u.prenom && u.nom ? `${u.prenom} ${u.nom}` : (u.pseudo || "Utilisateur")}
                  </CardTitle>
                </CardHeader>

                <CardBody>
                  <Description>{u.email}</Description>

                  <MetaRow>
                    <RolePill $mj={u.role === "mj"}>
                      {u.role === "mj" ? "🧙 MJ & Joueur" : "🎲 Joueur"}
                    </RolePill>
                  </MetaRow>

                  <Actions>
                    <ValidateBtn disabled={busy} onClick={() => validerCompte(u.id)}>
                      {busy ? "⏳ Validation…" : "✅ Valider"}
                    </ValidateBtn>
                    <RejectBtn disabled={busy} onClick={() => refuserCompte(u.id)}>
                      {busy ? "⏳ …" : "❌ Refuser"}
                    </RejectBtn>
                  </Actions>
                </CardBody>
              </Card>
            );
          })}
        </Grid>
      )}

      {onglet === "membres" && (
  <Grid>
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
      <Input
        placeholder="Rechercher un nom, pseudo ou email…"
        value={rechercheMembre}
        onChange={e => setRechercheMembre(e.target.value)}
        style={{ flex: 1, minWidth: "200px" }}
      />
      <Select
        value={filtreRole}
        onChange={e => setFiltreRole(e.target.value as any)}
        style={{ maxWidth: "160px" }}
      >
        <option value="tous">Tous ({membres.length})</option>
        <option value="joueur">Joueurs ({nbJoueurs})</option>
        <option value="mj">MJ ({nbMJ})</option>
      </Select>
    </div>

    {loadingMembres && <Loading>Chargement…</Loading>}

    {!loadingMembres && membresFiltres.length === 0 && (
      <Empty>Aucun membre ne correspond à cette recherche.</Empty>
    )}

    {membresFiltres.map(u => (
      <Card key={u.id}>
        <CardHeader>
          <CardTitle>
            {u.prenom && u.nom ? `${u.prenom} ${u.nom}` : (u.pseudo || "Utilisateur")}
          </CardTitle>
        </CardHeader>
        <CardBody>
          <Description>{u.email}</Description>
          <MetaRow>
            <RolePill $mj={u.role === "mj"}>
              {u.role === "mj" ? "🧙 MJ & Joueur" : "🎲 Joueur"}
            </RolePill>
          </MetaRow>
        </CardBody>
      </Card>
    ))}
  </Grid>
)}

      {/* ── Onglet Événements ── */}
      {onglet === "evenements" && (
        <Grid>
          {loadingEvts && <Loading>Chargement…</Loading>}

          {!loadingEvts && propositions.length === 0 && (
            <Empty>Aucune proposition en attente.</Empty>
          )}

          {propositions.map(event => {
            const busy = processingIds.has(event.id);
            return (
              <Card key={event.id}>
                <CardHeader>
                  <CardTitle>{event.titre}</CardTitle>
                </CardHeader>

                {event.image && (
                  <img
                    src={event.image}
                    alt={event.titre}
                    style={{
                      width: "100%",
                      height: "160px",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                )}

                <CardBody>
                  <Description>{event.description}</Description>

                  <MetaRow>
                    <MetaBadge>📅 {event.date}</MetaBadge>
                    <MetaBadge>🕒 {event.heure}</MetaBadge>
                    <MetaBadge>🎲 {event.categorie}</MetaBadge>
                    <MetaBadge>⭐ {event.niveau}</MetaBadge>
                    <MetaBadge>👥 {event.places} places</MetaBadge>
                    <MetaBadge>👤 {event.organisateur}</MetaBadge>
                    {event.systeme && <MetaBadge>🎯 {event.systeme}</MetaBadge>}
                    {event.type && <MetaBadge>{event.type === "campagne" ? "📖 Campagne" : "⚡ One-Shot"}</MetaBadge>}
                    <MetaBadge>
                      {event.lieuType === "ligne" ? "💻 En ligne" : "📍 Présentiel"}
                      {event.ville ? ` · ${event.ville}` : ""}
                    </MetaBadge>
                    {event.lieuDetail && <MetaBadge>🗺️ {event.lieuDetail}</MetaBadge>}
                    {event.duree && <MetaBadge>⏱️ {event.duree}</MetaBadge>}
                    {event.ageTag && event.ageTag !== "tous" && (
                      <MetaBadge>🔞 {event.ageTag}+</MetaBadge>
                    )}
                  </MetaRow>

                  <Actions>
                    <ValidateBtn disabled={busy} onClick={() => accepterEvenement(event)}>
                      {busy ? "⏳ Validation…" : "✅ Valider"}
                    </ValidateBtn>
                    <RejectBtn disabled={busy} onClick={() => supprimerProposition(event.id)}>
                      {busy ? "⏳ …" : "❌ Refuser"}
                    </RejectBtn>
                  </Actions>
                </CardBody>
              </Card>
            );
          })}
        </Grid>
      )}

      {/* ── Onglet Ressources ── */}
      {onglet === "ressources" && (
        <RessourcesLayout>

          {/* Formulaire d'ajout direct (par l'admin) */}
          <FormCard>
            <FormTitle>➕ Ajouter une ressource</FormTitle>

            <form onSubmit={handleSubmit}>
              <Field>
                <Label htmlFor="titre">Titre *</Label>
                <Input
                  id="titre"
                  placeholder="Ex : Manuel du joueur v5"
                  value={form.titre}
                  onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                />
              </Field>

              <Field>
                <Label htmlFor="type">Type *</Label>
                <Select
                  id="type"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as TypeRessource }))}
                >
                  {TYPES_RESSOURCE.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </Field>

              <Field>
                <Label htmlFor="univers">Univers *</Label>
                <Input
                  id="univers"
                  list="univers-list"
                  placeholder="Ex : Donjons & Dragons"
                  value={form.univers}
                  onChange={e => setForm(f => ({ ...f, univers: e.target.value }))}
                />
                <datalist id="univers-list">
                  {UNIVERS_SUGGESTIONS.map(u => <option key={u} value={u} />)}
                </datalist>
              </Field>

              <Field>
                <Label htmlFor="taille">Taille du fichier</Label>
                <Input
                  id="taille"
                  placeholder="Ex : 3.2 Mo"
                  value={form.taille}
                  onChange={e => setForm(f => ({ ...f, taille: e.target.value }))}
                />
              </Field>

              <Field>
                <Label htmlFor="url">Lien Mega *</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://mega.nz/file/..."
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                />
              </Field>

              <SubmitBtn type="submit" disabled={submitting}>
                {submitting ? "Ajout en cours…" : "Ajouter la ressource"}
              </SubmitBtn>

              {message?.type === "ok"  && <SuccessMsg>{message.text}</SuccessMsg>}
              {message?.type === "err" && <ErrorMsg>{message.text}</ErrorMsg>}
            </form>
          </FormCard>

          {/* Liste + propositions en attente */}
          <div>

            {/* Propositions soumises par les utilisateurs, en attente de validation */}
            <SubSection>
              <SubSectionTitle>
                ⏳ Propositions en attente
                {propositionsRessources.length > 0 && <Badge>{propositionsRessources.length}</Badge>}
              </SubSectionTitle>

              {loadingPropRes && <Loading>Chargement…</Loading>}

              {!loadingPropRes && propositionsRessources.length === 0 && (
                <Empty>Aucune proposition de ressource en attente.</Empty>
              )}

              {propositionsRessources.map(p => {
                const busy = processingIds.has(p.id);
                return (
                  <PropositionCard key={p.id}>
                    <PropositionHeader>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <ItemTitre>{p.titre}</ItemTitre>
                        <ItemMeta>
                          {p.univers} · {p.taille || "taille non renseignée"}
                          {p.email ? ` · proposé par ${p.auteur || p.email}` : ""}
                        </ItemMeta>
                      </div>
                      <TypePill>
                        {TYPES_RESSOURCE.find(t => t.value === p.type)?.label ?? p.type}
                      </TypePill>
                    </PropositionHeader>

                    <MetaRow>
                      <LinkBtn href={p.url} target="_blank" rel="noopener noreferrer">
                        🔗 Voir le lien
                      </LinkBtn>
                    </MetaRow>

                    <Actions>
                      <ValidateBtn disabled={busy} onClick={() => accepterRessource(p)}>
                        {busy ? "⏳ Validation…" : "✅ Valider"}
                      </ValidateBtn>
                      <RejectBtn disabled={busy} onClick={() => refuserPropositionRessource(p.id)}>
                        {busy ? "⏳ …" : "❌ Refuser"}
                      </RejectBtn>
                    </Actions>
                  </PropositionCard>
                );
              })}
            </SubSection>

            {/* Ressources déjà publiées */}
            <ListHeader>
              <ListTitle>Ressources en ligne</ListTitle>
              <ListCount>{ressources.length} fichier{ressources.length > 1 ? "s" : ""}</ListCount>
            </ListHeader>

            {loadingRes && <Loading>Chargement…</Loading>}

            {!loadingRes && ressources.length === 0 && (
              <Empty>Aucune ressource pour l'instant.</Empty>
            )}

            {ressources.map(r => {
              const busy = processingIds.has(r.id);
              return (
                <RessourceItem key={r.id}>
                  <ItemInfo>
                    <ItemTitre>{r.titre}</ItemTitre>
                    <ItemMeta>{r.univers} · {r.taille || "taille non renseignée"}</ItemMeta>
                  </ItemInfo>

                  <TypePill>
                    {TYPES_RESSOURCE.find(t => t.value === r.type)?.label ?? r.type}
                  </TypePill>

                  <LinkBtn href={r.url} target="_blank" rel="noopener noreferrer">↗</LinkBtn>

                  <DeleteBtn disabled={busy} onClick={() => supprimerRessource(r.id, r.titre)}>
                    {busy ? "…" : "Supprimer"}
                  </DeleteBtn>
                </RessourceItem>
              );
            })}
          </div>

        </RessourcesLayout>
      )}
    </Page>
  );
}