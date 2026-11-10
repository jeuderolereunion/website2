"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import styled, { keyframes } from "styled-components";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection, query, where, getDocs, doc, getDoc,
  addDoc, deleteDoc, updateDoc, runTransaction, increment, serverTimestamp,
} from "firebase/firestore";
import Navigation from "@/components/Navigation";
import { uploadToCloudinary } from "@/lib/cloudinaryLoader";
import { SYSTEMES } from "@/lib/systemes";


type EventDoc = {
  id: string;
  titre: string;
  date: string;
  heure: string;
  duree?: string;
  places: number;
  inscrits: number;
  lieu?: string;
  ville?: string;
  systeme?: string;
  mjId?: string;    // organisateur référent de l'animation
  annule?: boolean; // animation annulée par le MJ référent ou un admin
  // ── Contenu affiché directement sur la carte (rempli depuis l'admin) ──────
  accroche?: string;
  description?: string;
  programme?: { heure: string; titre: string }[];
  lien?: string;    // chemin de la page de l'animation (sinon recalculé)
};
type InscriptionJoueur = {
  id: string;
  userId?: string;
  prenom?: string;
  nom?: string;
  pseudo?: string;
  email: string;
  statut: "confirme" | "attente";
  tableId?: string | null;
  tableMjNom?: string | null;
  manuel?: boolean;        // ajouté par un MJ, pas par le joueur lui-même
  nombrePlaces?: number;   // permet d'ajouter un groupe d'un coup
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
  image?: string;
  duree?: string;
  personnages?: "pretires" | "creation";
  ageTag?: "tous" | "16" | "18";
  mjContact?: string;
  mjContactPublic?: boolean;
};

type VenueInfo = { venue: string; ville: string; adresse: string; schedule: string; image?: string };
type UserProfile = { pseudo: string; email: string; role?: string };

// ─── Styled ──────────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const ReferentPanel = styled.div`
  margin-top: 1.1rem;
  padding: 1rem 1.1rem;
  border-radius: 12px;
  background: rgba(160,120,255,0.05);
  border: 1px solid rgba(160,120,255,0.25);
`;

const ReferentTitle = styled.p`
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(160,120,255,0.9);
  margin: 0 0 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;
const Select = styled.select`
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
  option { background: #1a1a2e; color: #fff; }
`;

const ReferentSubLabel = styled.p`
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255,255,255,0.4);
  margin: 0.9rem 0 0.5rem;
  &:first-child { margin-top: 0; }
`;

const ReferentItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  margin-bottom: 0.4rem;
  font-size: 0.8rem;
  color: rgba(255,255,255,0.8);
`;

const StatusPill = styled.span<{ $tone: "ok" | "warn" | "danger" }>`
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
  white-space: nowrap;
  background: ${p => p.$tone === "ok" ? "rgba(80,200,120,0.15)" : p.$tone === "warn" ? "rgba(255,180,60,0.15)" : "rgba(255,80,80,0.15)"};
  color: ${p => p.$tone === "ok" ? "#7dffb3" : p.$tone === "warn" ? "#ffcf7d" : "#ff8080"};
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

// position: relative → le lien « Voir les détails » s'étire sur toute cette zone
const CardTop = styled.div`
  position: relative;
  padding: 1.25rem 1.4rem;
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

// ── Contenu de la carte : titre, accroche, description, programme ──

const EventName = styled.h3`
  margin: 0.9rem 0 0;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.3;
`;

const EventPitch = styled.p`
  margin: 0.4rem 0 0;
  font-size: 0.85rem;
  line-height: 1.55;
  color: rgba(255,255,255,0.65);
`;

const EventDesc = styled.p`
  margin: 0.6rem 0 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: rgba(255,255,255,0.6);
  white-space: pre-line;
`;

const DetailRow = styled.div`
  font-size: 0.8rem;
  color: rgba(255,255,255,0.55);
  margin: 0 0 0.5rem;
  line-height: 1.5;
`;

const EventSteps = styled.ul`
  margin: 0.6rem 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.5);
`;

const EventActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1rem;
`;

// Lien vers la page de l'animation (détails propres) : s'étire sur toute
// la zone haute de la carte, donc toute la carte est cliquable
const DetailBtn = styled(Link)`
  padding: 0.55rem 1rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  color: #fff;
  text-decoration: none;
  background: rgba(120,80,255,0.35);
  border: 1px solid rgba(160,120,255,0.6);
  &::after { content: ""; position: absolute; inset: 0; }
  &:hover { background: rgba(120,80,255,0.5); }
  &:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
`;

const ToggleBtn = styled.button`
  position: relative;
  z-index: 1;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  color: rgba(160,120,255,0.9);
  padding: 0.4rem 0.2rem;
  &:hover { color: #c8a8ff; }
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

const TableThumb = styled.img`
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
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

// ── Grille de tuiles carrées : une par table, avec son image ──────────────

const TCGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.8rem;
  margin-bottom: 1.1rem;
`;

// Tuile cliquable : ouvre la fiche détaillée de la table
const TableSquare = styled.button<{ $image?: string }>`
  position: relative;
  display: block;
  padding: 0;
  font: inherit;
  text-align: left;
  cursor: pointer;
  aspect-ratio: 1 / 1;
  border-radius: 14px;
  overflow: hidden;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.12);
  background: ${p => p.$image
    ? `url(${p.$image}) center/cover no-repeat`
    : "linear-gradient(135deg, rgba(120,80,255,0.35), rgba(0,188,212,0.2))"};
  transition: transform 150ms, border-color 150ms;
  &:hover { transform: translateY(-2px); border-color: rgba(160,120,255,0.6); }
  &:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
`;

const SquareFallback = styled.span`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.6rem;
  opacity: 0.55;
`;

const SquareTop = styled.div`
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  right: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.3rem;
`;

const SquareBottom = styled.div`
  position: absolute;
  inset: auto 0 0 0;
  padding: 1.8rem 0.7rem 0.65rem;
  background: linear-gradient(180deg, transparent, rgba(13,13,20,0.92));
`;

const SquareSysteme = styled.div`
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.2;
`;

const SquareMj = styled.div`
  font-size: 0.7rem;
  color: rgba(255,255,255,0.65);
  margin-top: 2px;
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
  display: flex;
  align-items: center;
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

// ── Image de la table (dropzone) + tags/toggles inline ────────────────────

const FileDropZone = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 110px;
  border: 1.5px dashed rgba(255,255,255,0.2);
  border-radius: 10px;
  background: rgba(255,255,255,0.03);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  overflow: hidden;
  position: relative;

  &:hover {
    border-color: rgba(0,188,212,0.5);
    background: rgba(0,188,212,0.06);
  }

  input { display: none; }
`;

const PreviewImg = styled.img`
  width: 100%;
  height: 100%;
  max-height: 180px;
  object-fit: cover;
`;

const RemoveImgBtn = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(0,0,0,0.6);
  border: none;
  color: white;
  border-radius: 6px;
  padding: 0.3rem 0.6rem;
  font-size: 0.72rem;
  cursor: pointer;
  z-index: 2;
  &:hover { background: rgba(0,0,0,0.8); }
`;

const FileHint = styled.span`
  font-size: 0.78rem;
  color: rgba(255,255,255,0.4);
  text-align: center;
  padding: 0 1rem;
`;

const UploadProgress = styled.p`
  font-size: 0.75rem;
  color: rgba(0,188,212,0.9);
  margin: 0.3rem 0 0;
`;

const TypeBtnInline = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 0.5rem;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms;
  border: 1px solid ${p => p.$active ? "rgba(0,188,212,0.6)" : "rgba(255,255,255,0.12)"};
  background: ${p => p.$active ? "rgba(0,188,212,0.15)" : "rgba(255,255,255,0.04)"};
  color: ${p => p.$active ? "#4dd0e1" : "rgba(255,255,255,0.5)"};

  &:hover {
    border-color: rgba(0,188,212,0.5);
    color: #4dd0e1;
  }
`;

const AgeTag = styled.span<{ $level: "tous" | "16" | "18" }>`
  display: inline-flex;
  align-items: center;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  margin-left: 0.4rem;
  background: ${p =>
    p.$level === "18" ? "rgba(255,80,80,0.15)"
    : p.$level === "16" ? "rgba(255,180,60,0.15)"
    : "rgba(120,255,160,0.12)"};
  color: ${p =>
    p.$level === "18" ? "#ff9a9a"
    : p.$level === "16" ? "#ffcf8a"
    : "#9affc0"};
  border: 1px solid ${p =>
    p.$level === "18" ? "rgba(255,80,80,0.35)"
    : p.$level === "16" ? "rgba(255,180,60,0.35)"
    : "rgba(120,255,160,0.3)"};
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

// ── Modales (inscription, désinscription, annulation) ──────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  z-index: 300;
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
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h2`
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0 0 0.4rem;
`;

const ModalSub = styled.p`
  font-size: 0.85rem;
  color: rgba(255,255,255,0.5);
  margin: 0 0 1rem;
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

// ── Fiche détaillée (animation ou table) ──────────────────────────────────

const DetailOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.78);
  backdrop-filter: blur(4px);
  z-index: 250;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 1.5rem 1rem;
  overflow-y: auto;
  @media (max-width: 640px) { padding: 0; }
`;

const DetailBox = styled.div`
  position: relative;
  width: 100%;
  max-width: 680px;
  margin: auto 0;
  background: #14141f;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px;
  overflow: hidden;
  animation: ${fadeUp} 0.25s ease both;
  @media (max-width: 640px) { border-radius: 0; min-height: 100vh; margin: 0; }
`;

const DetailHero = styled.div<{ $bg?: string }>`
  position: relative;
  min-height: 210px;
  padding: 4.5rem 1.5rem 1.4rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background:
    linear-gradient(180deg, rgba(20,20,31,0.15) 0%, rgba(20,20,31,0.96) 100%),
    ${p => p.$bg ? `url(${p.$bg}) center/cover` : "linear-gradient(135deg, rgba(120,80,255,0.4), rgba(0,188,212,0.18))"};
`;

const DetailClose = styled.button`
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.55);
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  z-index: 3;
  &:hover { background: rgba(0,0,0,0.8); }
`;

const DetailBackBtn = styled.button`
  position: absolute;
  top: 1rem;
  left: 1.1rem;
  background: rgba(0,0,0,0.45);
  border: none;
  border-radius: 999px;
  padding: 0.4rem 0.85rem;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.85);
  cursor: pointer;
  z-index: 3;
  &:hover { background: rgba(0,0,0,0.7); }
`;

const DetailKind = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  width: fit-content;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(120,80,255,0.25);
  border: 1px solid rgba(160,120,255,0.35);
  color: #c8a8ff;
  margin-bottom: 0.7rem;
`;

const DetailTitle = styled.h2`
  margin: 0 0 0.6rem;
  font-size: clamp(1.4rem, 4vw, 1.9rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
`;

const DetailTagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`;

const DetailTag = styled.span`
  font-size: 0.74rem;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  border: 0.5px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.7);
`;

const DetailBody = styled.div`
  padding: 1.4rem 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
`;

const DetailSectionLabel = styled.p`
  margin: 0 0 0.7rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(160,120,255,0.8);
`;

const DetailText = styled.p`
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.7;
  color: rgba(255,255,255,0.68);
  white-space: pre-line;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
  @media (max-width: 420px) { grid-template-columns: 1fr; }
`;

const InfoItem = styled.div`
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
`;

const InfoLabel = styled.div`
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
  margin-bottom: 3px;
`;

const InfoValue = styled.div`
  font-size: 0.88rem;
  font-weight: 600;
  color: rgba(255,255,255,0.88);
`;

const StepList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const StepItem = styled.li`
  display: flex;
  gap: 0.8rem;
  align-items: baseline;
  font-size: 0.88rem;
  color: rgba(255,255,255,0.7);
  line-height: 1.5;
`;

const StepTime = styled.span`
  flex-shrink: 0;
  min-width: 52px;
  font-weight: 700;
  color: #c8a8ff;
  font-size: 0.82rem;
`;

const MJCardBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
`;

const MJAvatarCircle = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgba(120,80,255,0.3);
  color: #c8a8ff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MJCardName = styled.div`
  font-size: 0.92rem;
  font-weight: 700;
`;

const MJCardSub = styled.div`
  font-size: 0.76rem;
  color: rgba(255,255,255,0.45);
  margin-top: 2px;
`;

const MapWrap = styled.div`
  border-radius: 12px;
  overflow: hidden;
  border: 0.5px solid rgba(255,255,255,0.1);
  iframe { width: 100%; height: 200px; border: none; display: block; }
`;

const MapCaption = styled.div`
  padding: 0.7rem 1rem;
  background: rgba(255,255,255,0.04);
  font-size: 0.82rem;
  color: rgba(255,255,255,0.6);
`;

const DetailFooter = styled.div`
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.9rem 1.5rem;
  background: rgba(20,20,31,0.96);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(255,255,255,0.09);
`;

const FooterNote = styled.p`
  flex: 1;
  margin: 0;
  font-size: 0.82rem;
  color: rgba(255,255,255,0.6);
  line-height: 1.4;
`;

const BigRegBtn = styled.button<{ $full?: boolean }>`
  flex: 1;
  padding: 0.8rem 1rem;
  border-radius: 10px;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  color: ${p => p.$full ? "#ffcf7d" : "#fff"};
  background: ${p => p.$full ? "rgba(255,180,60,0.15)" : "rgba(120,80,255,0.55)"};
  border: 1px solid ${p => p.$full ? "rgba(255,180,60,0.4)" : "rgba(160,120,255,0.7)"};
  transition: background 150ms;
  &:hover { background: ${p => p.$full ? "rgba(255,180,60,0.25)" : "rgba(120,80,255,0.75)"}; }
`;

const FooterDangerBtn = styled.button`
  padding: 0.7rem 1rem;
  border-radius: 10px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  color: #ff8080;
  background: rgba(255,80,80,0.12);
  border: 1px solid rgba(255,80,80,0.35);
  &:hover { background: rgba(255,80,80,0.2); }
`;

const TablesStrip = styled.div`
  padding: 0 1.4rem 1.25rem;
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

// Cloudinary recadre en carré 400px côté serveur (évite de charger
// une photo de 10 Mo dans une tuile de 150px)
function squareThumb(url?: string): string | undefined {
  if (!url) return undefined;
  return url.includes("/upload/")
    ? url.replace("/upload/", "/upload/c_fill,w_400,h_400,q_auto,f_auto/")
    : url;
}

const DUREE_LABELS: Record<string, string> = {
  "1-2h": "1h – 2h",
  "2-3h": "2h – 3h",
  "3-4h": "3h – 4h",
  "4-6h": "4h – 6h",
  "journee": "Journée complète",
};

const TABLE_FORM_VIDE = {
  systeme: "",
  systemeAutre: "",
  description: "",
  placesMax: 4,
  duree: "2-3h",
  personnages: "pretires" as "pretires" | "creation",
  ageTag: "tous" as "tous" | "16" | "18",
};

// ─── Composant ────────────────────────────────────────────────────────────────

export default function VenueEventsClient({
  slug,
  lieu,
  venue,
}: {
  slug: string;
  lieu: string;
  // Optionnel : le lieu peut ne pas (encore) exister dans la collection
  // Firestore "lieux" — ex. un slug auto-généré par un ancien formulaire
  // ("autre_2026-10-11_..."). Dans ce cas on affiche un en-tête de repli
  // construit à partir des événements trouvés pour ce slug.
  venue?: VenueInfo;
}) {
  const [inscriptionsParEvent, setInscriptionsParEvent] = useState<Record<string, InscriptionJoueur[]>>({});
  const [loadingInscriptions, setLoadingInscriptions] = useState<Record<string, boolean>>({});
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
  // Id de la table en cours de modification par le MJ, par événement (null = création d'une nouvelle table)
  const [editingTableId, setEditingTableId] = useState<Record<string, string | null>>({});

  // Image de la table, par événement (clé = eventId)
  const [tableImageFile, setTableImageFile] = useState<Record<string, File | null>>({});
  const [tableImagePreview, setTableImagePreview] = useState<Record<string, string | null>>({});
  const [uploadingTableImage, setUploadingTableImage] = useState<Record<string, boolean>>({});

  const MANUAL_FORM_VIDE = { prenom: "", nom: "", nombrePlaces: 1, tableId: "" };

  const [manualFormOpen, setManualFormOpen] = useState<Record<string, boolean>>({});
  const [manualForm, setManualForm] = useState<Record<string, typeof MANUAL_FORM_VIDE>>({});
  const [submittingManuel, setSubmittingManuel] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<{ event: EventDoc; table: TableMJ | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);

  // Désinscription
  const [toCancel, setToCancel] = useState<{ event: EventDoc; table: TableMJ | null } | null>(null);
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Annulation d'une animation entière (par le MJ référent ou un admin)
  const [toCancelEvent, setToCancelEvent] = useState<EventDoc | null>(null);
  const [submittingCancelEvent, setSubmittingCancelEvent] = useState(false);

  const estMJ = userProfile?.role === "mj" || userProfile?.role === "admin";

  // Fiche détaillée : animation (tableId = null) ou table précise
  const [detail, setDetail] = useState<{ eventId: string; tableId: string | null } | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // Ajout d'une table pour le compte d'un autre MJ (organisateur / admin)
  // clé = eventId ; null = formulaire "ma propre table"
  const [pourAutreMj, setPourAutreMj] = useState<Record<string, { mjId: string; nomLibre: string } | null>>({});
  const [mjsDisponibles, setMjsDisponibles] = useState<{ id: string; nom: string }[]>([]);
  const [loadingMjs, setLoadingMjs] = useState(false);

  useEffect(() => {
    detailRef.current?.scrollTo({ top: 0 });
  }, [detail?.eventId, detail?.tableId]);

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
    const lieuNormalise = lieu.trim().toLowerCase();

    getDocs(
      query(
        collection(db, "evenements"),
        where("categorie", "==", slug)
        // ⚠️ On ne filtre plus "lieu" côté Firestore : la comparaison stricte
        // ("Destruction-Room" !== "destruction-room") faisait disparaître
        // silencieusement des animations dont le champ lieu était mal casé
        // par rapport au slug de l'URL. On filtre donc côté client, en
        // comparant les deux en minuscules.
      )
    ).then(snap => {
      if (cancelled) return;
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as EventDoc[];
      const upcoming = all
        .filter(e => (e.lieu ?? "").trim().toLowerCase() === lieuNormalise)
        .filter(e => e.date >= todayISO && !e.annule)
        .sort((a, b) => a.date.localeCompare(b.date));
      setEvents(upcoming);
      setLoading(false);
    }).catch(() => setLoading(false));

    return () => { cancelled = true; };
  }, [lieu, slug]);

  // Précharge les tables de chaque animation pour les afficher directement
  // sur la carte (sans avoir à la déplier).
  useEffect(() => {
    let cancelled = false;
    events.forEach(ev => {
      if (tablesParEvent[ev.id]) return;
      getDocs(collection(db, "evenements", ev.id, "tables")).then(snap => {
        if (cancelled) return;
        const tables = snap.docs.map(d => ({ id: d.id, inscrits: 0, ...d.data() })) as TableMJ[];
        setTablesParEvent(prev => (prev[ev.id] ? prev : { ...prev, [ev.id]: tables }));
      }).catch(() => {});
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  async function toggleExpand(eventId: string) {
    if (expandedId === eventId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(eventId);
    await chargerDonnees(eventId);
  }

  // Charge tables, inscription du joueur et (si référent) la liste des inscrits
  async function chargerDonnees(eventId: string) {
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

    // ── Suivi complet pour le MJ référent (organisateur) ou l'admin ──────────
    const event = events.find(ev => ev.id === eventId);
    const estReferent = !!user && !!event &&
      (event.mjId === user.uid || userProfile?.role === "admin");

    if (estReferent && !(eventId in inscriptionsParEvent)) {
      setLoadingInscriptions(prev => ({ ...prev, [eventId]: true }));
      try {
        const snap = await getDocs(collection(db, "evenements", eventId, "inscriptions"));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as InscriptionJoueur[];
        setInscriptionsParEvent(prev => ({ ...prev, [eventId]: list }));
      } catch {
        setInscriptionsParEvent(prev => ({ ...prev, [eventId]: [] }));
      } finally {
        setLoadingInscriptions(prev => ({ ...prev, [eventId]: false }));
      }
    }
  }

  function openDetail(eventId: string, tableId: string | null) {
    setDetail({ eventId, tableId });
    chargerDonnees(eventId);
  }

  // Clic sur une tuile de table : ouvre directement l'inscription.
  // Cas particuliers (table non validée, organisateur, MJ de la table) : on ouvre
  // la fiche pour afficher la raison au lieu de ne rien faire.
  function ouvrirTable(event: EventDoc, table: TableMJ) {
    if (table.status !== "approved" || raisonBlocage(event, table)) {
      openDetail(event.id, table.id);
      return;
    }
    openRegisterModal(event, table);
  }

  // Clic sur une table dans la fiche détaillée : inscription immédiate.
  // Cas particuliers (non connecté, table non validée, organisateur, MJ de la table).
  function inscrireDirect(event: EventDoc, table: TableMJ) {
    if (authLoading || submitting) return;
    if (!user) {
      allerSeConnecter();
      return;
    }
    if (table.status !== "approved" || raisonBlocage(event, table)) {
      openDetail(event.id, table.id);
      return;
    }
    // La fenêtre s'ouvre en « Envoi… » puis affiche « Inscription confirmée ! »
    // (ou « liste d'attente » si la table est complète)
    setSelected({ event, table });
    handleConfirmInscription({ event, table });
  }

  // L'organisateur (MJ référent) ne s'inscrit pas comme joueur à son animation,
  // et un MJ ne s'inscrit pas à sa propre table. Renvoie le message à afficher.
  function raisonBlocage(event: EventDoc, table: TableMJ | null): string | null {
    if (!user) return null;
    if (event.mjId === user.uid) {
      return "Vous organisez cette animation : l'inscription comme joueur est désactivée.";
    }
    if (table && table.mjId === user.uid) {
      return "Vous êtes le MJ de cette table : vous ne pouvez pas vous y inscrire.";
    }
    return null;
  }

  function allerSeConnecter() {
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
  }

  function openRegisterModal(event: EventDoc, table: TableMJ | null) {
    if (authLoading) return;
    if (!user) {
      allerSeConnecter();
      return;
    }
    if (raisonBlocage(event, table)) return;
    setSelected({ event, table });
  }

  function closeModal() {
    setSelected(null);
    setSuccess(false);
    setWaitlisted(false);
  }

  async function handleConfirmInscription(cible?: { event: EventDoc; table: TableMJ | null }) {
    const cibleFinale = cible ?? selected;
    if (!cibleFinale || !user || !userProfile) return;
    const { event, table } = cibleFinale;
    if (raisonBlocage(event, table)) return;
    if (table && table.status !== "approved") {
      alert("Cette table n'est pas encore validée : les inscriptions sont fermées.");
      return;
    }
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

      try {
        await fetch("/api/inscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userProfile.email,
            pseudo: userProfile.pseudo,
            eventTitle: event.titre,
            date: event.date,
            heure: event.heure,
            table: table?.mjNom
              ? `${table.mjNom}${table.systeme ? ` - ${table.systeme}` : ""}`
              : null,
            statut: result.statut,
            // Lien direct vers la page de l'animation, utilisable dans l'email
            lien: window.location.origin + (event.lien || `/evenements/${slug}/${lieu}/${event.id}`),
          }),
        });
      } catch (err) {
        console.error("Erreur envoi email :", err);
      }

      if (table) {
        setTablesParEvent(prev => ({
          ...prev,
          [event.id]: (prev[event.id] ?? []).map(t =>
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

  // ── Liste d'attente : promotion automatique quand une place se libère ─────

  async function promouvoirListeAttente(eventId: string, table: TableMJ | null) {
    try {
      const snap = await getDocs(
        query(collection(db, "evenements", eventId, "inscriptions"), where("statut", "==", "attente"))
      );
      const candidats = snap.docs
        .filter(d => (d.data().tableId ?? null) === (table?.id ?? null))
        .sort((a, b) => {
          const ta = a.data().createdAt?.toMillis?.() ?? 0;
          const tb = b.data().createdAt?.toMillis?.() ?? 0;
          return ta - tb;
        });
      if (candidats.length === 0) return null;

      const promu = candidats[0];
      const promuData = promu.data() as any;

      await updateDoc(promu.ref, { statut: "confirme" });

      if (promuData.userId) {
        const globalSnap = await getDocs(
          query(collection(db, "inscriptions"), where("eventId", "==", eventId), where("userId", "==", promuData.userId))
        );
        await Promise.all(globalSnap.docs.map(d => updateDoc(d.ref, { statut: "confirme" })));
      }

      const eventInfo = events.find(ev => ev.id === eventId);
      if (promuData.email) {
        try {
          await fetch("/api/inscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: promuData.email,
              pseudo: promuData.pseudo,
              eventTitle: eventInfo?.titre ?? "",
              date: eventInfo?.date ?? "",
              heure: eventInfo?.heure ?? "",
              table: table ? `${table.mjNom}${table.systeme ? ` - ${table.systeme}` : ""}` : null,
              statut: "confirme",
              promotionListeAttente: true,
              lien: window.location.origin + (eventInfo?.lien || `/evenements/${slug}/${lieu}/${eventId}`),
            }),
          });
        } catch (err) {
          console.error("Erreur envoi email de promotion :", err);
        }
      }

      return { id: promu.id, ...promuData };
    } catch (err) {
      console.error("Erreur promotion liste d'attente :", err);
      return null;
    }
  }

  // ── Désinscription ─────────────────────────────────────────────────────────

  async function handleDesinscription() {
    if (!toCancel || !user) return;
    const { event, table } = toCancel;
    setSubmittingCancel(true);
    try {
      const inscrSnap = await getDocs(
        query(collection(db, "evenements", event.id, "inscriptions"), where("userId", "==", user.uid))
      );
      if (inscrSnap.empty) {
        setMesInscriptions(prev => ({ ...prev, [event.id]: null }));
        setToCancel(null);
        return;
      }
      const inscrDoc = inscrSnap.docs[0];
      const statut = (inscrDoc.data().statut as "confirme" | "attente") ?? "confirme";

      await deleteDoc(inscrDoc.ref);

      // Nettoyage du doc miroir dans la collection globale "inscriptions"
      const globalSnap = await getDocs(
        query(collection(db, "inscriptions"), where("eventId", "==", event.id), where("userId", "==", user.uid))
      );
      await Promise.all(globalSnap.docs.map(d => deleteDoc(d.ref)));

      let promu: any = null;

      if (statut === "confirme") {
        // On tente d'abord de faire monter quelqu'un de la liste d'attente :
        // la place n'est alors pas vraiment "libérée", juste transférée.
        promu = await promouvoirListeAttente(event.id, table);

        if (!promu) {
          if (table) {
            await updateDoc(doc(db, "evenements", event.id, "tables", table.id), { inscrits: increment(-1) });
          } else {
            await updateDoc(doc(db, "evenements", event.id), { inscrits: increment(-1) });
          }
          if (table) {
            setTablesParEvent(prev => ({
              ...prev,
              [event.id]: (prev[event.id] ?? []).map(t =>
                t.id === table.id ? { ...t, inscrits: Math.max(0, (t.inscrits ?? 0) - 1) } : t
              ),
            }));
          } else {
            setEvents(prev => prev.map(ev =>
              ev.id === event.id ? { ...ev, inscrits: Math.max(0, (ev.inscrits ?? 0) - 1) } : ev
            ));
          }
        }
      }

      setInscriptionsParEvent(prev => {
        if (!(event.id in prev)) return prev;
        let list = prev[event.id].filter(i => i.id !== inscrDoc.id);
        if (promu) {
          list = list.map(i => i.id === promu.id ? { ...i, statut: "confirme" as const } : i);
        }
        return { ...prev, [event.id]: list };
      });

      setMesInscriptions(prev => ({ ...prev, [event.id]: null }));
      setToCancel(null);
    } catch (err: any) {
      alert(err.message || "Une erreur est survenue lors de la désinscription.");
    } finally {
      setSubmittingCancel(false);
    }
  }

  // ── Annulation d'une animation entière ─────────────────────────────────────

  async function handleAnnulerEvenement() {
    if (!toCancelEvent) return;
    const eventId = toCancelEvent.id;
    setSubmittingCancelEvent(true);
    try {
      const snap = await getDocs(collection(db, "evenements", eventId, "inscriptions"));
      const inscrits = snap.docs.map(d => d.data() as any).filter(i => !!i.email);

      await updateDoc(doc(db, "evenements", eventId), { annule: true });

      await Promise.all(
        inscrits.map(i =>
          fetch("/api/inscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: i.email,
              pseudo: i.pseudo,
              eventTitle: toCancelEvent.titre,
              date: toCancelEvent.date,
              heure: toCancelEvent.heure,
              table: i.tableMjNom ?? null,
              statut: "annule",
              evenementAnnule: true,
            }),
          }).catch(err => console.error("Erreur email d'annulation :", err))
        )
      );

      setEvents(prev => prev.filter(e => e.id !== eventId));
      setExpandedId(prev => (prev === eventId ? null : prev));
      setToCancelEvent(null);
    } catch (err: any) {
      alert("Erreur lors de l'annulation : " + (err.message || "inconnue"));
    } finally {
      setSubmittingCancelEvent(false);
    }
  }

  // ── Proposer une table (formulaire inline MJ) ─────────────────────────────

  async function chargerMjs() {
    if (mjsDisponibles.length > 0 || loadingMjs) return;
    setLoadingMjs(true);
    try {
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "in", ["mj", "admin"]))
      );
      const list = snap.docs
        .map(d => {
          const x = d.data() as any;
          const nom = x.pseudo || `${x.prenom || ""} ${x.nom || ""}`.trim() || x.email || "MJ";
          return { id: d.id, nom };
        })
        .sort((a, b) => a.nom.localeCompare(b.nom));
      setMjsDisponibles(list);
    } catch {
      // Règles Firestore ou réseau : on laissera la saisie libre du nom
    } finally {
      setLoadingMjs(false);
    }
  }

  function ouvrirFormulaireTablePourAutre(eventId: string) {
    setTableForm(prev => ({ ...prev, [eventId]: { ...TABLE_FORM_VIDE } }));
    setEditingTableId(prev => ({ ...prev, [eventId]: null }));
    setTableImageFile(prev => ({ ...prev, [eventId]: null }));
    setTableImagePreview(prev => ({ ...prev, [eventId]: null }));
    setPourAutreMj(prev => ({ ...prev, [eventId]: { mjId: "", nomLibre: "" } }));
    setTableFormOpen(prev => ({ ...prev, [eventId]: true }));
    chargerMjs();
  }

  function ouvrirFormulaireTable(eventId: string) {
    setPourAutreMj(prev => ({ ...prev, [eventId]: null }));
    setTableForm(prev => ({ ...prev, [eventId]: { ...TABLE_FORM_VIDE } }));
    setEditingTableId(prev => ({ ...prev, [eventId]: null }));
    setTableImageFile(prev => ({ ...prev, [eventId]: null }));
    setTableImagePreview(prev => ({ ...prev, [eventId]: null }));
    setTableFormOpen(prev => ({ ...prev, [eventId]: true }));
  }

  function ouvrirFormulaireEdition(eventId: string, table: TableMJ) {
    const systemeConnu = SYSTEMES.includes(table.systeme);
    setTableForm(prev => ({
      ...prev,
      [eventId]: {
        systeme: systemeConnu ? table.systeme : "Autre",
        systemeAutre: systemeConnu ? "" : table.systeme,
        description: table.description,
        placesMax: table.placesMax,
        duree: table.duree ?? "2-3h",
        personnages: table.personnages ?? "pretires",
        ageTag: table.ageTag ?? "tous",
      },
    }));
    setEditingTableId(prev => ({ ...prev, [eventId]: table.id }));
    setPourAutreMj(prev => ({ ...prev, [eventId]: null }));
    setTableImageFile(prev => ({ ...prev, [eventId]: null }));
    setTableImagePreview(prev => ({ ...prev, [eventId]: table.image || null }));
    setTableFormOpen(prev => ({ ...prev, [eventId]: true }));
  }

  function fermerFormulaireTable(eventId: string) {
    setPourAutreMj(prev => ({ ...prev, [eventId]: null }));
    setTableFormOpen(prev => ({ ...prev, [eventId]: false }));
    setEditingTableId(prev => ({ ...prev, [eventId]: null }));
    setTableImageFile(prev => ({ ...prev, [eventId]: null }));
    setTableImagePreview(prev => ({ ...prev, [eventId]: null }));
  }

  function handleTableImageChange(eventId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Le fichier doit être une image."); return; }
    // 10 Mo : plafond habituel de l'offre gratuite Cloudinary
    if (file.size > 10 * 1024 * 1024) { alert("L'image ne doit pas dépasser 10 Mo."); return; }
    setTableImageFile(prev => ({ ...prev, [eventId]: file }));
    setTableImagePreview(prev => ({ ...prev, [eventId]: URL.createObjectURL(file) }));
  }

  function handleRemoveTableImage(eventId: string, e: React.MouseEvent) {
    e.preventDefault();
    setTableImageFile(prev => ({ ...prev, [eventId]: null }));
    setTableImagePreview(prev => ({ ...prev, [eventId]: null }));
  }

  async function proposerTable(eventId: string) {
    if (!user || !userProfile) return;
    const form = tableForm[eventId];
    if (!form) return;

    const systemeLabel = form.systeme === "Autre" ? form.systemeAutre : form.systeme;
    if (!systemeLabel || !form.description) {
      alert("Merci de renseigner le système et la description de la table.");
      return;
    }

    // Table ajoutée par l'organisateur / admin pour un autre MJ
    const autre = pourAutreMj[eventId] ?? null;
    let mjIdFinal = user.uid;
    let mjNomFinal = userProfile.pseudo || userProfile.email;
    if (autre) {
      if (autre.mjId === "__autre__") {
        if (!autre.nomLibre.trim()) {
          alert("Merci de saisir le nom du MJ.");
          return;
        }
        mjIdFinal = "";
        mjNomFinal = autre.nomLibre.trim();
      } else {
        const mjChoisi = mjsDisponibles.find(m => m.id === autre.mjId);
        if (!mjChoisi) {
          alert("Merci de choisir le MJ de cette table.");
          return;
        }
        if ((tablesParEvent[eventId] ?? []).some(t => t.mjId === mjChoisi.id)) {
          alert(`${mjChoisi.nom} a déjà une table sur cette animation.`);
          return;
        }
        mjIdFinal = mjChoisi.id;
        mjNomFinal = mjChoisi.nom;
      }
    }

    setSubmittingTable(prev => ({ ...prev, [eventId]: true }));
    try {
      let imageUrl = "";
      const file = tableImageFile[eventId];
      if (file) {
        setUploadingTableImage(prev => ({ ...prev, [eventId]: true }));
        try {
          imageUrl = await uploadToCloudinary(file);
        } finally {
          setUploadingTableImage(prev => ({ ...prev, [eventId]: false }));
        }
      }

      const nouvelleTable = {
        mjId: mjIdFinal,
        mjNom: mjNomFinal,
        systeme: systemeLabel,
        description: form.description,
        placesMax: Number(form.placesMax) || 1,
        inscrits: 0,
        // Ajoutée par l'organisateur / admin : validée d'office
        status: (autre ? "approved" : "pending") as "pending" | "approved",
        ...(autre ? { ajoutePar: user.uid } : {}),
        image: imageUrl,
        duree: form.duree,
        personnages: form.personnages,
        ageTag: form.ageTag,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "evenements", eventId, "tables"), nouvelleTable);

      setTablesParEvent(prev => ({
        ...prev,
        [eventId]: [...(prev[eventId] ?? []), { id: docRef.id, ...nouvelleTable }],
      }));

      setPourAutreMj(prev => ({ ...prev, [eventId]: null }));
      setTableFormOpen(prev => ({ ...prev, [eventId]: false }));
      setTableForm(prev => ({ ...prev, [eventId]: { ...TABLE_FORM_VIDE } }));
      setTableImageFile(prev => ({ ...prev, [eventId]: null }));
      setTableImagePreview(prev => ({ ...prev, [eventId]: null }));
    } catch (err: any) {
      alert("Erreur lors de la proposition de table : " + (err.message || "inconnue"));
    } finally {
      setSubmittingTable(prev => ({ ...prev, [eventId]: false }));
    }
  }

  async function modifierTable(eventId: string) {
    if (!user || !userProfile) return;
    const editId = editingTableId[eventId];
    if (!editId) return;
    const form = tableForm[eventId];
    if (!form) return;

    const systemeLabel = form.systeme === "Autre" ? form.systemeAutre : form.systeme;
    if (!systemeLabel || !form.description) {
      alert("Merci de renseigner le système et la description de la table.");
      return;
    }

    const tableActuelle = (tablesParEvent[eventId] ?? []).find(t => t.id === editId);
    if (tableActuelle && Number(form.placesMax) < (tableActuelle.inscrits ?? 0)) {
      alert(`Impossible de descendre à ${form.placesMax} places : ${tableActuelle.inscrits} joueur(s) déjà inscrit(s) à cette table.`);
      return;
    }

    setSubmittingTable(prev => ({ ...prev, [eventId]: true }));
    try {
      let imageUrl = tableActuelle?.image ?? "";
      const file = tableImageFile[eventId];
      if (file) {
        setUploadingTableImage(prev => ({ ...prev, [eventId]: true }));
        try {
          imageUrl = await uploadToCloudinary(file);
        } finally {
          setUploadingTableImage(prev => ({ ...prev, [eventId]: false }));
        }
      }

      const updates = {
        systeme: systemeLabel,
        description: form.description,
        placesMax: Number(form.placesMax) || 1,
        image: imageUrl,
        duree: form.duree,
        personnages: form.personnages,
        ageTag: form.ageTag,
      };

      await updateDoc(doc(db, "evenements", eventId, "tables", editId), updates);

      setTablesParEvent(prev => ({
        ...prev,
        [eventId]: (prev[eventId] ?? []).map(t => t.id === editId ? { ...t, ...updates } : t),
      }));

      setTableFormOpen(prev => ({ ...prev, [eventId]: false }));
      setEditingTableId(prev => ({ ...prev, [eventId]: null }));
      setTableForm(prev => ({ ...prev, [eventId]: { ...TABLE_FORM_VIDE } }));
      setTableImageFile(prev => ({ ...prev, [eventId]: null }));
      setTableImagePreview(prev => ({ ...prev, [eventId]: null }));
    } catch (err: any) {
      alert("Erreur lors de la modification de la table : " + (err.message || "inconnue"));
    } finally {
      setSubmittingTable(prev => ({ ...prev, [eventId]: false }));
    }
  }

  function ouvrirFormulaireManuel(eventId: string) {
    setManualForm(prev => ({ ...prev, [eventId]: prev[eventId] ?? { ...MANUAL_FORM_VIDE } }));
    setManualFormOpen(prev => ({ ...prev, [eventId]: true }));
  }

  function fermerFormulaireManuel(eventId: string) {
    setManualFormOpen(prev => ({ ...prev, [eventId]: false }));
  }

  async function ajouterInscriptionManuelle(eventId: string) {
    if (!user) return;
    const form = manualForm[eventId] ?? MANUAL_FORM_VIDE;
    if (!form.prenom.trim() || !form.nom.trim() || form.nombrePlaces < 1) {
      alert("Merci de renseigner le prénom, le nom et le nombre de places.");
      return;
    }

    const tableChoisie = form.tableId
      ? (tablesParEvent[eventId] ?? []).find(t => t.id === form.tableId) ?? null
      : null;

    setSubmittingManuel(prev => ({ ...prev, [eventId]: true }));
    try {
      const result: { statut: "confirme" | "attente" } = { statut: "confirme" };

      if (tableChoisie) {
        await runTransaction(db, async (transaction) => {
          const tableRef = doc(db, "evenements", eventId, "tables", tableChoisie.id);
          const tableSnap = await transaction.get(tableRef);
          if (!tableSnap.exists()) throw new Error("Cette table n'existe plus.");
          const d = tableSnap.data();
          const placesRestantes = (d.placesMax ?? 0) - (d.inscrits || 0);
          if (placesRestantes >= form.nombrePlaces) {
            result.statut = "confirme";
            transaction.update(tableRef, { inscrits: increment(form.nombrePlaces) });
          } else {
            result.statut = "attente";
          }
        });
      } else {
        await runTransaction(db, async (transaction) => {
          const eventRef = doc(db, "evenements", eventId);
          const eventSnap = await transaction.get(eventRef);
          if (!eventSnap.exists()) throw new Error("Animation introuvable");
          const d = eventSnap.data();
          const placesRestantes = (d.places ?? 0) - (d.inscrits || 0);
          if (placesRestantes >= form.nombrePlaces) {
            result.statut = "confirme";
            transaction.update(eventRef, { inscrits: increment(form.nombrePlaces) });
          } else {
            result.statut = "attente";
          }
        });
      }

      const docRef = await addDoc(collection(db, "evenements", eventId, "inscriptions"), {
        manuel: true,
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        pseudo: `${form.prenom.trim()} ${form.nom.trim()}`,
        email: "",
        nombrePlaces: form.nombrePlaces,
        tableId: tableChoisie?.id || null,
        tableMjNom: tableChoisie?.mjNom || null,
        statut: result.statut,
        ajoutePar: user.uid,
        createdAt: serverTimestamp(),
      });

      setInscriptionsParEvent(prev => ({
        ...prev,
        [eventId]: [
          ...(prev[eventId] ?? []),
          {
            id: docRef.id,
            prenom: form.prenom.trim(),
            nom: form.nom.trim(),
            pseudo: `${form.prenom.trim()} ${form.nom.trim()}`,
            email: "",
            statut: result.statut,
            tableId: tableChoisie?.id || null,
            tableMjNom: tableChoisie?.mjNom || null,
            manuel: true,
            nombrePlaces: form.nombrePlaces,
          },
        ],
      }));

      if (result.statut === "confirme") {
        if (tableChoisie) {
          setTablesParEvent(prev => ({
            ...prev,
            [eventId]: (prev[eventId] ?? []).map(t =>
              t.id === tableChoisie.id
                ? { ...t, inscrits: (t.inscrits ?? 0) + form.nombrePlaces }
                : t
            ),
          }));
        } else {
          setEvents(prev => prev.map(ev =>
            ev.id === eventId
              ? { ...ev, inscrits: (ev.inscrits ?? 0) + form.nombrePlaces }
              : ev
          ));
        }
      }

      setManualFormOpen(prev => ({ ...prev, [eventId]: false }));
      setManualForm(prev => ({ ...prev, [eventId]: { ...MANUAL_FORM_VIDE } }));
    } catch (err: any) {
      alert("Erreur lors de l'ajout : " + (err.message || "inconnue"));
    } finally {
      setSubmittingManuel(prev => ({ ...prev, [eventId]: false }));
    }
  }

  // Lieu non (encore) déclaré dans Firestore ("lieux") : on construit un
  // en-tête de repli à partir du premier événement trouvé pour ce slug,
  // pour ne jamais afficher une page cassée faute de fiche lieu.
  const venueAffichee: VenueInfo = venue ?? {
    venue: events[0]?.ville || events[0]?.titre || "Lieu à préciser",
    ville: events[0]?.ville || "",
    adresse: events[0]?.ville || "Adresse à préciser",
    schedule: "",
    image: undefined,
  };

  // Table affichée dans la modale d'inscription (version à jour après une inscription)
  const tableModal: TableMJ | null = selected?.table
    ? (tablesParEvent[selected.event.id] ?? []).find(t => t.id === selected.table!.id) ?? selected.table
    : null;
  const modalPlaces = tableModal
    ? tableModal.placesMax - (tableModal.inscrits ?? 0)
    : selected
      ? selected.event.places - (selected.event.inscrits ?? 0)
      : 0;
  const blocage = selected ? raisonBlocage(selected.event, tableModal) : null;

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

      <Hero $bgImage={venueAffichee.image}>
        <HeroContent>
          <BackLink href={`/evenements/${slug}`}>← Retour aux animations</BackLink>
          <Title>{venueAffichee.venue}</Title>
          <MetaRow>
            {venueAffichee.adresse && <MetaItem>📍 {venueAffichee.adresse}</MetaItem>}
            {venueAffichee.schedule && <RecurringBadge>🔁 {venueAffichee.schedule}</RecurringBadge>}
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
                  const estReferent = !!user && (e.mjId === user.uid || userProfile?.role === "admin");
                  const inscriptionsDeCetteDate = inscriptionsParEvent[e.id] ?? [];
                  const dispo = e.places - (e.inscrits ?? 0);
                  const level = getPlacesLevel(dispo);
                  const estProchaine = events[0].id === e.id;
                  const isExpanded = expandedId === e.id;
                  const tables = tablesParEvent[e.id] ?? [];
                  const tablesApprouvees = tables.filter(t => t.status === "approved");
                  // L'organisateur / admin voit TOUTES les tables (y compris en attente / refusées)
                  const tablesAffichees = estReferent ? tables : tablesApprouvees;
                  const monInscription = mesInscriptions[e.id];
                  const myTable = user ? tables.find(t => t.mjId === user.uid) ?? null : null;
                  const formOuvert = tableFormOpen[e.id] ?? false;
                  const formValues = tableForm[e.id] ?? TABLE_FORM_VIDE;
                  const busyTable = submittingTable[e.id] ?? false;
                  const blocageEvent = raisonBlocage(e, null);

                  return (
                    <EventCard key={e.id} $isNext={estProchaine}>
                      <CardTop>
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
                          </RightCol>
                        </EventTopRow>

                        <EventName>{e.titre}</EventName>
                        {e.accroche && <EventPitch>{e.accroche}</EventPitch>}
                        {e.description && <EventDesc>{e.description}</EventDesc>}

                        {e.programme && e.programme.length > 0 && (
                          <EventSteps>
                            {e.programme.map((p, i) => (
                              <li key={i}>{p.heure} · {p.titre}</li>
                            ))}
                          </EventSteps>
                        )}

                        <EventActions>
                          <DetailBtn href={e.lien || `/evenements/${slug}/${lieu}/${e.id}`}>
                            {level === "full" ? "Voir les détails, liste d'attente →" : "Voir les détails et s'inscrire →"}
                          </DetailBtn>
                          <ToggleBtn
                            onClick={(ev) => { ev.stopPropagation(); toggleExpand(e.id); }}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? "▲ Réduire" : "▼ Autres options"}
                          </ToggleBtn>
                        </EventActions>
                      </CardTop>

                      {(tablesAffichees.length > 0 || estReferent) && (
                        <TablesStrip>
                          <SubLabel>
                            {estReferent
                              ? `Toutes les tables (${tables.length}) · cliquez pour vous inscrire`
                              : "Tables proposées · cliquez sur une table pour vous inscrire"}
                          </SubLabel>
                          {tablesAffichees.length === 0 && (
                            <NoTablesMsg style={{ marginBottom: "0.6rem" }}>Aucune table pour le moment.</NoTablesMsg>
                          )}
                          <TCGrid style={{ marginBottom: 0 }}>
                            {tablesAffichees.map(t => {
                              const placesT = t.placesMax - (t.inscrits ?? 0);
                              return (
                                <TableSquare
                                  key={t.id}
                                  type="button"
                                  onClick={() => ouvrirTable(e, t)}
                                  $image={squareThumb(t.image)}
                                  aria-label={`S'inscrire à la table ${t.systeme} de ${t.mjNom}`}
                                  title={t.description}
                                >
                                  {!t.image && <SquareFallback>🎲</SquareFallback>}
                                  <SquareTop>
                                    <PlacesBadge $level={getPlacesLevel(placesT)}>
                                      {placesT <= 0 ? "Complet" : `${placesT} place${placesT > 1 ? "s" : ""}`}
                                    </PlacesBadge>
                                    {t.ageTag && t.ageTag !== "tous" && (
                                      <AgeTag $level={t.ageTag} style={{ marginLeft: 0 }}>{t.ageTag}+</AgeTag>
                                    )}
                                  </SquareTop>
                                  <SquareBottom>
                                    <SquareSysteme>{t.systeme}</SquareSysteme>
                                    <SquareMj>🧙 {t.mjNom}</SquareMj>
                                    {t.status !== "approved" && (
                                      <StatusPill $tone={t.status === "rejected" ? "danger" : "warn"} style={{ display: "inline-block", marginTop: 4 }}>
                                        {t.status === "rejected" ? "Refusée" : "En attente"}
                                      </StatusPill>
                                    )}
                                  </SquareBottom>
                                </TableSquare>
                              );
                            })}
                          </TCGrid>

                          {estReferent && (
                            <ProposeTableBtn
                              style={{ marginTop: "0.8rem" }}
                              onClick={() => {
                                setExpandedId(e.id);
                                chargerDonnees(e.id);
                                ouvrirFormulaireTablePourAutre(e.id);
                              }}
                            >
                              ➕ Ajouter une table pour un autre MJ
                            </ProposeTableBtn>
                          )}
                        </TablesStrip>
                      )}

                      {isExpanded && (
                        <ExpandedZone>
                          <Divider />

                          {monInscription ? (
                            <GeneralRegisterBox>
                              <GeneralRegisterText>
                                {monInscription.tableId
                                  ? "✅ Vous êtes inscrit à une table de cette animation."
                                  : "✅ Vous êtes inscrit à cette animation (sans table précise)."}
                              </GeneralRegisterText>
                              <SmallBtn
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  const tableInscrite = monInscription.tableId
                                    ? tables.find(t => t.id === monInscription.tableId) ?? null
                                    : null;
                                  setToCancel({ event: e, table: tableInscrite });
                                }}
                                style={{ background: "rgba(255,80,80,0.12)", borderColor: "rgba(255,80,80,0.35)", color: "#ff8080" }}
                              >
                                Se désinscrire
                              </SmallBtn>
                            </GeneralRegisterBox>
                          ) : (
                            <GeneralRegisterBox>
                              {blocageEvent ? (
                                <GeneralRegisterText>🎙️ {blocageEvent}</GeneralRegisterText>
                              ) : (
                                <>
                                  <GeneralRegisterText>
                                    Pas de préférence de table ? Inscrivez-vous directement à l&apos;animation.
                                  </GeneralRegisterText>
                                  <SmallBtn onClick={(ev) => { ev.stopPropagation(); openRegisterModal(e, null); }}>
                                    {!user ? "Se connecter" : level === "full" ? "📋 Liste d'attente" : "S'inscrire"}
                                  </SmallBtn>
                                </>
                              )}
                            </GeneralRegisterBox>
                          )}

                          {/* ── Bloc MJ : proposer / modifier sa table, inline ── */}
                          {(estMJ || estReferent) && (
                            <MjSection>
                              {formOuvert ? (
                                <TableFormBox onClick={(ev) => ev.stopPropagation()}>
                                  {pourAutreMj[e.id] && (
                                    <div>
                                      <FieldLabel>MJ de cette table</FieldLabel>
                                      <Select
                                        value={pourAutreMj[e.id]!.mjId}
                                        onChange={ev => setPourAutreMj(prev => ({
                                          ...prev,
                                          [e.id]: { mjId: ev.target.value, nomLibre: prev[e.id]?.nomLibre ?? "" },
                                        }))}
                                      >
                                        <option value="">{loadingMjs ? "Chargement des MJ…" : "— Choisir un MJ —"}</option>
                                        {mjsDisponibles.map(m => (
                                          <option key={m.id} value={m.id}>{m.nom}</option>
                                        ))}
                                        <option value="__autre__">Autre (saisir un nom)</option>
                                      </Select>
                                      {pourAutreMj[e.id]!.mjId === "__autre__" && (
                                        <Input
                                          style={{ marginTop: "0.5rem" }}
                                          value={pourAutreMj[e.id]!.nomLibre}
                                          onChange={ev => setPourAutreMj(prev => ({
                                            ...prev,
                                            [e.id]: { mjId: "__autre__", nomLibre: ev.target.value },
                                          }))}
                                          placeholder="Nom du MJ"
                                        />
                                      )}
                                      <NoTablesMsg style={{ margin: "0.4rem 0 0" }}>
                                        La table sera validée directement et le MJ choisi pourra la retrouver et la modifier.
                                      </NoTablesMsg>
                                    </div>
                                  )}

                                  <div>
                                    <FieldLabel>Système / jeu</FieldLabel>
                                    <Select
                                      value={formValues.systeme}
                                      onChange={ev => setTableForm(prev => ({
                                        ...prev,
                                        [e.id]: { ...formValues, systeme: ev.target.value },
                                      }))}
                                    >
                                      <option value="">— Choisir un système —</option>
                                      {SYSTEMES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </Select>
                                  </div>

                                  {formValues.systeme === "Autre" && (
                                    <div>
                                      <FieldLabel>Précisez le système</FieldLabel>
                                      <Input
                                        value={formValues.systemeAutre}
                                        onChange={ev => setTableForm(prev => ({
                                          ...prev,
                                          [e.id]: { ...formValues, systemeAutre: ev.target.value },
                                        }))}
                                        placeholder="Ex: Alien RPG, Blades in the Dark..."
                                      />
                                    </div>
                                  )}

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
                                    <FieldLabel>Image de la table (optionnel)</FieldLabel>
                                    <FileDropZone>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={ev => handleTableImageChange(e.id, ev)}
                                      />
                                      {tableImagePreview[e.id] ? (
                                        <>
                                          <PreviewImg src={tableImagePreview[e.id]!} alt="Aperçu" />
                                          <RemoveImgBtn onClick={(ev) => handleRemoveTableImage(e.id, ev)}>
                                            ✕ Retirer
                                          </RemoveImgBtn>
                                        </>
                                      ) : (
                                        <FileHint>📷 Cliquez pour ajouter une image (JPG, PNG — 10 Mo max)</FileHint>
                                      )}
                                    </FileDropZone>
                                    {uploadingTableImage[e.id] && (
                                      <UploadProgress>⏳ Envoi de l&apos;image en cours…</UploadProgress>
                                    )}
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

                                  <div>
                                    <FieldLabel>Durée estimée</FieldLabel>
                                    <Select
                                      value={formValues.duree}
                                      onChange={ev => setTableForm(prev => ({
                                        ...prev,
                                        [e.id]: { ...formValues, duree: ev.target.value },
                                      }))}
                                    >
                                      <option value="1-2h">1h - 2h</option>
                                      <option value="2-3h">2h - 3h</option>
                                      <option value="3-4h">3h - 4h</option>
                                      <option value="4-6h">4h - 6h</option>
                                      <option value="journee">Journée complète</option>
                                    </Select>
                                  </div>

                                  <FormActionsRow>
                                    <TypeBtnInline
                                      $active={formValues.personnages === "pretires"}
                                      onClick={() => setTableForm(prev => ({
                                        ...prev,
                                        [e.id]: { ...formValues, personnages: "pretires" },
                                      }))}
                                    >
                                      🧾 Prétirés fournis
                                    </TypeBtnInline>
                                    <TypeBtnInline
                                      $active={formValues.personnages === "creation"}
                                      onClick={() => setTableForm(prev => ({
                                        ...prev,
                                        [e.id]: { ...formValues, personnages: "creation" },
                                      }))}
                                    >
                                      ✏️ Création à la table
                                    </TypeBtnInline>
                                  </FormActionsRow>

                                  <div>
                                    <FieldLabel>
                                      Contenu / âge recommandé
                                      <AgeTag $level={formValues.ageTag}>
                                        {formValues.ageTag === "tous" ? "Tous publics" : formValues.ageTag === "16" ? "16+" : "18+"}
                                      </AgeTag>
                                    </FieldLabel>
                                    <Select
                                      value={formValues.ageTag}
                                      onChange={ev => setTableForm(prev => ({
                                        ...prev,
                                        [e.id]: { ...formValues, ageTag: ev.target.value as "tous" | "16" | "18" },
                                      }))}
                                    >
                                      <option value="tous">Tous publics</option>
                                      <option value="16">16+ (thèmes matures)</option>
                                      <option value="18">18+ (violence, horreur explicite...)</option>
                                    </Select>
                                  </div>

                                  <FormActionsRow>
                                    <CancelSmallBtn onClick={() => fermerFormulaireTable(e.id)}>
                                      Annuler
                                    </CancelSmallBtn>
                                    <SubmitTableBtn
                                      disabled={
                                        busyTable ||
                                        !formValues.description ||
                                        !formValues.systeme ||
                                        (formValues.systeme === "Autre" && !formValues.systemeAutre) ||
                                        (!!pourAutreMj[e.id] && !pourAutreMj[e.id]!.mjId)
                                      }
                                      onClick={() => (editingTableId[e.id] ? modifierTable(e.id) : proposerTable(e.id))}
                                    >
                                      {busyTable
                                        ? (uploadingTableImage[e.id] ? "Envoi de l'image…" : "Envoi…")
                                        : (editingTableId[e.id] ? "Enregistrer les modifications" : pourAutreMj[e.id] ? "Ajouter la table" : "Proposer la table")}
                                    </SubmitTableBtn>
                                  </FormActionsRow>
                                </TableFormBox>
                              ) : myTable ? (
                                <>
                                  <MyTableStatus $status={myTable.status}>
                                    {myTable.status === "pending"  && "⏳ Votre table est en attente de validation par un admin."}
                                    {myTable.status === "approved" && "✅ Votre table est validée et visible ci-dessus."}
                                    {myTable.status === "rejected" && "❌ Votre proposition de table n'a pas été retenue."}
                                  </MyTableStatus>
                                  <ProposeTableBtn
                                    style={{ marginTop: "0.6rem" }}
                                    onClick={(ev) => { ev.stopPropagation(); ouvrirFormulaireEdition(e.id, myTable); }}
                                  >
                                    ✏️ Modifier ma table
                                  </ProposeTableBtn>
                                </>
                              ) : (
                                <ProposeTableBtn onClick={(ev) => { ev.stopPropagation(); ouvrirFormulaireTable(e.id); }}>
                                  🧙 Proposer ma table pour cette animation
                                </ProposeTableBtn>
                              )}
                            </MjSection>
                          )}

                          {estReferent && (
                            <ReferentPanel>
                              <ReferentTitle>👁️ Suivi de l&apos;animation (organisateur)</ReferentTitle>

                              <SmallBtn
                                onClick={(ev) => { ev.stopPropagation(); setToCancelEvent(e); }}
                                style={{ background: "rgba(255,80,80,0.12)", borderColor: "rgba(255,80,80,0.35)", color: "#ff8080", marginBottom: "1rem" }}
                              >
                                🚫 Annuler cette animation
                              </SmallBtn>

                              <ReferentSubLabel>
                                Joueurs inscrits ({inscriptionsDeCetteDate.filter(i => i.statut === "confirme").length})
                              </ReferentSubLabel>
                              {loadingInscriptions[e.id] ? (
                                <NoTablesMsg>Chargement…</NoTablesMsg>
                              ) : inscriptionsDeCetteDate.length === 0 ? (
                                <NoTablesMsg>Aucune inscription pour le moment.</NoTablesMsg>
                              ) : (
                                inscriptionsDeCetteDate.map(i => (
                                  <ReferentItem key={i.id}>
                                    <span>
                                      {i.pseudo || `${i.prenom ?? ""} ${i.nom ?? ""}`.trim() || i.email}
                                      {i.nombrePlaces && i.nombrePlaces > 1 ? ` · ${i.nombrePlaces} places` : ""}
                                      {i.tableMjNom ? ` · table de ${i.tableMjNom}` : " · sans table précise"}
                                      {i.manuel ? " · ajouté par le MJ" : ""}
                                    </span>
                                    <StatusPill $tone={i.statut === "confirme" ? "ok" : "warn"}>
                                      {i.statut === "confirme" ? "Confirmé" : "Liste d'attente"}
                                    </StatusPill>
                                  </ReferentItem>
                                ))
                              )}

                              <ReferentSubLabel>Tables proposées par les MJ ({tables.length})</ReferentSubLabel>
                              {tables.length === 0 ? (
                                <NoTablesMsg>Aucune table proposée pour le moment.</NoTablesMsg>
                              ) : (
                                tables.map(t => (
                                  <ReferentItem key={t.id}>
                                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                      {t.image && <TableThumb src={squareThumb(t.image)} alt="" />}
                                      🧙 {t.mjNom}{t.systeme ? ` · ${t.systeme}` : ""} · {t.inscrits}/{t.placesMax} places
                                    </span>
                                    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                      <StatusPill $tone={t.status === "approved" ? "ok" : t.status === "rejected" ? "danger" : "warn"}>
                                        {t.status === "approved" ? "Validée" : t.status === "rejected" ? "Refusée" : "En attente"}
                                      </StatusPill>
                                      <SmallBtn
                                        style={{ padding: "0.3rem 0.6rem" }}
                                        onClick={(ev) => { ev.stopPropagation(); ouvrirFormulaireEdition(e.id, t); }}
                                        title="Modifier cette table"
                                      >
                                        ✏️
                                      </SmallBtn>
                                    </span>
                                  </ReferentItem>
                                ))
                              )}

                              <ReferentSubLabel>Ajouter un joueur manuellement</ReferentSubLabel>
                              {!manualFormOpen[e.id] ? (
                                <ProposeTableBtn onClick={(ev) => { ev.stopPropagation(); ouvrirFormulaireManuel(e.id); }}>
                                  ➕ Inscrire quelqu&apos;un manuellement
                                </ProposeTableBtn>
                              ) : (
                                <TableFormBox onClick={(ev) => ev.stopPropagation()}>
                                  <div style={{ display: "flex", gap: "0.6rem" }}>
                                    <div style={{ flex: 1 }}>
                                      <FieldLabel>Prénom</FieldLabel>
                                      <Input
                                        value={(manualForm[e.id] ?? MANUAL_FORM_VIDE).prenom}
                                        onChange={ev => setManualForm(prev => ({
                                          ...prev,
                                          [e.id]: { ...(prev[e.id] ?? MANUAL_FORM_VIDE), prenom: ev.target.value },
                                        }))}
                                        placeholder="Jean"
                                      />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <FieldLabel>Nom</FieldLabel>
                                      <Input
                                        value={(manualForm[e.id] ?? MANUAL_FORM_VIDE).nom}
                                        onChange={ev => setManualForm(prev => ({
                                          ...prev,
                                          [e.id]: { ...(prev[e.id] ?? MANUAL_FORM_VIDE), nom: ev.target.value },
                                        }))}
                                        placeholder="Dupont"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <FieldLabel>Nombre de places</FieldLabel>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={(manualForm[e.id] ?? MANUAL_FORM_VIDE).nombrePlaces}
                                      onChange={ev => setManualForm(prev => ({
                                        ...prev,
                                        [e.id]: { ...(prev[e.id] ?? MANUAL_FORM_VIDE), nombrePlaces: Number(ev.target.value) },
                                      }))}
                                    />
                                  </div>
                                  {tables.filter(t => t.status === "approved").length > 0 && (
                                    <div>
                                      <FieldLabel>Table (optionnel)</FieldLabel>
                                      <Select
                                        value={(manualForm[e.id] ?? MANUAL_FORM_VIDE).tableId}
                                        onChange={ev => setManualForm(prev => ({
                                          ...prev,
                                          [e.id]: { ...(prev[e.id] ?? MANUAL_FORM_VIDE), tableId: ev.target.value },
                                        }))}
                                      >
                                        <option value="">Inscription générale (sans table)</option>
                                        {tables.filter(t => t.status === "approved").map(t => (
                                          <option key={t.id} value={t.id}>
                                            {t.mjNom} {t.systeme ? `· ${t.systeme}` : ""}
                                          </option>
                                        ))}
                                      </Select>
                                    </div>
                                  )}
                                  <FormActionsRow>
                                    <CancelSmallBtn onClick={() => fermerFormulaireManuel(e.id)}>Annuler</CancelSmallBtn>
                                    <SubmitTableBtn
                                      disabled={submittingManuel[e.id]}
                                      onClick={() => ajouterInscriptionManuelle(e.id)}
                                    >
                                      {submittingManuel[e.id] ? "Ajout…" : "Ajouter"}
                                    </SubmitTableBtn>
                                  </FormActionsRow>
                                </TableFormBox>
                              )}
                            </ReferentPanel>
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

      {/* ── Fiche détaillée (animation ou table) ── */}
      {detail && (() => {
        const ev = events.find(x => x.id === detail.eventId);
        if (!ev) return null;
        const tablesEv = tablesParEvent[ev.id] ?? [];
        const approuvees = tablesEv.filter(t => t.status === "approved");
        const refer = !!user && (ev.mjId === user.uid || userProfile?.role === "admin");
        const affichees = refer ? tablesEv : approuvees;
        const tbl = detail.tableId ? tablesEv.find(t => t.id === detail.tableId) ?? null : null;
        const monIns = mesInscriptions[ev.id];
        const dispoEv = ev.places - (ev.inscrits ?? 0);
        const dispoTbl = tbl ? tbl.placesMax - (tbl.inscrits ?? 0) : 0;
        const dispoAff = tbl ? dispoTbl : dispoEv;
        const complet = dispoAff <= 0;
        const blocageDetail = raisonBlocage(ev, tbl);
        const contactPublic = !!tbl && !!tbl.mjContactPublic && !!tbl.mjContact;
        const lieuTxt = venueAffichee.adresse && venueAffichee.adresse !== "Adresse à préciser" ? venueAffichee.adresse : "";
        const mapsSrc = lieuTxt ? `https://maps.google.com/maps?q=${encodeURIComponent(lieuTxt)}&output=embed` : "";
        const initiales = (nom: string) =>
          nom.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "MJ";
        const heroImg = tbl ? tbl.image : venueAffichee.image;
        const tableInscrite = monIns?.tableId ? tablesEv.find(t => t.id === monIns.tableId) ?? null : null;
        const inscritIci = !!monIns && (!tbl || monIns.tableId === tbl.id);
        const dureeLabel = (d?: string) => (d ? DUREE_LABELS[d] ?? d : "");

        return (
          <DetailOverlay ref={detailRef} onClick={() => setDetail(null)}>
            <DetailBox onClick={e => e.stopPropagation()}>
              {tbl && (
                <DetailBackBtn onClick={() => setDetail({ eventId: ev.id, tableId: null })}>
                  ← L&apos;animation
                </DetailBackBtn>
              )}
              <DetailClose onClick={() => setDetail(null)} aria-label="Fermer">✕</DetailClose>

              <DetailHero $bg={heroImg}>
                <DetailKind>{tbl ? "🧙 Table de jeu" : "🎲 Animation"}</DetailKind>
                <DetailTitle>
                  {tbl ? `${tbl.systeme}` : ev.titre}
                </DetailTitle>
                <DetailTagRow>
                  {tbl ? (
                    <>
                      <DetailTag>🧙 {tbl.mjNom}</DetailTag>
                      {tbl.ageTag && tbl.ageTag !== "tous" && <DetailTag>{tbl.ageTag}+</DetailTag>}
                      {tbl.duree && <DetailTag>⏱ {dureeLabel(tbl.duree)}</DetailTag>}
                    </>
                  ) : (
                    <>
                      <DetailTag>📅 {formatJourComplet(ev.date)}</DetailTag>
                      <DetailTag>🕒 {ev.heure}{ev.duree ? ` · ${ev.duree}` : ""}</DetailTag>
                    </>
                  )}
                </DetailTagRow>
              </DetailHero>

              <DetailBody>
                {/* Infos pratiques */}
                <div>
                  <DetailSectionLabel>Infos pratiques</DetailSectionLabel>
                  <InfoGrid>
                    <InfoItem>
                      <InfoLabel>Date</InfoLabel>
                      <InfoValue>{formatJourComplet(ev.date)}</InfoValue>
                    </InfoItem>
                    <InfoItem>
                      <InfoLabel>Horaire</InfoLabel>
                      <InfoValue>{ev.heure}{!tbl && ev.duree ? ` · ${ev.duree}` : ""}</InfoValue>
                    </InfoItem>
                    {tbl ? (
                      <>
                        <InfoItem>
                          <InfoLabel>Durée estimée</InfoLabel>
                          <InfoValue>{tbl.duree ? dureeLabel(tbl.duree) : "—"}</InfoValue>
                        </InfoItem>
                        <InfoItem>
                          <InfoLabel>Personnages</InfoLabel>
                          <InfoValue>
                            {tbl.personnages === "creation" ? "✏️ Création à la table" : "🧾 Prétirés fournis"}
                          </InfoValue>
                        </InfoItem>
                        <InfoItem>
                          <InfoLabel>Public</InfoLabel>
                          <InfoValue>
                            {tbl.ageTag === "18" ? "18+ (contenu explicite)"
                              : tbl.ageTag === "16" ? "16+ (thèmes matures)"
                              : "Tous publics"}
                          </InfoValue>
                        </InfoItem>
                        <InfoItem>
                          <InfoLabel>Places</InfoLabel>
                          <InfoValue>
                            {dispoTbl <= 0 ? "Complet" : `${dispoTbl} restante${dispoTbl > 1 ? "s" : ""}`} / {tbl.placesMax}
                          </InfoValue>
                        </InfoItem>
                      </>
                    ) : (
                      <>
                        <InfoItem>
                          <InfoLabel>Lieu</InfoLabel>
                          <InfoValue>{venueAffichee.venue}</InfoValue>
                        </InfoItem>
                        <InfoItem>
                          <InfoLabel>Places (toutes tables)</InfoLabel>
                          <InfoValue>
                            {dispoEv <= 0 ? "Complet" : `${dispoEv} restante${dispoEv > 1 ? "s" : ""}`} / {ev.places}
                          </InfoValue>
                        </InfoItem>
                      </>
                    )}
                  </InfoGrid>
                </div>

                {/* Description */}
                {tbl ? (
                  <div>
                    <DetailSectionLabel>Description de la table</DetailSectionLabel>
                    <DetailText>{tbl.description || "Aucune description."}</DetailText>
                  </div>
                ) : (ev.accroche || ev.description) && (
                  <div>
                    <DetailSectionLabel>Description</DetailSectionLabel>
                    {ev.accroche && <DetailText style={{ fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: ev.description ? "0.6rem" : 0 }}>{ev.accroche}</DetailText>}
                    {ev.description && <DetailText>{ev.description}</DetailText>}
                  </div>
                )}

                {/* MJ de la table */}
                {tbl && (
                  <div>
                    <DetailSectionLabel>Maître de jeu</DetailSectionLabel>
                    <MJCardBox>
                      <MJAvatarCircle>{initiales(tbl.mjNom)}</MJAvatarCircle>
                      <div>
                        <MJCardName>{tbl.mjNom}</MJCardName>
                        <MJCardSub>
                          {contactPublic ? `✉️ ${tbl.mjContact}` : "Anime cette table"}
                        </MJCardSub>
                      </div>
                    </MJCardBox>
                  </div>
                )}

                {/* Programme (animation) */}
                {!tbl && ev.programme && ev.programme.length > 0 && (
                  <div>
                    <DetailSectionLabel>Programme</DetailSectionLabel>
                    <StepList>
                      {ev.programme.map((p, i) => (
                        <StepItem key={i}>
                          <StepTime>{p.heure}</StepTime>
                          <span>{p.titre}</span>
                        </StepItem>
                      ))}
                    </StepList>
                  </div>
                )}

                {/* Tables (animation) */}
                {!tbl && (
                  <div>
                    <DetailSectionLabel>Tables proposées · cliquez sur une table pour vous inscrire</DetailSectionLabel>
                    {loadingTables[ev.id] ? (
                      <NoTablesMsg>Chargement des tables…</NoTablesMsg>
                    ) : affichees.length === 0 ? (
                      <NoTablesMsg>Aucune table proposée pour le moment.</NoTablesMsg>
                    ) : (
                      <TCGrid style={{ marginBottom: 0 }}>
                        {affichees.map(t => {
                          const pd = t.placesMax - (t.inscrits ?? 0);
                          return (
                            <TableSquare
                              key={t.id}
                              type="button"
                              onClick={() => inscrireDirect(ev, t)}
                              $image={squareThumb(t.image)}
                              aria-label={`S'inscrire à la table ${t.systeme} de ${t.mjNom}`}
                            >
                              {!t.image && <SquareFallback>🎲</SquareFallback>}
                              <SquareTop>
                                <PlacesBadge $level={getPlacesLevel(pd)}>
                                  {pd <= 0 ? "Complet" : `${pd} place${pd > 1 ? "s" : ""}`}
                                </PlacesBadge>
                                {t.ageTag && t.ageTag !== "tous" && (
                                  <AgeTag $level={t.ageTag} style={{ marginLeft: 0 }}>{t.ageTag}+</AgeTag>
                                )}
                              </SquareTop>
                              <SquareBottom>
                                <SquareSysteme>{t.systeme}</SquareSysteme>
                                <SquareMj>🧙 {t.mjNom}</SquareMj>
                              </SquareBottom>
                            </TableSquare>
                          );
                        })}
                      </TCGrid>
                    )}
                  </div>
                )}

                {/* Lieu */}
                {mapsSrc && (
                  <div>
                    <DetailSectionLabel>Lieu</DetailSectionLabel>
                    <MapWrap>
                      <iframe src={mapsSrc} title="Carte du lieu" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                      <MapCaption>📍 {venueAffichee.venue} — {lieuTxt}</MapCaption>
                    </MapWrap>
                  </div>
                )}
              </DetailBody>

              <DetailFooter>
                {monIns ? (
                  <>
                    <FooterNote>
                      {inscritIci
                        ? (tbl || monIns.tableId
                            ? "✅ Vous êtes inscrit à cette table."
                            : "✅ Vous êtes inscrit à cette animation.")
                        : "Vous êtes déjà inscrit à une autre table de cette animation."}
                    </FooterNote>
                    {inscritIci && (
                      <FooterDangerBtn onClick={() => setToCancel({ event: ev, table: tbl ?? tableInscrite })}>
                        Se désinscrire
                      </FooterDangerBtn>
                    )}
                  </>
                ) : tbl && tbl.status !== "approved" ? (
                  <FooterNote>
                    {tbl.status === "rejected"
                      ? "❌ Cette table n'a pas été retenue : les inscriptions sont fermées."
                      : "⏳ Cette table est en attente de validation : les inscriptions ouvriront une fois validée."}
                  </FooterNote>
                ) : blocageDetail ? (
                  <FooterNote>🎙️ {blocageDetail}</FooterNote>
                ) : (
                  <BigRegBtn $full={complet} onClick={() => openRegisterModal(ev, tbl)}>
                    {!user
                      ? "Se connecter pour s'inscrire"
                      : complet
                        ? "📋 Rejoindre la liste d'attente"
                        : tbl ? "S'inscrire à cette table" : "S'inscrire à l'animation"}
                  </BigRegBtn>
                )}
              </DetailFooter>
            </DetailBox>
          </DetailOverlay>
        );
      })()}

      {/* ── Modal inscription (confirmation) ── */}
      {selected && (
        <Overlay onClick={closeModal}>
          <Modal onClick={e => e.stopPropagation()}>
            {!success ? (
              <>
                <ModalTitle>
                  {tableModal ? "S'inscrire à cette table" : "S'inscrire à l'animation"}
                </ModalTitle>
                <ModalSub>
                  {formatJourComplet(selected.event.date)} · {selected.event.heure}
                  {selected.event.duree ? ` · ${selected.event.duree}` : ""}
                </ModalSub>

                <DetailRow><strong>{selected.event.titre}</strong></DetailRow>

                {tableModal && (
                  <>
                    <DetailRow>
                      🧙 {tableModal.mjNom}
                      {tableModal.systeme ? ` · ${tableModal.systeme}` : ""}
                      {tableModal.ageTag && tableModal.ageTag !== "tous" ? ` · ${tableModal.ageTag}+` : ""}
                    </DetailRow>
                    <DetailRow>{tableModal.description}</DetailRow>
                    <DetailRow>
                      {tableModal.duree ? `⏱ ${DUREE_LABELS[tableModal.duree] ?? tableModal.duree} · ` : ""}
                      {tableModal.personnages === "creation" ? "✏️ Création à la table" : "🧾 Prétirés fournis"}
                      {` · ${Math.max(0, modalPlaces)} place(s) restante(s)`}
                    </DetailRow>
                  </>
                )}

                {modalPlaces <= 0 && !blocage && (
                  <DetailRow>📋 Il n&apos;y a plus de place : vous serez placé en liste d&apos;attente.</DetailRow>
                )}
                {blocage && <MyTableStatus $status="pending">🎙️ {blocage}</MyTableStatus>}

                <ModalActions>
                  <CancelBtn onClick={closeModal}>Annuler</CancelBtn>
                  <ConfirmBtn onClick={() => handleConfirmInscription()} disabled={submitting || authLoading || !!blocage}>
                    {submitting
                      ? "Envoi…"
                      : blocage
                        ? "Inscription indisponible"
                        : modalPlaces <= 0
                          ? "📋 Rejoindre la liste d'attente"
                          : "Confirmer"}
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

      {/* ── Modal désinscription ── */}
      {toCancel && (
        <Overlay onClick={() => !submittingCancel && setToCancel(null)}>
          <Modal onClick={e => e.stopPropagation()}>
            <ModalTitle>Se désinscrire ?</ModalTitle>
            <ModalSub>
              {toCancel.table
                ? `${toCancel.table.mjNom}${toCancel.table.systeme ? ` · ${toCancel.table.systeme}` : ""}`
                : `${formatJourComplet(toCancel.event.date)} · ${toCancel.event.heure}`}
            </ModalSub>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginBottom: "1rem" }}>
              Votre place sera libérée. Vous pourrez vous réinscrire tant qu&apos;il reste de la place.
            </p>
            <ModalActions>
              <CancelBtn onClick={() => setToCancel(null)} disabled={submittingCancel}>
                Retour
              </CancelBtn>
              <ConfirmBtn
                onClick={handleDesinscription}
                disabled={submittingCancel}
                style={{ background: "rgba(255,80,80,0.2)", borderColor: "rgba(255,80,80,0.5)", color: "#ff8080" }}
              >
                {submittingCancel ? "…" : "Confirmer la désinscription"}
              </ConfirmBtn>
            </ModalActions>
          </Modal>
        </Overlay>
      )}

      {/* ── Modal annulation d'une animation ── */}
      {toCancelEvent && (
        <Overlay onClick={() => !submittingCancelEvent && setToCancelEvent(null)}>
          <Modal onClick={e => e.stopPropagation()}>
            <ModalTitle>Annuler cette animation ?</ModalTitle>
            <ModalSub>
              {formatJourComplet(toCancelEvent.date)} · {toCancelEvent.heure}
            </ModalSub>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginBottom: "1rem" }}>
              Tous les joueurs inscrits (confirmés et en liste d&apos;attente) recevront un email
              de prévenance. Cette action est irréversible depuis cette page.
            </p>
            <ModalActions>
              <CancelBtn onClick={() => setToCancelEvent(null)} disabled={submittingCancelEvent}>
                Retour
              </CancelBtn>
              <ConfirmBtn
                onClick={handleAnnulerEvenement}
                disabled={submittingCancelEvent}
                style={{ background: "rgba(255,80,80,0.2)", borderColor: "rgba(255,80,80,0.5)", color: "#ff8080" }}
              >
                {submittingCancelEvent ? "…" : "Confirmer l'annulation"}
              </ConfirmBtn>
            </ModalActions>
          </Modal>
        </Overlay>
      )}
    </Page>
  );
}