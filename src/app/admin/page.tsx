"use client";

import styled from "styled-components";
import { useEffect, useState, useMemo } from "react";
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
   setDoc, 
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

type TableAnimee = {
  id: string;
  animationId: string;
  mjId: string;
  mjNom: string;
  titre: string;
  systeme: string;
  description: string;
  places: number;
  inscrits: number;
  heure?: string;
  status?: "pending" | "approved" | "rejected";  // ← ajouté
  createdAt?: any;
};

type InscriptionAnimation = {
  id: string;
  animationId: string;
  userId: string;
  prenom?: string;
  nom?: string;
  pseudo?: string;
  email: string;
  createdAt?: any;
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

const FORM_ANIMATION_VIDE = {
  titre: "",
  description: "",
  categorie: "animations",
  date: "",
  heure: "20:00",
  duree: "3h",
  niveau: "Tous niveaux",
  places: 6,
  systeme: "",
  tags: "",
  image: "",
  lieuType: "presentiel" as "presentiel" | "ligne",
  lieu: "",              // ← remplace ville + adresse : slug choisi dans LIEUX
  lieuDetail: "",         // reste utilisé uniquement si lieuType === "ligne"
  mjId: "",
  mjNom: "",
  recurrence: "unique" as "unique" | "hebdomadaire",
};

const NOM_JOUR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];


const LIEUX: Record<string, { label: string; ville: string; adresse: string }> = {
  "3brasseurs": { label: "3 Brasseurs (Saint-Paul)", ville: "Saint-Paul", adresse: "Front de mer, Saint-Paul" },
  "la-kour":    { label: "La Kour (Saint-Leu)",       ville: "Saint-Leu", adresse: "La Kour, Saint-Leu" },
  "qg-tampon":  { label: "QG association (Le Tampon)", ville: "Le Tampon", adresse: "Le Tampon" },
};
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

const EditGroupBox = styled.div`
  margin-top: 0.75rem;
  padding: 1rem;
  border-radius: 12px;
  background: rgba(120,80,255,0.05);
  border: 1px solid rgba(160,120,255,0.25);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ImagePreviewWrap = styled.div`
  position: relative;
  width: 100%;
  max-width: 220px;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255,255,255,0.05);
  border: 0.5px solid rgba(255,255,255,0.1);
`;

const ImagePreviewImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const UploadLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  border: 1px dashed rgba(160,120,255,0.4);
  background: rgba(120,80,255,0.08);
  color: #c8a8ff;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  width: fit-content;
  &:hover { background: rgba(120,80,255,0.16); }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const UploadProgressBar = styled.div<{ $pct: number }>`
  width: 100%;
  max-width: 220px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  overflow: hidden;
  position: relative;
  margin-top: 0.4rem;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    width: ${p => p.$pct ?? 0}%;
    background: linear-gradient(90deg, #7c4dff, #c8a8ff);
    transition: width 150ms;
  }
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

type AnimationPubliee = {
  id: string;
  titre: string;
  description: string;
  categorie: string;
  date: string;
  heure: string;
  duree?: string;
  niveau: string;
  places: number;
  inscrits: number;
  systeme?: string;
  tags?: string[];
  image?: string;
  lieuType?: "presentiel" | "ligne";
  lieu?: string;          // ← ajouté : slug du lieu, ex "3brasseurs"
  adresse?: string;
  ville?: string;
  lieuDetail?: string;
  mjId?: string;
  mjNom?: string;
  recurrent?: boolean;
  recurrenceId?: string;
};

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AdminPage() {
  const [formAnim, setFormAnim] = useState(FORM_ANIMATION_VIDE);
  const [submittingAnim, setSubmittingAnim] = useState(false);
  const [messageAnim, setMessageAnim] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [mjs, setMjs] = useState<{ id: string; nom: string }[]>([]);
const [editingOccurrence, setEditingOccurrence] = useState<string | null>(null);
const [editDate, setEditDate] = useState("");
const [editHeure, setEditHeure] = useState("");
  const [animations, setAnimations] = useState<AnimationPubliee[]>([]);
  const [loadingAnimations, setLoadingAnimations] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // ── Onglets ────────────────────────────────────────────────────────────────
  // "evenements"        → propositions d'événements classiques soumises par les
  //                        joueurs/MJ (collection "propositions_evenements")
  // "animations"        → création/suivi des animations gérées directement par
  //                        l'admin (collection "evenements", categorie "animations")
  // "tables"            → tables proposées par les MJ sur les animations
  // "inscriptions-anim" → inscriptions des joueurs aux animations
  const [onglet, setOnglet] = useState<
    | "evenements"
    | "ressources"
    | "comptes"
    | "membres"
    | "animations"
    | "tables"
    | "inscriptions-anim"
  >("comptes");

  const [membres, setMembres] = useState<Utilisateur[]>([]);
  const [loadingMembres, setLoadingMembres] = useState(true);
  const [rechercheMembre, setRechercheMembre] = useState("");
  const [filtreRole, setFiltreRole] = useState<"tous" | "joueur" | "mj">("tous");

  // ── État événements ────────────────────────────────────────────────────────
  const [propositions, setPropositions] = useState<Proposition[]>([]);
  const [loadingEvts, setLoadingEvts] = useState(true);
  const [formAnimUploadPct, setFormAnimUploadPct] = useState<number | null>(null);

const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
const [editGroupForm, setEditGroupForm] = useState<{
  places: number;
  image: string;
  recurrence: "unique" | "hebdomadaire";
}>({ places: 6, image: "", recurrence: "unique" });
const [editGroupUploadPct, setEditGroupUploadPct] = useState<number | null>(null);
const [savingGroup, setSavingGroup] = useState(false);
  const [tables, setTables] = useState<TableAnimee[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [inscriptionsAnim, setInscriptionsAnim] = useState<InscriptionAnimation[]>([]);
  const [loadingInscAnim, setLoadingInscAnim] = useState(true);

  // ── État ressources ────────────────────────────────────────────────────────
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [loadingRes, setLoadingRes] = useState(true);
  const [form, setForm] = useState(FORM_VIDE);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // ── État propositions de ressources (soumises par les utilisateurs) ───────
  const [propositionsRessources, setPropositionsRessources] = useState<PropositionRessource[]>([]);
  const [loadingPropRes, setLoadingPropRes] = useState(true);

  // ── État comptes en attente ───────────────────────────────────────────────
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // ── Garde anti-double-clic ─────────────────────────────────────────────────
  // Regroupe les IDs (événements, ressources, comptes, propositions...) en cours
  // de traitement, pour désactiver les boutons et bloquer les appels concurrents.
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const nbJoueurs = membres.filter(u => u.role !== "mj").length;
  const nbMJ = membres.filter(u => u.role === "mj").length;

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
  function nettoyerUndefined<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj };
  for (const key in result) {
    if (result[key] === undefined) {
      delete result[key];
    }
  }
  return result;
}

  function ajouterJours(dateISO: string, jours: number): string {
    const [y, m, d] = dateISO.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + jours);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }

  // Vrai si la date (format ISO "YYYY-MM-DD") tombe entre aujourd'hui et
  // dans 31 jours — utilisé pour ne montrer/générer les occurrences
  // récurrentes que sur "le mois à venir".
  function estDansLeMoisAVenir(dateISO: string): boolean {
    const [y, m, d] = dateISO.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);
    const dansUnMois = new Date(aujourdHui);
    dansUnMois.setDate(dansUnMois.getDate() + 31);
    return dt >= aujourdHui && dt <= dansUnMois;
  }

  async function chargerTables() {
    setLoadingTables(true);
    // On parcourt toutes les sous-collections "tables" des animations
    const evts = await getDocs(
      query(collection(db, "evenements"), where("categorie", "==", "animations"))
    );
    const all: TableAnimee[] = [];
    for (const evt of evts.docs) {
      const tablesSnap = await getDocs(collection(db, "evenements", evt.id, "tables"));
      tablesSnap.docs.forEach(d => {
        all.push({ id: d.id, animationId: evt.id, ...d.data() } as TableAnimee);
      });
    }
    setTables(all);
    setLoadingTables(false);
  }

  async function validerTable(table: TableAnimee) {
  if (processingIds.has(table.id)) return;
  startProcessing(table.id);
  try {
    await updateDoc(doc(db, "evenements", table.animationId, "tables", table.id), {
      status: "approved",
    });
    setTables(prev => prev.map(t => t.id === table.id ? { ...t, status: "approved" } as any : t));
  } catch (err) {
    console.error(err);
    alert("Erreur lors de la validation de la table.");
  } finally {
    stopProcessing(table.id);
  }
}

async function refuserTable(table: TableAnimee) {
  if (processingIds.has(table.id)) return;
  if (!confirm("Refuser cette table ?")) return;
  startProcessing(table.id);
  try {
    await updateDoc(doc(db, "evenements", table.animationId, "tables", table.id), {
      status: "rejected",
    });
    setTables(prev => prev.map(t => t.id === table.id ? { ...t, status: "rejected" } as any : t));
  } catch (err) {
    console.error(err);
    alert("Erreur lors du refus de la table.");
  } finally {
    stopProcessing(table.id);
  }
}

  async function chargerInscriptionsAnim() {
    setLoadingInscAnim(true);
    const evts = await getDocs(
      query(collection(db, "evenements"), where("categorie", "==", "animations"))
    );
    const all: InscriptionAnimation[] = [];
    for (const evt of evts.docs) {
      const insSnap = await getDocs(collection(db, "evenements", evt.id, "inscriptions"));
      insSnap.docs.forEach(d => {
        all.push({ id: d.id, animationId: evt.id, ...d.data() } as InscriptionAnimation);
      });
    }
    setInscriptionsAnim(all);
    setLoadingInscAnim(false);
  }

  async function dupliquerAnimation(a: AnimationPubliee) {
  if (processingIds.has(a.id)) return;
  startProcessing(a.id);
  try {
    const nouvelleDate = ajouterJours(a.date, 7);
    const idDoc = a.lieu
      ? `${a.lieu}_${nouvelleDate}`
      : `en-ligne_${nouvelleDate}_${Date.now()}`;

    const docRef = doc(db, "evenements", idDoc);
    const existant = await getDoc(docRef);
    if (existant.exists()) {
      alert(`Une animation existe déjà à ce lieu le ${nouvelleDate}.`);
      return;
    }

    const data = nettoyerUndefined({
      titre: a.titre,
      description: a.description,
      categorie: "animations",
      date: nouvelleDate,
      heure: a.heure,
      duree: a.duree || "",
      niveau: a.niveau,
      places: a.places,
      inscrits: 0,
      systeme: a.systeme || "",
      tags: a.tags || [],
      image: a.image || "",
      lieuType: a.lieuType || "presentiel",
      lieu: a.lieu || "",
      ville: a.ville || "",
      adresse: a.adresse || "",
      lieuDetail: a.lieuDetail || "",
      mjId: a.mjId || null,
      mjNom: a.mjNom || "",
      recurrent: !!a.recurrenceId,
      recurrenceId: a.recurrenceId || null,
    });

    await setDoc(docRef, data);

    setAnimations(prev => [...prev, { id: idDoc, ...data } as AnimationPubliee]
      .sort((x, y) => x.date.localeCompare(y.date)));
  } catch (err) {
    console.error(err);
    alert("Erreur lors de la duplication de l'animation : " + (err as any)?.message);
  } finally {
    stopProcessing(a.id);
  }
}

async function modifierOccurrence(animation: AnimationPubliee, nouvelleDate: string, nouvelleHeure: string) {
  if (processingIds.has(animation.id)) return;
  if (!nouvelleDate || !nouvelleHeure) {
    alert("Merci de renseigner une date et une heure valides.");
    return;
  }

  startProcessing(animation.id);
  try {
    // Si la date change, il faut migrer vers un nouvel ID déterministe
    // ({lieu}_{date}), car l'ID actuel encode l'ancienne date.
    const dateInchangee = nouvelleDate === animation.date;

    if (dateInchangee) {
      // Juste l'heure change : simple update sur le document existant.
      await updateDoc(doc(db, "evenements", animation.id), {
        heure: nouvelleHeure,
      });
      setAnimations(prev =>
        prev.map(a => a.id === animation.id ? { ...a, heure: nouvelleHeure } : a)
      );
    } else {
      // La date change : il faut un nouvel ID pour rester cohérent avec
      // {lieu}_{date}, donc on crée le nouveau doc et on supprime l'ancien.
      const nouvelId = animation.lieu
        ? `${animation.lieu}_${nouvelleDate}`
        : `en-ligne_${nouvelleDate}_${Date.now()}`;

      if (nouvelId !== animation.id) {
        const docExistant = await getDoc(doc(db, "evenements", nouvelId));
        if (docExistant.exists()) {
          alert(`Une animation existe déjà à ce lieu le ${nouvelleDate}.`);
          stopProcessing(animation.id);
          return;
        }
      }

      const { id, ...donnees } = animation;
      const nouvellesDonnees = { ...donnees, date: nouvelleDate, heure: nouvelleHeure };

      await setDoc(doc(db, "evenements", nouvelId), nettoyerUndefined(nouvellesDonnees));
      await deleteDoc(doc(db, "evenements", animation.id));

      setAnimations(prev =>
        prev
          .filter(a => a.id !== animation.id)
          .concat([{ id: nouvelId, ...nouvellesDonnees }])
          .sort((a, b) => a.date.localeCompare(b.date))
      );
    }

    setEditingOccurrence(null);
  } catch (err) {
    console.error(err);
    alert("Erreur lors de la modification de l'occurrence.");
  } finally {
    stopProcessing(animation.id);
  }
}

function ouvrirEditionGroupe(groupe: AnimationPubliee[]) {
  const premiere = groupe[0];
  const cle = premiere.recurrenceId || premiere.id;
  setEditingGroupKey(cle);
  setEditGroupForm({
    places: premiere.places,
    image: premiere.image || "",
    recurrence: premiere.recurrenceId ? "hebdomadaire" : "unique",
  });
}

function fermerEditionGroupe() {
  setEditingGroupKey(null);
  setEditGroupUploadPct(null);
}

async function handleEditGroupImageChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  setEditGroupUploadPct(0);
  try {
    const url = await uploadToCloudinary(file, setEditGroupUploadPct);
    setEditGroupForm(f => ({ ...f, image: url }));
  } catch (err: any) {
    alert("Erreur lors de l'upload de l'image : " + (err.message || "inconnue"));
  } finally {
    setEditGroupUploadPct(null);
  }
}

async function enregistrerModifGroupe(groupe: AnimationPubliee[]) {
  const premiere = groupe[0];
  const cle = premiere.recurrenceId || premiere.id;
  if (processingIds.has(cle)) return;
  startProcessing(cle);
  setSavingGroup(true);
  try {
    const etaitRecurrent = !!premiere.recurrenceId;
    const doitEtreRecurrent = editGroupForm.recurrence === "hebdomadaire";

    // ── Cas 1 : la récurrence ne change pas → simple mise à jour des places
    // et de l'image sur toutes les occurrences déjà existantes de la série ──
    if (etaitRecurrent === doitEtreRecurrent) {
      const idsAMettreAJour = etaitRecurrent
        ? (await getDocs(
            query(collection(db, "evenements"), where("recurrenceId", "==", premiere.recurrenceId))
          )).docs.map(d => d.id)
        : [premiere.id];

      await Promise.all(
        idsAMettreAJour.map(id =>
          updateDoc(doc(db, "evenements", id), {
            places: editGroupForm.places,
            image: editGroupForm.image || "",
          })
        )
      );

      setAnimations(prev => prev.map(a =>
        idsAMettreAJour.includes(a.id)
          ? { ...a, places: editGroupForm.places, image: editGroupForm.image }
          : a
      ));
    }

    // ── Cas 2 : passage de "unique" à "hebdomadaire" → on garde l'occurrence
    // existante et on génère les dates suivantes sur le mois à venir ────────
    else if (!etaitRecurrent && doitEtreRecurrent) {
      const nouveauRecurrenceId = `rec_${Date.now()}`;
      await updateDoc(doc(db, "evenements", premiere.id), {
        places: editGroupForm.places,
        image: editGroupForm.image || "",
        recurrent: true,
        recurrenceId: nouveauRecurrenceId,
      });

      const nouvelles: AnimationPubliee[] = [];
      let courante = premiere.date;
      while (true) {
        courante = ajouterJours(courante, 7);
        if (!estDansLeMoisAVenir(courante)) break;

        const idDoc = premiere.lieu
          ? `${premiere.lieu}_${courante}`
          : `en-ligne_${courante}_${Date.now()}`;
        const existant = await getDoc(doc(db, "evenements", idDoc));
        if (existant.exists()) continue;

        const data = nettoyerUndefined({
          titre: premiere.titre,
          description: premiere.description,
          categorie: "animations",
          date: courante,
          heure: premiere.heure,
          duree: premiere.duree || "",
          niveau: premiere.niveau,
          places: editGroupForm.places,
          inscrits: 0,
          systeme: premiere.systeme || "",
          tags: premiere.tags || [],
          image: editGroupForm.image || "",
          lieuType: premiere.lieuType || "presentiel",
          lieu: premiere.lieu || "",
          ville: premiere.ville || "",
          adresse: premiere.adresse || "",
          lieuDetail: premiere.lieuDetail || "",
          mjId: premiere.mjId || null,
          mjNom: premiere.mjNom || "",
          recurrent: true,
          recurrenceId: nouveauRecurrenceId,
        });
        await setDoc(doc(db, "evenements", idDoc), data);
        nouvelles.push({ id: idDoc, ...data } as AnimationPubliee);
      }

      setAnimations(prev =>
        [
          ...prev.map(a => a.id === premiere.id
            ? { ...a, places: editGroupForm.places, image: editGroupForm.image, recurrent: true, recurrenceId: nouveauRecurrenceId }
            : a),
          ...nouvelles,
        ].sort((a, b) => a.date.localeCompare(b.date))
      );
    }

    // ── Cas 3 : passage de "hebdomadaire" à "unique" → on ne garde que la
    // première occurrence, on supprime les autres dates de la série ────────
    else {
      const confirmation = confirm(
        "Repasser cette série en « une seule fois » supprimera toutes les autres dates déjà générées. Continuer ?"
      );
      if (!confirmation) { setSavingGroup(false); stopProcessing(cle); return; }

      const autresOccurrences = groupe.filter(a => a.id !== premiere.id);
      await Promise.all(autresOccurrences.map(a => deleteDoc(doc(db, "evenements", a.id))));

      await updateDoc(doc(db, "evenements", premiere.id), {
        places: editGroupForm.places,
        image: editGroupForm.image || "",
        recurrent: false,
        recurrenceId: null,
      });

      setAnimations(prev =>
        prev
          .filter(a => !autresOccurrences.some(o => o.id === a.id))
          .map(a => a.id === premiere.id
            ? { ...a, places: editGroupForm.places, image: editGroupForm.image, recurrent: false, recurrenceId: undefined }
            : a)
      );
    }

    setEditingGroupKey(null);
  } catch (err: any) {
    console.error(err);
    alert("Erreur lors de la modification : " + (err.message || "inconnue"));
  } finally {
    setSavingGroup(false);
    stopProcessing(cle);
  }
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
      chargerAnimations();
      chargerTables();
      chargerInscriptionsAnim();
      chargerMJs();
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

  async function chargerAnimations() {
    setLoadingAnimations(true);
    const snap = await getDocs(
      query(collection(db, "evenements"), where("categorie", "==", "animations"))
    );
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() })) as AnimationPubliee[];
    items.sort((a, b) => a.date.localeCompare(b.date));
    setAnimations(items);
    setLoadingAnimations(false);
  }

  async function chargerMJs() {
    const snap = await getDocs(
      query(collection(db, "users"), where("role", "in", ["mj", "admin"]))
    );
    setMjs(
      snap.docs.map(d => ({
        id: d.id,
        nom: `${d.data().prenom ?? ""} ${d.data().nom ?? ""}`.trim() || d.data().pseudo || "MJ",
      }))
    );
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

  // ── Actions événements (propositions soumises par les joueurs / MJ) ───────

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

  // ── Actions animations (créées directement par l'admin) ───────────────────

  async function creerAnimation(e: React.FormEvent) {
  e.preventDefault();

  const lieuRequis = formAnim.lieuType === "presentiel";
  if (!formAnim.titre || !formAnim.date || !formAnim.heure || !formAnim.mjId || (lieuRequis && !formAnim.lieu)) {
    setMessageAnim({
      type: "err",
      text: lieuRequis
        ? "Merci de renseigner au moins le titre, la date, l'heure, le lieu et le MJ référent."
        : "Merci de renseigner au moins le titre, la date, l'heure et le MJ référent.",
    });
    return;
  }
  setSubmittingAnim(true);
  setMessageAnim(null);
  try {
    const tags = formAnim.tags.split(",").map(t => t.trim()).filter(Boolean);
    const lieuInfo = formAnim.lieu ? LIEUX[formAnim.lieu] : undefined;

    // ── Calcul des dates à créer ──────────────────────────────────────────
    const dates: string[] = [formAnim.date];
    if (formAnim.recurrence === "hebdomadaire") {
      let courante = formAnim.date;
      while (true) {
        courante = ajouterJours(courante, 7);
        if (!estDansLeMoisAVenir(courante)) break;
        dates.push(courante);
      }
    }

    const recurrenceId = formAnim.recurrence === "hebdomadaire"
      ? `rec_${Date.now()}`
      : undefined;

    const nouvelles: AnimationPubliee[] = [];
    const datesIgnorees: string[] = [];

    for (const dateOcc of dates) {
      // ── ID déterministe : {lieu}_{date}, ou {aleatoire}_{date} si en ligne ──
      // Permet d'éviter les doublons (2 animations au même lieu le même
      // jour) et de retrouver un document sans requête si on connaît déjà
      // le lieu et la date.
      const idDoc = formAnim.lieu
        ? `${formAnim.lieu}_${dateOcc}`
        : `en-ligne_${dateOcc}_${Date.now()}`;

      const docRef = doc(db, "evenements", idDoc);
      const existant = await getDoc(docRef);
      if (existant.exists()) {
        datesIgnorees.push(dateOcc);
        continue; // évite d'écraser une animation déjà créée à ce lieu/cette date
      }

      const data = {
        titre: formAnim.titre,
        description: formAnim.description,
        categorie: "animations",
        date: dateOcc,
        heure: formAnim.heure,
        duree: formAnim.duree,
        niveau: formAnim.niveau,
        places: formAnim.places,
        inscrits: 0,
        systeme: formAnim.systeme,
        tags,
        image: formAnim.image,
        lieuType: formAnim.lieuType,
        lieu: formAnim.lieu || "",           // ← slug, ex: "3brasseurs"
        ville: lieuInfo?.ville || "",
        adresse: lieuInfo?.adresse || "",
        lieuDetail: formAnim.lieuDetail,
        mjId: formAnim.mjId || null,
        mjNom: formAnim.mjNom,
        recurrent: formAnim.recurrence === "hebdomadaire",
        recurrenceId: recurrenceId || null,
      };

      await setDoc(docRef, nettoyerUndefined(data));

      nouvelles.push({ id: idDoc, ...data } as AnimationPubliee);
    }

    setAnimations(prev =>
      [...prev, ...nouvelles].sort((a, b) => a.date.localeCompare(b.date))
    );

    const texteIgnorees = datesIgnorees.length > 0
      ? ` (${datesIgnorees.length} date${datesIgnorees.length > 1 ? "s" : ""} ignorée${datesIgnorees.length > 1 ? "s" : ""} car déjà existante${datesIgnorees.length > 1 ? "s" : ""} à ce lieu)`
      : "";

    setMessageAnim({
      type: "ok",
      text: dates.length > 1
        ? `Animation créée : ${nouvelles.length} occurrence${nouvelles.length > 1 ? "s" : ""} générée${nouvelles.length > 1 ? "s" : ""}${texteIgnorees}.`
        : nouvelles.length > 0
          ? "Animation créée !"
          : `Une animation existe déjà à ce lieu pour cette date.`,
    });

    if (nouvelles.length > 0) setFormAnim(FORM_ANIMATION_VIDE);
  } catch (err) {
    console.error(err);
    setMessageAnim({ type: "err", text: "Erreur lors de la création de l'animation." });
  } finally {
    setSubmittingAnim(false);
  }
}

const CLOUDINARY_CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

async function uploadToCloudinary(
  file: File,
  onProgress: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);

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
          $active={onglet === "animations"}
          onClick={() => setOnglet("animations")}
        >
          🎭 Animations
        </Tab>
        <Tab
          $active={onglet === "tables"}
          onClick={() => setOnglet("tables")}
        >
          🎲 Tables
          {tables.filter(t => t.places > 0 && (t as any).statut === "pending").length > 0 && (
            <Badge>{tables.filter(t => (t as any).statut === "pending").length}</Badge>
          )}
        </Tab>
        <Tab
          $active={onglet === "inscriptions-anim"}
          onClick={() => setOnglet("inscriptions-anim")}
        >
          📋 Inscriptions animations
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

      {/* ── Onglet Membres ── */}
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

      {/* ── Onglet Événements (propositions des joueurs / MJ) ── */}
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

      {/* ── Onglet Animations (création directe par l'admin) ── */}
      {onglet === "animations" && (
        <RessourcesLayout>
          <FormCard>
            <FormTitle>✚ Créer une animation</FormTitle>
            <form onSubmit={creerAnimation}>
              <Field>
                <Label htmlFor="a-titre">Titre *</Label>
                <Input
                  id="a-titre"
                  placeholder="Ex : Soirée découverte JDR"
                  value={formAnim.titre}
                  onChange={e => setFormAnim(f => ({ ...f, titre: e.target.value }))}
                />
              </Field>

              <Field>
                <Label htmlFor="a-desc">Description</Label>
                <Input
                  id="a-desc"
                  placeholder="Pitch de la soirée"
                  value={formAnim.description}
                  onChange={e => setFormAnim(f => ({ ...f, description: e.target.value }))}
                />
              </Field>

              <Field>
                <Label htmlFor="a-date">Date *</Label>
                <Input
                  id="a-date"
                  type="date"
                  value={formAnim.date}
                  onChange={e => setFormAnim(f => ({ ...f, date: e.target.value }))}
                />
              </Field>

              <Field>
                <Label htmlFor="a-heure">Heure de début *</Label>
                <Input
                  id="a-heure"
                  type="time"
                  value={formAnim.heure}
                  onChange={e => setFormAnim(f => ({ ...f, heure: e.target.value }))}
                />
              </Field>

              <Field>
                <Label htmlFor="a-duree">Durée</Label>
                <Input
                  id="a-duree"
                  placeholder="Ex : 3h"
                  value={formAnim.duree}
                  onChange={e => setFormAnim(f => ({ ...f, duree: e.target.value }))}
                />
              </Field>

              <Field>
                <Label htmlFor="a-lieuType">Type de lieu</Label>
                <Select
                  id="a-lieuType"
                  value={formAnim.lieuType}
                  onChange={e => setFormAnim(f => ({ ...f, lieuType: e.target.value as "presentiel" | "ligne" }))}
                >
                  <option value="presentiel">📍 Présentiel</option>
                  <option value="ligne">💻 En ligne</option>
                </Select>
              </Field>

              {formAnim.lieuType === "presentiel" ? (
  <Field>
    <Label htmlFor="a-lieu">Lieu *</Label>
    <Select
      id="a-lieu"
      value={formAnim.lieu}
      onChange={e => setFormAnim(f => ({ ...f, lieu: e.target.value }))}
    >
      <option value="">— Choisir un lieu —</option>
      {Object.entries(LIEUX).map(([slug, info]) => (
        <option key={slug} value={slug}>{info.label}</option>
      ))}
    </Select>
  </Field>
) : (
  <Field>
    <Label htmlFor="a-lieuDetail">Outil / lien</Label>
    <Input
      id="a-lieuDetail"
      placeholder="Ex : Discord, Roll20…"
      value={formAnim.lieuDetail}
      onChange={e => setFormAnim(f => ({ ...f, lieuDetail: e.target.value }))}
    />
  </Field>
)}

              <Field>
                <Label htmlFor="a-recurrence">Répétition</Label>
                <Select
                  id="a-recurrence"
                  value={formAnim.recurrence}
                  onChange={e => setFormAnim(f => ({ ...f, recurrence: e.target.value as "unique" | "hebdomadaire" }))}
                >
                  <option value="unique">Une seule fois</option>
                  <option value="hebdomadaire">Toutes les semaines (sur le mois à venir)</option>
                </Select>
                <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: "0.3rem" }}>
                  Si récurrente, une occurrence sera créée automatiquement chaque semaine au même jour, tant qu'elle tombe dans les 31 prochains jours.
                </p>
              </Field>

              <Field>
                <Label htmlFor="a-referent">MJ référent *</Label>
                <Select
                  id="a-referent"
                  value={formAnim.mjId}
                  onChange={e => {
                    const id = e.target.value;
                    const mj = mjs.find(m => m.id === id);
                    setFormAnim(f => ({ ...f, mjId: id, mjNom: mj?.nom ?? "" }));
                  }}
                >
                  <option value="">— Choisir un MJ référent —</option>
                  {mjs.map(m => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
                </Select>
              </Field>

              <Field>
  <Label htmlFor="a-image">Image de l'animation</Label>
  {formAnim.image && (
    <ImagePreviewWrap>
      <ImagePreviewImg src={formAnim.image} alt="Aperçu" />
    </ImagePreviewWrap>
  )}
  <UploadLabel htmlFor="a-image-upload" style={{ marginTop: formAnim.image ? "0.5rem" : 0 }}>
    🖼️ {formAnim.image ? "Changer l'image" : "Téléverser une image"}
    <HiddenFileInput
      id="a-image-upload"
      type="file"
      accept="image/*"
      onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFormAnimUploadPct(0);
        try {
          const url = await uploadToCloudinary(file, setFormAnimUploadPct);
          setFormAnim(f => ({ ...f, image: url }));
        } catch (err: any) {
          alert("Erreur lors de l'upload : " + (err.message || "inconnue"));
        } finally {
          setFormAnimUploadPct(null);
        }
      }}
    />
  </UploadLabel>
  {formAnimUploadPct !== null && <UploadProgressBar $pct={formAnimUploadPct} />}
</Field>

              <Field>
                <Label htmlFor="a-tags">Tags (séparés par des virgules)</Label>
                <Input
                  id="a-tags"
                  placeholder="découverte, one-shot, ambiance"
                  value={formAnim.tags}
                  onChange={e => setFormAnim(f => ({ ...f, tags: e.target.value }))}
                />
              </Field>

              <Field>
                <Label htmlFor="a-places">Places totales (toutes tables confondues)</Label>
                <Input
                  id="a-places"
                  type="number"
                  min={1}
                  value={formAnim.places}
                  onChange={e => setFormAnim(f => ({ ...f, places: Number(e.target.value) }))}
                />
                <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: "0.3rem" }}>
                  Les MJs pourront ensuite proposer leurs tables (1 table = 1 sous-scénario).
                </p>
              </Field>

              <SubmitBtn type="submit" disabled={submittingAnim}>
                {submittingAnim ? "Création en cours…" : "Créer l'animation"}
              </SubmitBtn>

              {messageAnim?.type === "ok"  && <SuccessMsg>{messageAnim.text}</SuccessMsg>}
              {messageAnim?.type === "err" && <ErrorMsg>{messageAnim.text}</ErrorMsg>}
            </form>
          </FormCard>

          {/* Liste des animations déjà publiées, regroupées par série
              récurrente : une carte par animation "unique" ou par série
              hebdomadaire, avec les dates du mois à venir en badges. */}
          <div>
            <ListHeader>
              <ListTitle>Animations publiées</ListTitle>
              <ListCount>{animations.length} occurrence{animations.length > 1 ? "s" : ""}</ListCount>
            </ListHeader>

            {loadingAnimations && <Loading>Chargement…</Loading>}

            {!loadingAnimations && animations.length === 0 && (
              <Empty>Aucune animation publiée pour le moment.</Empty>
            )}

            {!loadingAnimations && (() => {
              // Regroupement par recurrenceId (série hebdomadaire) ou par
              // id propre (occurrence unique = son propre groupe).
              const groupes = new Map<string, AnimationPubliee[]>();
              animations.forEach(a => {
                const cle = a.recurrenceId || a.id;
                if (!groupes.has(cle)) groupes.set(cle, []);
                groupes.get(cle)!.push(a);
              });
              const listeGroupes = Array.from(groupes.values())
                .map(g => [...g].sort((x, y) => x.date.localeCompare(y.date)))
                .sort((a, b) => a[0].date.localeCompare(b[0].date));

              return listeGroupes.map(groupe => {
                const premiere = groupe[0];
                const busy = processingIds.has(premiere.id);
                // On ne montre que les occurrences tombant dans le mois à
                // venir, même si d'autres existent déjà en base plus loin.
                const datesAVenir = groupe.filter(a => estDansLeMoisAVenir(a.date));

                return (
                  <RessourceItem
                    key={premiere.recurrenceId || premiere.id}
                    style={{ flexDirection: "column", alignItems: "stretch", gap: "0.6rem" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                      <ItemInfo>
                        <ItemTitre>
                          {premiere.titre}
                          {premiere.recurrenceId && (
                            <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>
                              {" "}· hebdomadaire
                            </span>
                          )}
                        </ItemTitre>
                        <ItemMeta>
                          {premiere.heure} · {premiere.ville || premiere.lieuDetail || "—"} · 👥 {premiere.inscrits}/{premiere.places}
                        </ItemMeta>
                      </ItemInfo>
                      <TypePill>🧙 {premiere.mjNom}</TypePill>
                      <DeleteBtn disabled={busy} onClick={() => dupliquerAnimation(premiere)}>
                        {busy ? "…" : "🔁 +7j"}
                      </DeleteBtn>
                      <DeleteBtn
  disabled={busy}
  onClick={() => ouvrirEditionGroupe(groupe)}
  style={{ borderColor: "rgba(160,120,255,0.3)", background: "rgba(120,80,255,0.07)", color: "#c8a8ff" }}
>
  ✏️ Modifier
</DeleteBtn>
                    </div>

                    <MetaRow style={{ flexDirection: "column", alignItems: "stretch", gap: "0.5rem" }}>
                      {datesAVenir.length === 0 && (
                        <MetaBadge>Aucune date sur le mois à venir</MetaBadge>
                      )}
                      {datesAVenir.map(a => {
                        const busyOcc = processingIds.has(a.id);
                        const enEdition = editingOccurrence === a.id;

                        if (enEdition) {
                          return (
                            <div key={a.id} style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                              <Input
                                type="date"
                                value={editDate}
                                onChange={e => setEditDate(e.target.value)}
                                style={{ maxWidth: "150px" }}
                              />
                              <Input
                                type="time"
                                value={editHeure}
                                onChange={e => setEditHeure(e.target.value)}
                                style={{ maxWidth: "110px" }}
                              />
                              <ValidateBtn
                                disabled={busyOcc}
                                onClick={() => modifierOccurrence(a, editDate, editHeure)}
                                style={{ flex: "0 0 auto", padding: "0.4rem 0.8rem", minWidth: "auto" }}
                              >
                                {busyOcc ? "…" : "✅"}
                              </ValidateBtn>
                              <RejectBtn
                                disabled={busyOcc}
                                onClick={() => setEditingOccurrence(null)}
                                style={{ flex: "0 0 auto", padding: "0.4rem 0.8rem", minWidth: "auto" }}
                              >
                                ✕
                              </RejectBtn>
                            </div>
                          );
                        }

                        return (
                          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <MetaBadge>
                              📅 {a.date} · 🕒 {a.heure} · 👥 {a.inscrits}/{a.places}
                            </MetaBadge>
                            <DeleteBtn
                              disabled={busyOcc}
                              onClick={() => {
                                setEditingOccurrence(a.id);
                                setEditDate(a.date);
                                setEditHeure(a.heure);
                              }}
                              style={{ borderColor: "rgba(160,120,255,0.3)", background: "rgba(120,80,255,0.07)", color: "#c8a8ff" }}
                            >
                              ✏️
                            </DeleteBtn>
                          </div>
                        );
                      })}
                    </MetaRow>
                    {editingGroupKey === (premiere.recurrenceId || premiere.id) && (
  <EditGroupBox>
    <div>
      <Label>Places totales</Label>
      <Input
        type="number"
        min={1}
        value={editGroupForm.places}
        onChange={e => setEditGroupForm(f => ({ ...f, places: Number(e.target.value) }))}
      />
    </div>

    <div>
      <Label>Image de l&apos;animation</Label>
      {editGroupForm.image && (
        <ImagePreviewWrap>
          <ImagePreviewImg src={editGroupForm.image} alt="Aperçu" />
        </ImagePreviewWrap>
      )}
      <UploadLabel
        htmlFor={`edit-image-${premiere.recurrenceId || premiere.id}`}
        style={{ marginTop: editGroupForm.image ? "0.5rem" : 0 }}
      >
        🖼️ {editGroupForm.image ? "Changer l'image" : "Téléverser une image"}
        <HiddenFileInput
          id={`edit-image-${premiere.recurrenceId || premiere.id}`}
          type="file"
          accept="image/*"
          onChange={handleEditGroupImageChange}
        />
      </UploadLabel>
      {editGroupUploadPct !== null && <UploadProgressBar $pct={editGroupUploadPct} />}
    </div>

    <div>
      <Label>Répétition</Label>
      <Select
        value={editGroupForm.recurrence}
        onChange={e => setEditGroupForm(f => ({ ...f, recurrence: e.target.value as "unique" | "hebdomadaire" }))}
      >
        <option value="unique">Une seule fois</option>
        <option value="hebdomadaire">Toutes les semaines (sur le mois à venir)</option>
      </Select>
      <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginTop: "0.3rem" }}>
        ⚠️ Passer de « hebdomadaire » à « une seule fois » supprime les autres dates déjà générées.
      </p>
    </div>

    <Actions style={{ marginTop: 0 }}>
      <RejectBtn onClick={fermerEditionGroupe} disabled={savingGroup}>
        Annuler
      </RejectBtn>
      <ValidateBtn onClick={() => enregistrerModifGroupe(groupe)} disabled={savingGroup}>
        {savingGroup ? "Enregistrement…" : "Enregistrer"}
      </ValidateBtn>
    </Actions>
  </EditGroupBox>
)}
                  </RessourceItem>
                );
              });
            })()}
          </div>
        </RessourcesLayout>
      )}

      {/* ── Onglet Inscriptions animations ── */}
      {onglet === "inscriptions-anim" && (
        <Grid>
          {loadingInscAnim && <Loading>Chargement…</Loading>}

          {!loadingInscAnim && inscriptionsAnim.length === 0 && (
            <Empty>Aucun joueur ne s'est encore inscrit à une animation.</Empty>
          )}

          {inscriptionsAnim.map(i => {
            const anim = animations.find(a => a.id === i.animationId);
            const nom = i.prenom && i.nom ? `${i.prenom} ${i.nom}` : (i.pseudo || i.email);
            return (
              <Card key={i.id}>
                <CardHeader>
                  <CardTitle>
                    🧑 {nom}
                    {anim && (
                      <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", marginLeft: "0.5rem" }}>
                        → « {anim.titre} »
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <Description>{i.email}</Description>
                  {anim && (
                    <MetaRow>
                      <MetaBadge>📅 {anim.date}</MetaBadge>
                      <MetaBadge>🕒 {anim.heure}</MetaBadge>
                      <MetaBadge>📍 {anim.ville || anim.lieuDetail || "—"}</MetaBadge>
                    </MetaRow>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </Grid>
      )}

         {/* ── Onglet Tables (proposées par les MJ sur les animations) ── */}
      {onglet === "tables" && (
        <Grid>
          {loadingTables && <Loading>Chargement…</Loading>}

          {!loadingTables && tables.length === 0 && (
            <Empty>Aucune table n'a encore été proposée sur une animation.</Empty>
          )}

          {tables.map(t => {
            const anim = animations.find(a => a.id === t.animationId);
            const busy = processingIds.has(t.id);
            const statut = t.status ?? "pending";

            return (
              <Card key={t.id}>
                <CardHeader>
                  <CardTitle>
                    🎲 {t.titre || t.systeme || "Table sans titre"}
                    {anim && (
                      <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", marginLeft: "0.5rem" }}>
                        · animation « {anim.titre} »
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <Description>{t.description || "Pas de description."}</Description>
                  <MetaRow>
                    <MetaBadge>🧙 MJ : {t.mjNom}</MetaBadge>
                    <MetaBadge>🎯 {t.systeme || "Système non précisé"}</MetaBadge>
                    <MetaBadge>👥 {t.inscrits}/{t.places}</MetaBadge>
                    {anim && <MetaBadge>📅 {anim.date}</MetaBadge>}
                    {t.heure && <MetaBadge>🕒 {t.heure}</MetaBadge>}
                    <MetaBadge>
                      {statut === "pending"  && "⏳ En attente"}
                      {statut === "approved" && "✅ Validée"}
                      {statut === "rejected" && "❌ Refusée"}
                    </MetaBadge>
                  </MetaRow>

                  {statut === "pending" && (
                    <Actions>
                      <ValidateBtn disabled={busy} onClick={() => validerTable(t)}>
                        {busy ? "⏳ …" : "✅ Valider"}
                      </ValidateBtn>
                      <RejectBtn disabled={busy} onClick={() => refuserTable(t)}>
                        {busy ? "⏳ …" : "❌ Refuser"}
                      </RejectBtn>
                    </Actions>
                  )}
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