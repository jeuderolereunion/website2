"use client";

import styled, { keyframes } from "styled-components";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  addDoc,
  increment,
  getDocs,
  runTransaction,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import Navigation from "@/components/Navigation";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Types ───────────────────────────────────────────────────────────────────

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
  lieu?: string;
  adresse?: string;
  lieuDetail?: string;
  lieuType?: "presentiel" | "ligne";
  regles?: string[];
  photos?: string[];
  image?: string;
};

type UserProfile = {
  pseudo: string;
  email: string;
  role?: string;
};

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
  font-size: 0.85rem;
  color: rgba(160,120,255,0.9);
  text-decoration: none;
  margin-top: 0.5rem;
  &:hover { color: #c8a8ff; }
`;

const Hero = styled.section<{ $bg?: string }>`
  position: relative;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 5rem 1.5rem 2rem;
  background:
    linear-gradient(180deg, rgba(13,13,20,0.15) 0%, rgba(13,13,20,0.92) 100%),
    ${p => p.$bg ? `url(${p.$bg}) center/cover` : "linear-gradient(135deg, #3C3489, #534AB7)"};
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: rgba(255,255,255,0.5);
  text-decoration: none;
  margin-bottom: 1.25rem;
  &:hover { color: rgba(255,255,255,0.85); }
`;

const CatPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(120,80,255,0.25);
  border: 1px solid rgba(160,120,255,0.35);
  color: #c8a8ff;
  margin-bottom: 0.75rem;
  width: fit-content;
`;

const HeroTitle = styled.h1`
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 800;
  margin: 0 0 0.75rem;
  letter-spacing: -0.02em;
  animation: ${fadeUp} 0.4s ease both;
`;

const HeroMeta = styled.div`display: flex; gap: 1.25rem; flex-wrap: wrap;`;

const MetaItem = styled.span`
  font-size: 0.82rem;
  color: rgba(255,255,255,0.6);
  display: flex;
  align-items: center;
  gap: 0.6rem;
`;

const Body = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1.5rem 0;
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 2rem;
  @media (max-width: 680px) { grid-template-columns: 1fr; }
`;

const Main = styled.div`display: flex; flex-direction: column; gap: 2rem;`;
const Aside = styled.aside`display: flex; flex-direction: column; gap: 1rem;`;

const Section = styled.section``;

const SectionLabel = styled.p`
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(160,120,255,0.8);
  margin: 0 0 0.75rem;
`;

const TagRow = styled.div`display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.75rem;`;

const Tag = styled.span`
  font-size: 0.75rem;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  border: 0.5px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.55);
`;

const Desc = styled.p`
  font-size: 0.88rem;
  color: rgba(255,255,255,0.65);
  line-height: 1.7;
  white-space: pre-line;
`;

const RulesList = styled.ul`list-style: none; display: flex; flex-direction: column; gap: 0.6rem;`;

const RuleItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  font-size: 0.85rem;
  color: rgba(255,255,255,0.65);
  line-height: 1.5;
  &::before {
    content: '✦';
    color: rgba(160,120,255,0.7);
    font-size: 0.7rem;
    margin-top: 0.2rem;
    flex-shrink: 0;
  }
`;

// ── Galerie ───────────────────────────────────────────────────────────────────

const Gallery = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
`;

const GalItem = styled.div<{ $main?: boolean; $src?: string }>`
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 1;
  background: ${p => p.$src ? `url(${p.$src}) center/cover` : "rgba(255,255,255,0.05)"};
  border: 0.5px solid rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.2);
  font-size: 0.75rem;
  cursor: ${p => p.$src ? "pointer" : "default"};
  position: relative;
  ${p => p.$main && `
    grid-column: span 2;
    grid-row: span 2;
    aspect-ratio: auto;
    min-height: 160px;
  `}
  transition: opacity 150ms;
  &:hover { opacity: ${p => p.$src ? "0.85" : "1"}; }
  &:hover .photo-delete-btn { opacity: 1; }
`;

const PhotoDeleteBtn = styled.button`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(0,0,0,0.65);
  border: 1px solid rgba(255,80,80,0.4);
  color: #ff8080;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 150ms, background 150ms;
  &:hover { background: rgba(255,60,60,0.3); opacity: 1; }
`;

const EmptyGallery = styled.div`
  grid-column: span 3;
  height: 80px;
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  border: 0.6px dashed rgba(255,255,255,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.7);
  font-size: 0.8rem;
  text-align: center;
  padding: 0 1rem;
`;

const UploadZone = styled.label`
  grid-column: span 3;
  height: 64px;
  border-radius: 10px;
  background: rgba(120,80,255,0.07);
  border: 1px dashed rgba(160,120,255,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: rgba(160,120,255,0.8);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms, border-color 150ms;
  &:hover { background: rgba(120,80,255,0.14); border-color: rgba(160,120,255,0.6); }
`;

const UploadInput = styled.input`display: none;`;

const ProgressBar = styled.div<{ $pct: number }>`
  grid-column: span 3;
  height: 4px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  overflow: hidden;
  position: relative;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    width: ${p => p.$pct ?? 0}%;
    background: linear-gradient(90deg, #7c4dff, #c8a8ff);
    transition: width 150ms;
  }
`;

// ── Lieu ──────────────────────────────────────────────────────────────────────

const MapBlock = styled.div`border-radius: 12px; overflow: hidden; border: 0.5px solid rgba(255,255,255,0.1);`;
const MapIframe = styled.iframe`width: 100%; height: 200px; border: none; display: block;`;
const MapFooter = styled.div`
  background: rgba(255,255,255,0.04);
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;
const MapAddr = styled.p`font-size: 0.82rem; color: rgba(255,255,255,0.6);`;
const MapLink = styled.a`
  font-size: 0.78rem;
  color: rgba(160,120,255,0.9);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  white-space: nowrap;
  &:hover { color: #c8a8ff; }
`;

const OnlineBlock = styled.div`
  border-radius: 12px;
  border: 0.5px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

// ── Aside cards ───────────────────────────────────────────────────────────────

const AsideCard = styled.div`
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  padding: 1.25rem;
`;

const PlacesRow = styled.div`display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;`;
const PlacesLabel = styled.span`font-size: 0.82rem; color: rgba(255,255,255,0.5);`;
const PlacesBadge = styled.span<{ $full?: boolean }>`
  font-size: 0.78rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  background: ${p => p.$full ? "rgba(255,80,80,0.12)" : "rgba(120,80,255,0.2)"};
  border: 1px solid ${p => p.$full ? "rgba(255,80,80,0.3)" : "rgba(160,120,255,0.35)"};
  color: ${p => p.$full ? "#ff8080" : "#c8a8ff"};
`;

const InscritsRow = styled.div`
  display: flex;
  align-items: center;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.4);
  margin-bottom: 1rem;
`;

const RegBtn = styled.button<{ $full?: boolean }>`
  width: 100%;
  padding: 0.65rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 0.5rem;
  border: 1px solid ${p => p.$full ? "rgba(255,255,255,0.15)" : "rgba(160,120,255,0.5)"};
  background: ${p => p.$full ? "rgba(255,255,255,0.04)" : "rgba(120,80,255,0.25)"};
  color: ${p => p.$full ? "rgba(255,255,255,0.4)" : "#c8a8ff"};
  transition: all 150ms;
  &:hover:not(:disabled) { background: ${p => p.$full ? "" : "rgba(120,80,255,0.4)"}; }
`;

const EditBtn = styled.button`
  width: 100%;
  padding: 0.55rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: rgba(255,255,255,0.55);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  transition: background 150ms, color 150ms;
  &:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.9); }
`;

const ShareBtn = styled.button`
  width: 100%;
  padding: 0.55rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.12);
  background: transparent;
  color: rgba(255,255,255,0.4);
  font-size: 0.8rem;
  cursor: pointer;
  &:hover { background: rgba(255,255,255,0.05); }
`;

const Divider = styled.hr`border: none; border-top: 0.5px solid rgba(255,255,255,0.08); margin: 0.9rem 0;`;

const MJRow = styled.div`display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;`;
const MJAvatar = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(120,80,255,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  color: #c8a8ff;
  flex-shrink: 0;
`;
const MJName = styled.p`font-size: 0.9rem; font-weight: 600; margin: 0;`;
const MJSub = styled.p`font-size: 0.75rem; color: rgba(255,255,255,0.4); margin: 0;`;

const MJStats = styled.div`display: flex; gap: 0.5rem;`;
const MJStat = styled.div`
  flex: 1;
  text-align: center;
  background: rgba(255,255,255,0.04);
  border-radius: 8px;
  padding: 0.5rem 0.25rem;
`;
const MJStatVal = styled.div`font-size: 1rem; font-weight: 700; color: #c8a8ff;`;
const MJStatLbl = styled.div`font-size: 0.65rem; color: rgba(255,255,255,0.35); margin-top: 2px;`;

const ProfileLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  color: rgba(160,120,255,0.8);
  text-decoration: none;
  &:hover { color: #c8a8ff; }
`;

// ── Modal inscription ─────────────────────────────────────────────────────────

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
  padding: 2rem;
  width: 100%;
  max-width: 440px;
  animation: ${fadeUp} 0.25s ease both;
`;

const ModalTitle = styled.h2`font-size: 1.2rem; font-weight: 700; margin: 0 0 0.4rem;`;
const ModalSub = styled.p`font-size: 0.85rem; color: rgba(255,255,255,0.5); margin: 0 0 1.5rem;`;

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

const UserDetails = styled.div`flex: 1; min-width: 0;`;
const UserName = styled.p`
  font-size: 0.88rem; font-weight: 600; margin: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;
const UserEmail = styled.p`
  font-size: 0.78rem; color: rgba(255,255,255,0.45); margin: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
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

const ShareToast = styled.div<{ $visible: boolean; $error?: boolean }>`
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.6rem 1.25rem;
  border-radius: 999px;
  background: ${p => p.$error ? "rgba(255,80,80,0.2)" : "rgba(80,200,120,0.2)"};
  border: 1px solid ${p => p.$error ? "rgba(255,80,80,0.3)" : "rgba(80,200,120,0.3)"};
  color: ${p => p.$error ? "#ff8080" : "#7dffb3"};
  font-size: 0.85rem;
  font-weight: 600;
  z-index: 400;
  opacity: ${p => p.$visible ? 1 : 0};
  transition: opacity 200ms;
  pointer-events: none;
`;

// ── Lightbox ──────────────────────────────────────────────────────────────────

const LightboxOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const LightboxImg = styled.img`
  max-width: 90vw;
  max-height: 85vh;
  border-radius: 10px;
  object-fit: contain;
`;

const LightboxClose = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255,255,255,0.1);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  color: #fff;
  font-size: 1.1rem;
  cursor: pointer;
`;

// ── Modal édition ─────────────────────────────────────────────────────────────

const EditModalBox = styled(ModalBox)`
  max-width: 580px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.75rem;
`;

const EditGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
  @media (max-width: 500px) { grid-template-columns: 1fr; }
`;

const FieldFull = styled.div`grid-column: span 2; @media (max-width: 500px) { grid-column: span 1; }`;

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
  min-height: 90px;
  box-sizing: border-box;
  font-family: inherit;
  line-height: 1.6;
  &:focus { border-color: rgba(160,120,255,0.5); background: rgba(255,255,255,0.09); }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  background: rgba(30,28,50,0.95);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
  font-size: 0.88rem;
  outline: none;
  box-sizing: border-box;
  cursor: pointer;
  &:focus { border-color: rgba(160,120,255,0.5); }
`;

const EditSectionLabel = styled.p`
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(160,120,255,0.6);
  margin: 1.1rem 0 0.6rem;
  grid-column: span 2;
  @media (max-width: 500px) { grid-column: span 1; }
`;

// ── Autocomplétion adresse ────────────────────────────────────────────────────

const AdresseWrapper = styled.div`position: relative; width: 100%;`;

const AdresseDropdown = styled.ul`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #1e1c32;
  border: 1px solid rgba(160,120,255,0.3);
  border-radius: 8px;
  list-style: none;
  margin: 0;
  padding: 0.3rem 0;
  z-index: 50;
  max-height: 220px;
  overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
`;

const AdresseItem = styled.li`
  padding: 0.55rem 0.85rem;
  font-size: 0.83rem;
  color: rgba(255,255,255,0.75);
  cursor: pointer;
  line-height: 1.4;
  &:hover { background: rgba(120,80,255,0.18); color: #fff; }
`;

const AdresseSub = styled.span`
  display: block;
  font-size: 0.74rem;
  color: rgba(255,255,255,0.35);
  margin-top: 1px;
`;

// ─────────────────────────────────────────────────────────────────────────────

const RuleInputRow = styled.div`
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
`;

const RemoveRuleBtn = styled.button`
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: 1px solid rgba(255,80,80,0.25);
  background: transparent;
  color: rgba(255,120,120,0.7);
  font-size: 0.9rem;
  cursor: pointer;
  &:hover { background: rgba(255,60,60,0.1); }
`;

const AddRuleBtn = styled.button`
  font-size: 0.78rem;
  color: rgba(160,120,255,0.8);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0;
  &:hover { color: #c8a8ff; }
`;

const SaveBtn = styled.button`
  flex: 2;
  padding: 0.65rem;
  border-radius: 8px;
  border: 1px solid rgba(160,120,255,0.5);
  background: rgba(120,80,255,0.25);
  color: #c8a8ff;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  &:hover { background: rgba(120,80,255,0.4); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CAT_LABELS: Record<string, string> = {
  "soirees-jdr":  "🎲 Soirées JDR",
  "tournois":     "🏆 Tournois",
  "soirees-jeux": "🃏 Soirées Jeux",
  "initiations":  "📖 Initiations",
};

function getInitiales(nom: string): string {
  return nom.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function EventDetailClient({ slug, id }: { slug: string; id: string }) {
  const [event, setEvent]       = useState<EventDoc | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [mjNom, setMjNom]       = useState<string | null>(null);

  // Auth
  const [user, setUser]               = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const isAdmin = userProfile?.role === "admin";

  // Modal inscription
  const [selectedEvent, setSelectedEvent] = useState<EventDoc | null>(null);
  const [submitting, setSubmitting]       = useState(false);
  const [success, setSuccess]             = useState(false);
  const [waitlisted, setWaitlisted]       = useState(false);

  // Partage
  const [shareFeedback, setShareFeedback] = useState<"idle" | "copied" | "error">("idle");

  // Photo upload
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const [uploadPct, setUploadPct]     = useState<number | null>(null);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);

  // Modal édition
  const [editOpen, setEditOpen]   = useState(false);
  const [editForm, setEditForm]   = useState<Partial<EventDoc>>({});
  const [editRules, setEditRules] = useState<string[]>([]);
  const [saving, setSaving]       = useState(false);

  // Autocomplétion adresse
  const [adresseSuggestions, setAdresseSuggestions] = useState<{ label: string; context: string; value: string }[]>([]);
  const adresseAbortRef = useRef<AbortController | null>(null);

  // ── Chargement événement ──────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    getDoc(doc(db, "evenements", id)).then(snap => {
      if (cancelled) return;
      if (!snap.exists()) { setNotFound(true); setLoading(false); return; }
      const data = { id: snap.id, ...snap.data() } as EventDoc;
      setEvent(data);
      setMjNom(data.mjNom ?? null);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) { setNotFound(true); setLoading(false); }
    });

    return () => { cancelled = true; };
  }, [id]);

  // Résout le nom du MJ si non dénormalisé
  useEffect(() => {
    if (!event || event.mjNom || !event.mjId) return;
    let cancelled = false;
    getDoc(doc(db, "users", event.mjId)).then(snap => {
      if (cancelled || !snap.exists()) return;
      const d = snap.data();
      const nom = `${d.prenom || ""} ${d.nom || ""}`.trim() || d.pseudo || null;
      if (nom) setMjNom(nom);
    });
    return () => { cancelled = true; };
  }, [event]);

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userSnap.exists()) {
          const d = userSnap.data();
          setUserProfile({ pseudo: d.pseudo || "", email: firebaseUser.email || "", role: d.role });
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

  // ── Inscription ───────────────────────────────────────────────────────────

  function handleRegisterClick() {
    if (authLoading) return;
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (event?.mjId && event.mjId === user.uid) return;
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
        const d = eventSnap.data();
        const placesRestantes = d.places - (d.inscrits || 0);
        if (placesRestantes > 0) {
          result.statut = "confirme";
          transaction.update(eventRef, { inscrits: increment(1) });
        } else {
          result.statut = "attente";
        }
      });

      await addDoc(collection(db, "inscriptions"), {
        eventId:    selectedEvent.id,
        eventTitle: selectedEvent.titre,
        categorie:  slug,
        nom:        userProfile.pseudo || userProfile.email,
        email:      userProfile.email,
        pseudo:     userProfile.pseudo,
        userId:     user.uid,
        statut:     result.statut,
        createdAt:  serverTimestamp(),
      });

      if (result.statut === "confirme") {
        await fetch("/api/inscription", {
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
      }

      setWaitlisted(result.statut === "attente");
      setSuccess(true);
    } catch (error: any) {
      alert(error.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setSubmitting(false);
    }
  }

  function closeModal() { setSelectedEvent(null); setSuccess(false); setWaitlisted(false); }

  // ── Partage ───────────────────────────────────────────────────────────────

  async function handleShare() {
    try {
      if (navigator.share) await navigator.share({ title: event!.titre, url: window.location.href });
      else await navigator.clipboard.writeText(window.location.href);
      setShareFeedback("copied");
    } catch { setShareFeedback("error"); }
    setTimeout(() => setShareFeedback("idle"), 2000);
  }

  // ── Upload photo ──────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !event) return;

    const storage = getStorage();
    const photoRef = storageRef(storage, `events/${event.id}/photos/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(photoRef, file);

    setUploadPct(0);
    task.on(
      "state_changed",
      snap => setUploadPct(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      err  => { console.error("Upload error:", err); setUploadPct(null); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        await updateDoc(doc(db, "evenements", event.id), { photos: arrayUnion(url) });
        setEvent(prev => prev ? { ...prev, photos: [...(prev.photos ?? []), url] } : prev);
        setUploadPct(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    );
  }

  async function handleDeletePhoto(url: string) {
    if (!event || !window.confirm("Supprimer cette photo ?")) return;
    setDeletingUrl(url);
    try {
      const storage = getStorage();
      try { await deleteObject(storageRef(storage, url)); } catch {}
      await updateDoc(doc(db, "evenements", event.id), { photos: arrayRemove(url) });
      setEvent(prev => prev ? { ...prev, photos: prev.photos?.filter(p => p !== url) } : prev);
    } finally {
      setDeletingUrl(null);
    }
  }

  // ── Autocomplétion adresse ────────────────────────────────────────────────

  function handleAdresseChange(value: string) {
    setEditForm(f => ({ ...f, adresse: value }));
    if (adresseAbortRef.current) adresseAbortRef.current.abort();
    if (value.trim().length < 3) { setAdresseSuggestions([]); return; }

    const controller = new AbortController();
    adresseAbortRef.current = controller;

    fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=5`,
      { signal: controller.signal }
    )
      .then(r => r.json())
      .then(data => {
        setAdresseSuggestions(
          (data.features ?? []).map((f: any) => ({
            label:   f.properties.name,
            context: f.properties.context ?? f.properties.city ?? "",
            value:   f.properties.label,
          }))
        );
      })
      .catch(() => {}); // ignore abort
  }

  function selectAdresse(val: string) {
    setEditForm(f => ({ ...f, adresse: val }));
    setAdresseSuggestions([]);
  }

  // ── Ouverture / soumission édition ────────────────────────────────────────

  function openEdit() {
    if (!event) return;
    setEditForm({
      titre:       event.titre,
      date:        event.date,
      heure:       event.heure,
      duree:       event.duree ?? "",
      places:      event.places,
      niveau:      event.niveau,
      description: event.description,
      systeme:     event.systeme ?? "",
      tags:        event.tags ?? [],
      lieuType:    event.lieuType ?? "presentiel",
      adresse:     event.adresse ?? "",
      lieuDetail:  event.lieuDetail ?? "",
    });
    setEditRules(event.regles ?? []);
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!event) return;
    setSaving(true);
    try {
      const tagsArr = typeof editForm.tags === "string"
        ? (editForm.tags as string).split(",").map(t => t.trim()).filter(Boolean)
        : editForm.tags ?? [];

      const payload: Record<string, any> = {
        titre:       editForm.titre,
        date:        editForm.date,
        heure:       editForm.heure,
        duree:       editForm.duree || "",
        places:      Number(editForm.places),
        niveau:      editForm.niveau,
        description: editForm.description,
        systeme:     editForm.systeme || "",
        tags:        tagsArr,
        lieuType:    editForm.lieuType,
        adresse:     editForm.adresse || "",
        lieuDetail:  editForm.lieuDetail || "",
        regles:      editRules.filter(r => r.trim() !== ""),
      };

      await updateDoc(doc(db, "evenements", event.id), payload);
      setEvent(prev => prev ? { ...prev, ...payload } : prev);
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
        <CenterState><StateTitle>Chargement de l'événement…</StateTitle></CenterState>
      </Page>
    );
  }

  if (notFound || !event) {
    return (
      <Page>
        <Navigation />
        <CenterState>
          <StateTitle>Événement introuvable</StateTitle>
          <StateSub>Cet événement n'existe pas ou a été supprimé.</StateSub>
          <BackLinkPlain href={`/evenements/${slug}`}>
            ← {CAT_LABELS[slug] ?? "Retour aux événements"}
          </BackLinkPlain>
        </CenterState>
      </Page>
    );
  }

  // ── Données dérivées ──────────────────────────────────────────────────────

  const placesDispo = event.places - (event.inscrits ?? 0);
  const complet     = placesDispo <= 0;
  const isOnline    = event.lieuType === "ligne";
  const lieuAffiche = event.adresse || event.lieuDetail || event.lieu;
  const mapsQuery   = encodeURIComponent(lieuAffiche || "Réunion");
  const mapsEmbed   = `https://maps.google.com/maps?q=${mapsQuery}&output=embed`;
  const mapsLink    = `https://maps.google.com/?q=${mapsQuery}`;
  const initiales   = mjNom ? getInitiales(mjNom) : "MJ";

  const estOrganisateur = !!user && !!event.mjId && event.mjId === user.uid;
  const canEdit         = estOrganisateur || isAdmin;
  const canDeletePhoto  = isAdmin;
  const canUploadPhoto  = estOrganisateur || isAdmin;

  return (
    <Page>
      <Navigation />

      <Hero $bg={event.image}>
        <BackLink href={`/evenements/${slug}`}>
          ← {CAT_LABELS[slug] ?? "Événements"}
        </BackLink>
        <CatPill>{CAT_LABELS[slug] ?? "Événement"}</CatPill>
        <HeroTitle>{event.titre}</HeroTitle>
        <HeroMeta>
          <MetaItem>📅 {event.date}</MetaItem>
          <MetaItem>🕐 {event.heure}{event.duree ? ` – ${event.duree}` : ""}</MetaItem>
          {lieuAffiche && (
            <MetaItem>{isOnline ? "💻" : "📍"} {isOnline ? "En ligne" : lieuAffiche}</MetaItem>
          )}
          <MetaItem>⭐ {event.niveau}</MetaItem>
        </HeroMeta>
      </Hero>

      <Body>
        <Main>
          {/* Description */}
          <Section>
            <SectionLabel>Description</SectionLabel>
            {(event.tags?.length || event.systeme) && (
              <TagRow>
                {event.systeme && <Tag>{event.systeme}</Tag>}
                {event.duree   && <Tag>{event.duree}</Tag>}
                {event.tags?.map(t => <Tag key={t}>{t}</Tag>)}
              </TagRow>
            )}
            <Desc>{event.description}</Desc>
          </Section>

          {/* Règles */}
          {event.regles && event.regles.length > 0 && (
            <Section>
              <SectionLabel>Règles de la soirée</SectionLabel>
              <RulesList>
                {event.regles.map((r, i) => <RuleItem key={i}>{r}</RuleItem>)}
              </RulesList>
            </Section>
          )}

          {/* Galerie */}
          <Section>
            <SectionLabel>Galerie</SectionLabel>
            <Gallery>
              {event.photos && event.photos.length > 0 ? (
                event.photos.map((url, i) => (
                  <GalItem key={url} $src={url} $main={i === 0} onClick={() => !canDeletePhoto && setLightbox(url)}>
                    {/* Agrandissement si pas admin en train de supprimer */}
                    {canDeletePhoto && (
                      <PhotoDeleteBtn
                        className="photo-delete-btn"
                        onClick={e => { e.stopPropagation(); handleDeletePhoto(url); }}
                        disabled={deletingUrl === url}
                        title="Supprimer cette photo"
                      >
                        {deletingUrl === url ? "…" : "✕"}
                      </PhotoDeleteBtn>
                    )}
                    {!canDeletePhoto && (
                      // zone cliquable pour lightbox si pas admin
                      <span style={{ position: "absolute", inset: 0 }} onClick={() => setLightbox(url)} />
                    )}
                  </GalItem>
                ))
              ) : (
                <EmptyGallery>📷 Les photos seront ajoutées après la soirée</EmptyGallery>
              )}

              {/* Upload — MJ ou admin */}
              {canUploadPhoto && (
                <>
                  <UploadZone htmlFor="photo-upload">
                    📷 Ajouter une photo
                    <UploadInput
                      id="photo-upload"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </UploadZone>
                  {uploadPct !== null && <ProgressBar $pct={uploadPct} />}
                </>
              )}
            </Gallery>
          </Section>

          {/* Lieu */}
          {isOnline ? (
            event.lieuDetail && (
              <Section>
                <SectionLabel>Plateforme</SectionLabel>
                <OnlineBlock>
                  💻 <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.65)" }}>{event.lieuDetail}</span>
                </OnlineBlock>
              </Section>
            )
          ) : (
            lieuAffiche && (
              <Section>
                <SectionLabel>Lieu</SectionLabel>
                <MapBlock>
                  <MapIframe src={mapsEmbed} title="Carte du lieu" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                  <MapFooter>
                    <MapAddr>{lieuAffiche}</MapAddr>
                    <MapLink href={mapsLink} target="_blank" rel="noopener noreferrer">Ouvrir ↗</MapLink>
                  </MapFooter>
                </MapBlock>
              </Section>
            )
          )}
        </Main>

        <Aside>
          {/* Inscription */}
          <AsideCard>
            <PlacesRow>
              <PlacesLabel>Places restantes</PlacesLabel>
              <PlacesBadge $full={complet}>
                {complet ? "Complet" : `${placesDispo} / ${event.places}`}
              </PlacesBadge>
            </PlacesRow>

            <InscritsRow>{event.inscrits ?? 0} inscrits</InscritsRow>

            {/* Bouton modifier — MJ ou admin */}
            {canEdit && (
              <EditBtn onClick={openEdit}>
                ✏️ Modifier l'événement
                {isAdmin && !estOrganisateur && (
                  <span style={{ fontSize: "0.68rem", color: "rgba(255,180,60,0.8)", marginLeft: "0.3rem" }}>
                    (admin)
                  </span>
                )}
              </EditBtn>
            )}

            <RegBtn $full={complet} disabled={estOrganisateur} onClick={handleRegisterClick}>
              {estOrganisateur
                ? "🎭 Vous organisez"
                : complet
                  ? "📋 Rejoindre la liste d'attente"
                  : "S'inscrire à cette partie"}
            </RegBtn>
            <ShareBtn onClick={handleShare}>↗ Partager</ShareBtn>
          </AsideCard>

          {/* Fiche MJ */}
          <AsideCard>
            <SectionLabel>Maître de jeu</SectionLabel>
            <MJRow>
              <MJAvatar>{initiales}</MJAvatar>
              <div>
                <MJName>{mjNom ?? "Chargement…"}</MJName>
                <MJSub>Organisateur</MJSub>
              </div>
            </MJRow>
            <Divider />
            <MJStats>
              <MJStat><MJStatVal>–</MJStatVal><MJStatLbl>Parties</MJStatLbl></MJStat>
              <MJStat><MJStatVal>–</MJStatVal><MJStatLbl>Note</MJStatLbl></MJStat>
              <MJStat><MJStatVal>–</MJStatVal><MJStatLbl>Joueurs</MJStatLbl></MJStat>
            </MJStats>
            {event.mjId && (
              <>
                <Divider />
                <ProfileLink href={`/profil/${event.mjId}`}>→ Voir le profil complet</ProfileLink>
              </>
            )}
          </AsideCard>
        </Aside>
      </Body>

      {/* Lightbox */}
      {lightbox && (
        <LightboxOverlay onClick={() => setLightbox(null)}>
          <LightboxImg src={lightbox} alt="Photo agrandie" onClick={e => e.stopPropagation()} />
          <LightboxClose onClick={() => setLightbox(null)}>✕</LightboxClose>
        </LightboxOverlay>
      )}

      {/* ── Modal inscription ── */}
      {selectedEvent && (
        <ModalOverlay onClick={closeModal}>
          <ModalBox onClick={e => e.stopPropagation()}>
            {!success ? (
              <>
                <ModalTitle>
                  {(selectedEvent.places - (selectedEvent.inscrits ?? 0)) <= 0
                    ? "Rejoindre la liste d'attente"
                    : "S'inscrire"}
                </ModalTitle>
                <ModalSub>
                  {selectedEvent.titre} · {selectedEvent.date} à {selectedEvent.heure}
                </ModalSub>

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
                  <strong>{waitlisted ? "Vous êtes en liste d'attente !" : "Inscription confirmée !"}</strong>
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
          </ModalBox>
        </ModalOverlay>
      )}

      {/* ── Modal édition ── */}
      {editOpen && (
        <ModalOverlay onClick={() => setEditOpen(false)}>
          <EditModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>✏️ Modifier l'événement</ModalTitle>
            <ModalSub style={{ marginBottom: "1.25rem" }}>
              {isAdmin && !estOrganisateur
                ? "Modification en tant qu'administrateur"
                : "Les modifications sont enregistrées immédiatement"}
            </ModalSub>

            <EditGrid>
              {/* Titre */}
              <FieldFull>
                <Label>Titre</Label>
                <Input
                  value={editForm.titre ?? ""}
                  onChange={e => setEditForm(f => ({ ...f, titre: e.target.value }))}
                  placeholder="Titre de l'événement"
                />
              </FieldFull>

              {/* Date & heure */}
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editForm.date ?? ""}
                  onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Heure</Label>
                <Input
                  type="time"
                  value={editForm.heure ?? ""}
                  onChange={e => setEditForm(f => ({ ...f, heure: e.target.value }))}
                />
              </div>

              {/* Durée & Places */}
              <div>
                <Label>Durée (ex : 3h)</Label>
                <Input
                  value={editForm.duree ?? ""}
                  onChange={e => setEditForm(f => ({ ...f, duree: e.target.value }))}
                  placeholder="2h30"
                />
              </div>
              <div>
                <Label>Nombre de places</Label>
                <Input
                  type="number"
                  min={1}
                  value={editForm.places ?? ""}
                  onChange={e => setEditForm(f => ({ ...f, places: Number(e.target.value) }))}
                />
              </div>

              {/* Niveau */}
              <div>
                <Label>Niveau</Label>
                <Select
                  value={editForm.niveau ?? ""}
                  onChange={e => setEditForm(f => ({ ...f, niveau: e.target.value }))}
                >
                  <option value="">Choisir…</option>
                  {["Débutant", "Intermédiaire", "Avancé", "Tous niveaux"].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </Select>
              </div>

              {/* Système */}
              <div>
                <Label>Système / Jeu</Label>
                <Input
                  value={editForm.systeme ?? ""}
                  onChange={e => setEditForm(f => ({ ...f, systeme: e.target.value }))}
                  placeholder="D&D 5e, Pathfinder…"
                />
              </div>

              {/* Tags */}
              <FieldFull>
                <Label>Tags (séparés par des virgules)</Label>
                <Input
                  value={Array.isArray(editForm.tags) ? editForm.tags.join(", ") : (editForm.tags ?? "")}
                  onChange={e => setEditForm(f => ({ ...f, tags: e.target.value.split(",").map(t => t.trim()) }))}
                  placeholder="fantasy, one-shot, débutants bienvenus"
                />
              </FieldFull>

              {/* Description */}
              <FieldFull>
                <Label>Description</Label>
                <Textarea
                  value={editForm.description ?? ""}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                />
              </FieldFull>

              {/* Lieu */}
              <EditSectionLabel>Lieu</EditSectionLabel>
              <FieldFull>
                <Label>Type de lieu</Label>
                <Select
                  value={editForm.lieuType ?? "presentiel"}
                  onChange={e => setEditForm(f => ({ ...f, lieuType: e.target.value as "presentiel" | "ligne" }))}
                >
                  <option value="presentiel">Présentiel</option>
                  <option value="ligne">En ligne</option>
                </Select>
              </FieldFull>

              {editForm.lieuType !== "ligne" ? (
                <FieldFull>
                  <Label>Adresse</Label>
                  <AdresseWrapper>
                    <Input
                      value={editForm.adresse ?? ""}
                      onChange={e => handleAdresseChange(e.target.value)}
                      onBlur={() => setTimeout(() => setAdresseSuggestions([]), 180)}
                      placeholder="12 rue des Aventuriers, Saint-Denis"
                      autoComplete="off"
                    />
                    {adresseSuggestions.length > 0 && (
                      <AdresseDropdown>
                        {adresseSuggestions.map((s, i) => (
                          <AdresseItem key={i} onMouseDown={() => selectAdresse(s.value)}>
                            {s.label}
                            {s.context && <AdresseSub>{s.context}</AdresseSub>}
                          </AdresseItem>
                        ))}
                      </AdresseDropdown>
                    )}
                  </AdresseWrapper>
                </FieldFull>
              ) : (
                <FieldFull>
                  <Label>Plateforme / lien</Label>
                  <Input
                    value={editForm.lieuDetail ?? ""}
                    onChange={e => setEditForm(f => ({ ...f, lieuDetail: e.target.value }))}
                    placeholder="Discord, Roll20, lien de connexion…"
                  />
                </FieldFull>
              )}

              {/* Règles */}
              <EditSectionLabel>Règles de la soirée</EditSectionLabel>
              <FieldFull>
                {editRules.map((rule, i) => (
                  <RuleInputRow key={i}>
                    <Input
                      value={rule}
                      onChange={e => {
                        const next = [...editRules];
                        next[i] = e.target.value;
                        setEditRules(next);
                      }}
                      placeholder={`Règle ${i + 1}`}
                    />
                    <RemoveRuleBtn onClick={() => setEditRules(editRules.filter((_, j) => j !== i))}>
                      ✕
                    </RemoveRuleBtn>
                  </RuleInputRow>
                ))}
                <AddRuleBtn onClick={() => setEditRules([...editRules, ""])}>
                  + Ajouter une règle
                </AddRuleBtn>
              </FieldFull>
            </EditGrid>

            <ModalActions style={{ marginTop: "1.5rem" }}>
              <CancelBtn onClick={() => setEditOpen(false)}>Annuler</CancelBtn>
              <SaveBtn onClick={handleSaveEdit} disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer les modifications"}
              </SaveBtn>
            </ModalActions>
          </EditModalBox>
        </ModalOverlay>
      )}

      {/* ── Toast partage ── */}
      <ShareToast $visible={shareFeedback !== "idle"} $error={shareFeedback === "error"}>
        {shareFeedback === "copied" ? "🔗 Lien copié !" : "❌ Échec du partage"}
      </ShareToast>
    </Page>
  );
}