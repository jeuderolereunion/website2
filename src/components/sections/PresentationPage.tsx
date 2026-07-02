"use client";

import { useEffect, useRef, useState } from "react";
import styled, { keyframes, createGlobalStyle } from "styled-components";
import Link from "next/link";
import Navigation from "@/components/Navigation";

// ─── Google Fonts ─────────────────────────────────────────────────────────────

const FontImport = createGlobalStyle`
  html {
    scroll-behavior: smooth;
    scroll-snap-type: y proximity;
  }
`;

// Chaque grande section "s'accroche" au scroll et laisse de la place
// sous la nav (sticky) pour ne pas être coupée en haut.
const snapSection = `
  scroll-snap-align: start;
  scroll-snap-stop: normal;
  scroll-margin-top: 84px;
`;

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const flicker = keyframes`
  0%, 100% { opacity: 1; }
  92%       { opacity: 1; }
  93%       { opacity: 0.7; }
  94%       { opacity: 1; }
  96%       { opacity: 0.85; }
  97%       { opacity: 1; }
`;

const floatRune = keyframes`
  0%   { transform: translateY(0px) rotate(0deg); opacity: 0.08; }
  50%  { transform: translateY(-18px) rotate(4deg); opacity: 0.14; }
  100% { transform: translateY(0px) rotate(0deg); opacity: 0.08; }
`;

const shimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 18px rgba(201,168,76,0.25); }
  50%       { box-shadow: 0 0 36px rgba(201,168,76,0.5); }
`;

// ─── Styled components ────────────────────────────────────────────────────────

const Page = styled.main`
  min-height: 100vh;
  background: #0d0d14;
  color: #e8e0ff;
  font-family: 'Inter', system-ui, sans-serif;
  overflow-x: hidden;
`;

// ── Hero ──────────────────────────────────────────────────────────────────────

const Hero = styled.section`
  ${snapSection}
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 7rem 1.5rem 5rem;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,77,255,0.22) 0%, transparent 65%),
      radial-gradient(ellipse 50% 40% at 80% 80%, rgba(201,168,76,0.08) 0%, transparent 60%);
    pointer-events: none;
  }
`;

// Runes flottantes en arrière-plan
const Rune = styled.span<{ $x: number; $y: number; $delay: number; $size: number }>`
  position: absolute;
  left: ${p => p.$x}%;
  top: ${p => p.$y}%;
  font-size: ${p => p.$size}rem;
  color: #c9a84c;
  animation: ${floatRune} ${p => 4 + p.$delay}s ease-in-out ${p => p.$delay}s infinite;
  pointer-events: none;
  user-select: none;
`;

const HeroEyebrow = styled.p`
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #c9a84c;
  margin: 0 0 1.25rem;
  animation: ${fadeUp} 0.5s ease both;
`;

const HeroTitle = styled.h1`
  font-family: 'Cinzel', serif;
  font-size: clamp(2.2rem, 6.5vw, 4.6rem);
  font-weight: 900;
  line-height: 1.1;
  margin: 0 0 1.5rem;
  letter-spacing: -0.01em;
  animation: ${fadeUp} 0.55s ease 0.08s both;

  span.accent {
    background: linear-gradient(90deg, #c9a84c, #ffe49a, #c9a84c);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: ${shimmer} 3s linear infinite;
  }
`;

const HeroSubtitle = styled.p`
  font-size: clamp(1rem, 2.5vw, 1.2rem);
  color: rgba(232,224,255,0.6);
  max-width: 600px;
  line-height: 1.7;
  margin: 0 0 2.5rem;
  animation: ${fadeUp} 0.55s ease 0.14s both;
`;

const HeroCTA = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 2rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #7c4dff, #5c2dff);
  color: white;
  font-weight: 700;
  font-size: 0.95rem;
  text-decoration: none;
  cursor: pointer;
  transition: transform 160ms, box-shadow 160ms;
  animation: ${fadeUp} 0.55s ease 0.2s both;
  box-shadow: 0 4px 24px rgba(124,77,255,0.4);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(124,77,255,0.55);
  }
`;

const ScrollHint = styled.div`
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  color: rgba(255,255,255,0.25);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  animation: ${fadeUp} 1s ease 0.8s both;

  &::after {
    content: '';
    width: 1px;
    height: 40px;
    background: linear-gradient(to bottom, rgba(255,255,255,0.25), transparent);
  }
`;

// ── Sections génériques (titre / eyebrow / description) ────────────────────────

const Section = styled.section`
  ${snapSection}
  padding: 6rem 1.5rem;
  max-width: 1100px;
  margin: 0 auto;
`;

const SectionEyebrow = styled.p`
  font-family: 'Cinzel', serif;
  font-size: 0.72rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #c9a84c;
  margin: 0 0 0.75rem;
  text-align: center;
`;

const SectionTitle = styled.h2`
  font-family: 'Cinzel', serif;
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  font-weight: 700;
  text-align: center;
  margin: 0 0 0.75rem;
  color: #e8e0ff;
`;

const SectionDesc = styled.p`
  font-size: 1rem;
  color: rgba(232,224,255,0.55);
  text-align: center;
  max-width: 620px;
  margin: 0 auto 3.5rem;
  line-height: 1.7;
`;

// ── Divider ───────────────────────────────────────────────────────────────────

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(201,168,76,0.25), transparent);
  margin: 0;
`;

// ── Qui sommes-nous ──────────────────────────────────────────────────────────

const AboutInner = styled.div`
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 3rem;
  align-items: start;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const AboutText = styled.div<{ $visible: boolean }>`
  opacity: ${p => p.$visible ? 1 : 0};
  transform: ${p => p.$visible ? "translateY(0)" : "translateY(20px)"};
  transition: opacity 0.6s ease, transform 0.6s ease;

  p {
    font-size: 1rem;
    line-height: 1.8;
    color: rgba(232,224,255,0.65);
    margin: 0 0 1.25rem;
  }
`;

const AboutBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 1.5rem;
`;

const AboutBadge = styled.span`
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  background: rgba(201,168,76,0.1);
  border: 1px solid rgba(201,168,76,0.3);
  color: #c9a84c;
`;

const AboutCard = styled.div<{ $visible: boolean }>`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(201,168,76,0.18);
  border-radius: 18px;
  padding: 2rem;
  opacity: ${p => p.$visible ? 1 : 0};
  transform: ${p => p.$visible ? "translateY(0)" : "translateY(20px)"};
  transition: opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s;
`;

const AboutCardTitle = styled.h3`
  font-family: 'Cinzel', serif;
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 1rem;
  color: #c9a84c;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AboutList = styled.ul`
  list-style: none;
  margin: 0 0 1.5rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
`;

const AboutListItem = styled.li`
  font-size: 0.9rem;
  color: rgba(232,224,255,0.65);
  line-height: 1.6;
  padding-left: 1.2rem;
  position: relative;

  &::before {
    content: '✦';
    position: absolute;
    left: 0;
    color: #c9a84c;
    font-size: 0.75rem;
    top: 0.2rem;
  }
`;

const AboutCardFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(255,255,255,0.08);
  font-size: 0.85rem;
  color: rgba(232,224,255,0.5);
`;

// ── Qu'est-ce que le JDR ─────────────────────────────────────────────────────

const JdrIntro = styled.div<{ $visible: boolean }>`
  max-width: 720px;
  margin: 0 auto 3.5rem;
  text-align: center;
  opacity: ${p => p.$visible ? 1 : 0};
  transform: ${p => p.$visible ? "translateY(0)" : "translateY(20px)"};
  transition: opacity 0.6s ease, transform 0.6s ease;

  p {
    font-size: 1rem;
    line-height: 1.8;
    color: rgba(232,224,255,0.65);
    margin: 0 0 1rem;
  }

  strong {
    color: #e8e0ff;
    font-style: italic;
  }
`;

const TypeGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const TypeCard = styled.article<{ $visible: boolean; $delay: number }>`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(124,77,255,0.22);
  border-radius: 18px;
  padding: 2rem;
  opacity: ${p => p.$visible ? 1 : 0};
  transform: ${p => p.$visible ? "translateY(0)" : "translateY(24px)"};
  transition: opacity 0.5s ease ${p => p.$delay}ms, transform 0.5s ease ${p => p.$delay}ms;

  &:hover {
    border-color: rgba(124,77,255,0.45);
    background: rgba(255,255,255,0.06);
  }
`;

const TypeIcon = styled.div`
  font-size: 2.25rem;
  margin-bottom: 0.75rem;
`;

const TypeTitle = styled.h3`
  font-family: 'Cinzel', serif;
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0 0 1rem;
  color: #e8e0ff;
`;

const TypeTagList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const TypeTagItem = styled.li`
  font-size: 0.88rem;
  color: rgba(232,224,255,0.6);
  padding-left: 1.1rem;
  position: relative;

  &::before {
    content: '▸';
    position: absolute;
    left: 0;
    color: #c9a84c;
  }
`;

// ── Bénéfices (pourquoi jouer) ──────────────────────────────────────────────

const BenefitsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.25rem;

  @media (max-width: 400px) { grid-template-columns: 1fr; }
`;

const BenefitCard = styled.article<{ $visible: boolean; $delay: number }>`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(201,168,76,0.18);
  border-radius: 16px;
  padding: 1.75rem 1.5rem;
  position: relative;
  overflow: hidden;
  opacity: ${p => p.$visible ? 1 : 0};
  transform: ${p => p.$visible ? "translateY(0)" : "translateY(28px)"};
  transition: opacity 0.5s ease ${p => p.$delay}ms, transform 0.5s ease ${p => p.$delay}ms;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent);
  }

  &:hover {
    background: rgba(255,255,255,0.07);
    border-color: rgba(201,168,76,0.35);
  }
`;

const BenefitIcon = styled.div`
  font-size: 2.25rem;
  margin-bottom: 1rem;
  line-height: 1;
`;

const BenefitTitle = styled.h3`
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.6rem;
  color: #e8e0ff;
`;

const BenefitText = styled.p`
  font-size: 0.88rem;
  color: rgba(232,224,255,0.55);
  line-height: 1.65;
  margin: 0;
`;

// ── Package Joueurs & MJ (activités) ────────────────────────────────────────

const ActivityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.25rem;
`;

const ActivityCard = styled.article<{ $visible: boolean; $delay: number }>`
  display: flex;
  gap: 1rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 1.5rem;
  opacity: ${p => p.$visible ? 1 : 0};
  transform: ${p => p.$visible ? "translateY(0)" : "translateY(24px)"};
  transition: opacity 0.5s ease ${p => p.$delay}ms, transform 0.5s ease ${p => p.$delay}ms;

  &:hover {
    border-color: rgba(124,77,255,0.35);
    background: rgba(255,255,255,0.06);
  }
`;

const ActivityIconWrap = styled.div`
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  background: rgba(124,77,255,0.14);
  border: 1px solid rgba(124,77,255,0.3);
`;

const ActivityBody = styled.div``;

const ActivityTitle = styled.h3`
  font-family: 'Cinzel', serif;
  font-size: 0.98rem;
  font-weight: 700;
  margin: 0 0 0.4rem;
  color: #e8e0ff;
`;

const ActivityText = styled.p`
  font-size: 0.85rem;
  color: rgba(232,224,255,0.55);
  line-height: 1.6;
  margin: 0;
`;

// ── Package Institutions ────────────────────────────────────────────────────

const InstitutionsSectionWrap = styled.section`
  ${snapSection}
  position: relative;
  padding: 6rem 1.5rem;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 70% 60% at 50% 20%, rgba(201,168,76,0.06) 0%, transparent 65%);
    pointer-events: none;
  }
`;

const InstitutionsInner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  position: relative;
`;

const InstitutionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.25rem;
  margin-bottom: 3rem;
`;

const InstitutionCard = styled.article<{ $visible: boolean; $delay: number; $accent: string }>`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-top: 3px solid ${p => p.$accent};
  border-radius: 14px;
  padding: 1.5rem;
  opacity: ${p => p.$visible ? 1 : 0};
  transform: ${p => p.$visible ? "translateY(0)" : "translateY(24px)"};
  transition: opacity 0.5s ease ${p => p.$delay}ms, transform 0.5s ease ${p => p.$delay}ms;

  &:hover {
    background: rgba(255,255,255,0.07);
  }
`;

const InstitutionTitle = styled.h3`
  font-family: 'Cinzel', serif;
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0 0 1rem;
  color: #e8e0ff;
`;

const InstitutionList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`;

const InstitutionListItem = styled.li<{ $accent: string }>`
  font-size: 0.82rem;
  color: rgba(232,224,255,0.55);
  line-height: 1.5;
  padding-left: 1rem;
  position: relative;

  &::before {
    content: '•';
    position: absolute;
    left: 0;
    color: ${p => p.$accent};
  }
`;

const ContactCTA = styled.div<{ $visible: boolean }>`
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 2.5rem;
  align-items: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(201,168,76,0.25);
  border-radius: 20px;
  padding: 2.5rem;
  opacity: ${p => p.$visible ? 1 : 0};
  transform: ${p => p.$visible ? "translateY(0)" : "translateY(20px)"};
  transition: opacity 0.6s ease, transform 0.6s ease;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const ContactTitle = styled.h3`
  font-family: 'Cinzel', serif;
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
  color: #e8e0ff;
`;

const ContactText = styled.p`
  font-size: 0.92rem;
  color: rgba(232,224,255,0.6);
  line-height: 1.7;
  margin: 0 0 1rem;
`;

const ContactPillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const ContactPill = styled.span`
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(124,77,255,0.15);
  border: 1px solid rgba(124,77,255,0.3);
  color: #c8a8ff;
`;

const ContactLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ContactLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: rgba(232,224,255,0.75);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  transition: color 150ms;

  &:hover { color: #c9a84c; }
`;

// ── Nos valeurs ──────────────────────────────────────────────────────────────

const ValuesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;

  @media (max-width: 760px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 420px) { grid-template-columns: 1fr; }
`;

const ValueCard = styled.article<{ $visible: boolean; $delay: number }>`
  text-align: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 1.75rem 1.25rem;
  opacity: ${p => p.$visible ? 1 : 0};
  transform: ${p => p.$visible ? "translateY(0)" : "translateY(24px)"};
  transition: opacity 0.5s ease ${p => p.$delay}ms, transform 0.5s ease ${p => p.$delay}ms;

  &:hover {
    border-color: rgba(201,168,76,0.35);
    background: rgba(255,255,255,0.07);
  }
`;

const ValueIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 0.75rem;
`;

const ValueTitle = styled.h3`
  font-family: 'Cinzel', serif;
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: #c9a84c;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ValueText = styled.p`
  font-size: 0.84rem;
  color: rgba(232,224,255,0.55);
  line-height: 1.6;
  margin: 0;
`;

// ── Nos plaquettes ───────────────────────────────────────────────────────────

const PlaquetteGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
`;

const PlaquetteCard = styled.button<{ $visible: boolean; $delay: number }>`
  all: unset;
  cursor: pointer;
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(201,168,76,0.22);
  background: rgba(255,255,255,0.03);
  opacity: ${p => p.$visible ? 1 : 0};
  transform: ${p => p.$visible ? "translateY(0)" : "translateY(24px)"};
  transition: opacity 0.5s ease ${p => p.$delay}ms, transform 0.5s ease ${p => p.$delay}ms,
              border-color 150ms, box-shadow 150ms;

  &:hover {
    border-color: rgba(201,168,76,0.55);
    box-shadow: 0 8px 28px rgba(0,0,0,0.4);
  }

  img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    object-position: top;
  }
`;

const PlaquetteOverlay = styled.span`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  padding: 0.9rem;
  background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%);
  font-size: 0.8rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.02em;
`;

const LightboxOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(6,6,10,0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.25rem;
  animation: ${fadeUp} 0.2s ease both;
`;

const LightboxInner = styled.div`
  position: relative;
  max-width: 900px;
  width: 100%;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  img {
    max-width: 100%;
    max-height: 72vh;
    border-radius: 12px;
    border: 1px solid rgba(201,168,76,0.35);
    box-shadow: 0 12px 60px rgba(0,0,0,0.6);
    object-fit: contain;
  }
`;

const LightboxControls = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const LightboxBtn = styled.button`
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1.1rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.2);
  color: rgba(232,224,255,0.85);
  font-size: 0.85rem;
  font-weight: 600;
  transition: background 150ms;
  &:hover { background: rgba(255,255,255,0.08); }
`;

const LightboxDownload = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1.1rem;
  border-radius: 8px;
  background: linear-gradient(135deg, #7c4dff, #5c2dff);
  color: white;
  font-size: 0.85rem;
  font-weight: 700;
  text-decoration: none;
`;

const LightboxClose = styled.button`
  all: unset;
  cursor: pointer;
  position: absolute;
  top: -2.5rem;
  right: 0;
  font-size: 1.5rem;
  color: rgba(255,255,255,0.7);
  line-height: 1;
  &:hover { color: #fff; }
`;

// ── Section Pourfendeurs ──────────────────────────────────────────────────────

const PourfendeursSection = styled.section`
  ${snapSection}
  position: relative;
  padding: 7rem 1.5rem;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 60% 70% at 10% 50%, rgba(201,168,76,0.07) 0%, transparent 60%),
      radial-gradient(ellipse 60% 70% at 90% 50%, rgba(124,77,255,0.07) 0%, transparent 60%);
    pointer-events: none;
  }
`;

const PourfendeursInner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
`;

const PourfendeursImage = styled.div<{ $visible: boolean }>`
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  opacity: ${p => p.$visible ? 1 : 0};
  transform: ${p => p.$visible ? "translateX(0)" : "translateX(-32px)"};
  transition: opacity 0.7s ease, transform 0.7s ease;
  animation: ${glowPulse} 4s ease-in-out infinite;

  img {
    width: 100%;
    display: block;
    border-radius: 20px;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 20px;
    border: 1px solid rgba(201,168,76,0.35);
    pointer-events: none;
  }
`;

const EpisodeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.85rem;
  border-radius: 999px;
  background: rgba(201,168,76,0.12);
  border: 1px solid rgba(201,168,76,0.3);
  color: #c9a84c;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 1rem;
`;

const PourfendeursContent = styled.div<{ $visible: boolean }>`
  opacity: ${p => p.$visible ? 1 : 0};
  transform: ${p => p.$visible ? "translateX(0)" : "translateX(32px)"};
  transition: opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s;
`;

const CampaignTitle = styled.h2`
  font-family: 'Cinzel', serif;
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 900;
  margin: 0 0 0.5rem;
  line-height: 1.1;
  color: #e8e0ff;
`;

const CampaignSubtitle = styled.p`
  font-family: 'Cinzel', serif;
  font-size: 0.85rem;
  color: #c9a84c;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin: 0 0 1.5rem;
`;

const CampaignDesc = styled.p`
  font-size: 1rem;
  color: rgba(232,224,255,0.65);
  line-height: 1.75;
  margin: 0 0 2rem;
`;

const TagRow = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;
`;

const Tag = styled.span`
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(124,77,255,0.15);
  border: 1px solid rgba(124,77,255,0.3);
  color: #c8a8ff;
`;

const CTARow = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const YouTubeCTA = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  background: #ff0000;
  color: white;
  font-weight: 700;
  font-size: 0.9rem;
  text-decoration: none;
  transition: transform 150ms, box-shadow 150ms;
  box-shadow: 0 4px 20px rgba(255,0,0,0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(255,0,0,0.45);
  }

  svg { flex-shrink: 0; }
`;

const PlaylistCTA = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  border: 1px solid rgba(201,168,76,0.4);
  background: rgba(201,168,76,0.08);
  color: #c9a84c;
  font-weight: 700;
  font-size: 0.9rem;
  text-decoration: none;
  transition: background 150ms, border-color 150ms;

  &:hover {
    background: rgba(201,168,76,0.16);
    border-color: rgba(201,168,76,0.65);
  }
`;

// ── Section YouTube ───────────────────────────────────────────────────────────

const YoutubeSection = styled.section`
  ${snapSection}
  padding: 6rem 1.5rem;
  text-align: center;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 70% 60% at 50% 50%, rgba(124,77,255,0.1) 0%, transparent 70%);
    pointer-events: none;
  }
`;

const YoutubeCard = styled.div`
  max-width: 680px;
  margin: 2.5rem auto 0;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 2.5rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #ff0000, transparent);
  }
`;

const YoutubeIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  animation: ${flicker} 6s ease-in-out infinite;
`;

const YoutubeTitle = styled.h3`
  font-family: 'Cinzel', serif;
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
  color: #e8e0ff;
`;

const YoutubeDesc = styled.p`
  font-size: 0.95rem;
  color: rgba(232,224,255,0.55);
  line-height: 1.7;
  margin: 0 0 2rem;
`;

const YoutubeBtn = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 2rem;
  border-radius: 10px;
  background: #ff0000;
  color: white;
  font-weight: 700;
  font-size: 0.95rem;
  text-decoration: none;
  transition: transform 150ms, box-shadow 150ms;
  box-shadow: 0 4px 24px rgba(255,0,0,0.35);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(255,0,0,0.5);
  }
`;

// ── Footer CTA ────────────────────────────────────────────────────────────────

const FooterCTA = styled.section`
  ${snapSection}
  padding: 5rem 1.5rem 7rem;
  text-align: center;
`;

const FooterCTATitle = styled.h2`
  font-family: 'Cinzel', serif;
  font-size: clamp(1.4rem, 3.5vw, 2rem);
  font-weight: 700;
  margin: 0 0 1rem;
`;

const FooterCTADesc = styled.p`
  font-size: 0.95rem;
  color: rgba(232,224,255,0.5);
  margin: 0 0 2rem;
`;

const FooterBtnRow = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`;

const PrimaryBtn = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.75rem;
  border-radius: 10px;
  background: linear-gradient(135deg, #7c4dff, #5c2dff);
  color: white;
  font-weight: 700;
  font-size: 0.9rem;
  text-decoration: none;
  box-shadow: 0 4px 20px rgba(124,77,255,0.4);
  transition: transform 150ms;
  &:hover { transform: translateY(-2px); }
`;

const SecondaryBtn = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.75rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: rgba(232,224,255,0.7);
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  transition: background 150ms;
  &:hover { background: rgba(255,255,255,0.06); }
`;

// ─── Données ──────────────────────────────────────────────────────────────────

const ABOUT_MISSION = [
  "Rassembler les passionnés, débutants comme confirmés, autour d'activités ludiques, créatives et conviviales.",
  "Faire découvrir la richesse du jeu de rôle sous toutes ses formes (table, GN, narration, univers originaux…).",
  "Créer du lien, imaginer, se dépasser et vivre des aventures uniques !",
];

const JDR_TYPES = [
  {
    icon: "🎲",
    title: "JDR sur table",
    tags: ["Partage en présentiel", "Ambiance immersive", "Aventures collectives", "Convivialité garantie"],
  },
  {
    icon: "💻",
    title: "JDR distanciel",
    tags: ["Jouez depuis chez vous", "Connexions simplifiées", "Outils modernes (VTT, appli, etc.)", "Flexibilité et accessibilité"],
  },
];

const BENEFITS = [
  {
    icon: "💚",
    title: "Développer la confiance en soi",
    text: "Le JDR permet à chacun de s'exprimer, d'oser et de prendre sa place dans un cadre bienveillant.",
  },
  {
    icon: "🧠",
    title: "Stimuler l'imagination et la créativité",
    text: "Inventer des histoires, résoudre des problèmes, imaginer des mondes : le JDR éveille l'esprit et la curiosité.",
  },
  {
    icon: "🤝",
    title: "Favoriser le lien social et l'inclusion",
    text: "Jouer ensemble, c'est apprendre à écouter, à coopérer et à respecter les autres, quelles que soient nos différences.",
  },
  {
    icon: "🎯",
    title: "Soutenir le bien-être et l'expression des émotions",
    text: "Le JDR aide à extérioriser, à comprendre ses émotions et à prendre du recul, dans un espace sécurisé.",
  },
];

const ACTIVITIES = [
  {
    icon: "🎲",
    title: "Soirées jeu de rôle",
    text: "Des sessions conviviales chaque semaine pour partager des aventures inoubliables autour d'une table.",
  },
  {
    icon: "📖",
    title: "Campagnes narratives",
    text: "Plongez dans des univers riches et vivants à travers des campagnes épiques et des intrigues captivantes.",
  },
  {
    icon: "🏆",
    title: "Événements spéciaux & tournois",
    text: "Tournois, one-shots, nuit du JDR, événements thématiques… des moments uniques à ne pas manquer !",
  },
  {
    icon: "🙋",
    title: "Initiations pour débutants",
    text: "Découvrez le JDR en toute simplicité avec nos initiations gratuites et accompagnées par des MJ passionnés.",
  },
  {
    icon: "📷",
    title: "Création de contenus",
    text: "Actual plays, vidéos, lives, podcasts… suivez nos aventures et découvrez l'univers du JDR sur nos plateformes !",
  },
  {
    icon: "⚔️",
    title: "Ateliers & formation",
    text: "Ateliers MJ, écriture de scénarios, improvisation, storytelling… progressez et développez vos compétences !",
  },
];

const INSTITUTIONS = [
  {
    accent: "#7ba05b",
    title: "Dans les hôpitaux",
    items: ["Apporter de l'évasion et du réconfort", "Rompre l'isolement", "Encourager l'expression", "Créer des moments de joie et de partage"],
  },
  {
    accent: "#4a90a4",
    title: "Dans les écoles",
    items: ["Soutenir les apprentissages", "Développer la créativité", "Améliorer la communication", "Renforcer la coopération et la confiance"],
  },
  {
    accent: "#7c4dff",
    title: "Dans les lieux culturels",
    items: ["Animer des événements originaux", "Attirer et fidéliser de nouveaux publics", "Valoriser la culture et le patrimoine", "Créer du lien intergénérationnel"],
  },
  {
    accent: "#e07a3f",
    title: "Pour tous les publics",
    items: ["Des activités inclusives et accessibles", "Des thèmes variés et adaptés", "Des animations encadrées par des passionnés qualifiés"],
  },
];

const VALUES = [
  { icon: "🤍", title: "Partage", text: "Créer du lien et des souvenirs inoubliables." },
  { icon: "💡", title: "Créativité", text: "Libérer votre imagination et donner vie à vos histoires." },
  { icon: "🎭", title: "Immersion", text: "Vivez des aventures épiques dans des univers sans limites." },
  { icon: "👥", title: "Communauté", text: "Rejoignez une communauté passionnée et bienveillante à La Réunion." },
];

const PLAQUETTES = [
  { src: "/images/plaquettes/plaquette-1.png", alt: "Plaquette JDR Réunion — Nos activités", label: "Nos activités" },
  { src: "/images/plaquettes/plaquette-2.png", alt: "Plaquette JDR Réunion — Présentation de l'association", label: "Présentation de l'association" },
  { src: "/images/plaquettes/plaquette-3.png", alt: "Plaquette JDR Réunion — Comment jouer & objectifs", label: "Comment jouer & objectifs" },
  { src: "/images/plaquettes/plaquette-4.png", alt: "Plaquette JDR Réunion — Package Institutions", label: "Package Institutions" },
];

// ─── Composant ────────────────────────────────────────────────────────────────

function useInView(ref: React.RefObject<Element>, threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

export default function PresentationPage() {
  const aboutRef        = useRef<HTMLElement>(null!);
  const jdrIntroRef      = useRef<HTMLElement>(null!);
  const benefitsRef      = useRef<HTMLElement>(null!);
  const activitiesRef    = useRef<HTMLElement>(null!);
  const institutionsRef  = useRef<HTMLElement>(null!);
  const valuesRef        = useRef<HTMLElement>(null!);
  const pourfendeursRef  = useRef<HTMLElement>(null!);
  const plaquettesRef    = useRef<HTMLElement>(null!);

  const aboutVisible       = useInView(aboutRef);
  const jdrIntroVisible    = useInView(jdrIntroRef);
  const benefitsVisible    = useInView(benefitsRef);
  const activitiesVisible  = useInView(activitiesRef);
  const institutionsVisible = useInView(institutionsRef);
  const valuesVisible      = useInView(valuesRef);
  const pourfendeursVisible = useInView(pourfendeursRef);
  const plaquettesVisible  = useInView(plaquettesRef);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i === null ? i : (i + 1) % PLAQUETTES.length));
      if (e.key === "ArrowLeft") setLightboxIndex((i) => (i === null ? i : (i - 1 + PLAQUETTES.length) % PLAQUETTES.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex]);

  return (
    <Page>
      <FontImport />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Inter:wght@400;500;600&display=swap"
      />
      <Navigation />

      {/* ── Runes déco ── */}
      <Rune $x={5}  $y={15} $delay={0}   $size={2.5}>᛫</Rune>
      <Rune $x={92} $y={8}  $delay={1.2} $size={1.8}>ᚱ</Rune>
      <Rune $x={88} $y={55} $delay={2.5} $size={2.2}>ᚦ</Rune>
      <Rune $x={3}  $y={65} $delay={0.8} $size={1.6}>ᚷ</Rune>

      {/* ═══════════════ 1. HERO ═══════════════ */}
      <Hero>
        <HeroEyebrow>JDR Réunion · Association loi 1901</HeroEyebrow>
        <HeroTitle>
          Le jeu de rôle,<br />
          un outil <span className="accent">humain, créatif et social</span>
        </HeroTitle>
        <HeroSubtitle>
          Le jeu de rôle est bien plus qu'un loisir : c'est un formidable outil
          pédagogique, thérapeutique et culturel. JDR Réunion propose des
          interventions adaptées dans les hôpitaux, écoles, médiathèques et
          lieux culturels pour faire vivre des expériences uniques et porteuses
          de sens.
        </HeroSubtitle>
        <HeroCTA href="#qui-sommes-nous">
          Découvrir l'association ↓
        </HeroCTA>
        <ScrollHint>Défiler</ScrollHint>
      </Hero>

      <Divider />

      {/* ═══════════════ 2. QUI SOMMES-NOUS ═══════════════ */}
      <Section id="qui-sommes-nous" ref={aboutRef}>
        <SectionEyebrow>L'association</SectionEyebrow>
        <SectionTitle>Qui sommes-nous ?</SectionTitle>

        <AboutInner>
          <AboutText $visible={aboutVisible}>
            <AboutBadgeRow>
              <AboutBadge>Loi 1901</AboutBadge>
              <AboutBadge>Fondée en 2026</AboutBadge>
              <AboutBadge>Le Tampon · La Réunion</AboutBadge>
            </AboutBadgeRow>
            <p>
              JDR Réunion (JDRR) est une association loi 1901, fondée en 2026,
              dédiée à la promotion et au développement du jeu de rôle sur
              l'île de La Réunion.
            </p>
            <p>
              Notre QG se situe au Tampon, mais nous intervenons sur toute
              l'île — de Saint-Denis à Saint-Pierre, en passant par le Port
              et Sainte-Marie.
            </p>
          </AboutText>

          <AboutCard $visible={aboutVisible}>
            <AboutCardTitle>🎯 Notre mission</AboutCardTitle>
            <AboutList>
              {ABOUT_MISSION.map((m) => (
                <AboutListItem key={m}>{m}</AboutListItem>
              ))}
            </AboutList>
            <AboutCardFooter>
              📍 Présent sur toute l'île de La Réunion
            </AboutCardFooter>
          </AboutCard>
        </AboutInner>
      </Section>

      <Divider />

      {/* ═══════════════ 3. QU'EST-CE QUE LE JDR ═══════════════ */}
      <Section id="qu-est-ce-que-le-jdr" ref={jdrIntroRef}>
        <SectionEyebrow>Comment jouer ?</SectionEyebrow>
        <SectionTitle>Un jeu de rôle, c'est quoi ?</SectionTitle>

        <JdrIntro $visible={jdrIntroVisible}>
          <p>
            Un jeu de rôle, c'est une aventure que l'on crée ensemble. Chaque
            joueur incarne un personnage (guerrier, mage, explorateur…) et
            prend des décisions dans une histoire racontée par le Maître du
            Jeu. <strong>Tu ne regardes pas une histoire… tu la vis.</strong>
          </p>
          <p>
            Le Maître du Jeu décrit les lieux, les personnages et les
            situations. Les joueurs choisissent leurs actions, et les dés
            déterminent le succès ou l'échec.
          </p>
        </JdrIntro>

        <TypeGrid>
          {JDR_TYPES.map((t, i) => (
            <TypeCard key={t.title} $visible={jdrIntroVisible} $delay={i * 100}>
              <TypeIcon>{t.icon}</TypeIcon>
              <TypeTitle>{t.title}</TypeTitle>
              <TypeTagList>
                {t.tags.map((tag) => (
                  <TypeTagItem key={tag}>{tag}</TypeTagItem>
                ))}
              </TypeTagList>
            </TypeCard>
          ))}
        </TypeGrid>
      </Section>

      <Divider />

      {/* ═══════════════ 4. POURQUOI JOUER ═══════════════ */}
      <Section id="pourquoi-jouer" ref={benefitsRef}>
        <SectionEyebrow>Pourquoi intégrer le jeu de rôle ?</SectionEyebrow>
        <SectionTitle>Plus qu'un jeu,<br />une expérience</SectionTitle>
        <SectionDesc>
          Le jeu de rôle sur table est pratiqué partout dans le monde depuis
          les années 70. Voici pourquoi des milliers de joueurs y reviennent
          chaque semaine.
        </SectionDesc>

        <BenefitsGrid>
          {BENEFITS.map((b, i) => (
            <BenefitCard key={b.title} $visible={benefitsVisible} $delay={i * 80}>
              <BenefitIcon>{b.icon}</BenefitIcon>
              <BenefitTitle>{b.title}</BenefitTitle>
              <BenefitText>{b.text}</BenefitText>
            </BenefitCard>
          ))}
        </BenefitsGrid>
      </Section>

      <Divider />

      {/* ═══════════════ 5. PACKAGE JOUEURS & MJ ═══════════════ */}
      <Section id="joueurs-et-mj" ref={activitiesRef}>
        <SectionEyebrow>Package Joueurs & MJ</SectionEyebrow>
        <SectionTitle>Nos activités</SectionTitle>
        <SectionDesc>
          Rejoignez le club et vivez le JDR sous toutes ses formes : soirées
          régulières, campagnes, tournois, initiations et ateliers.
        </SectionDesc>

        <ActivityGrid>
          {ACTIVITIES.map((a, i) => (
            <ActivityCard key={a.title} $visible={activitiesVisible} $delay={i * 70}>
              <ActivityIconWrap>{a.icon}</ActivityIconWrap>
              <ActivityBody>
                <ActivityTitle>{a.title}</ActivityTitle>
                <ActivityText>{a.text}</ActivityText>
              </ActivityBody>
            </ActivityCard>
          ))}
        </ActivityGrid>
      </Section>

      <Divider />

      {/* ═══════════════ 6. PACKAGE INSTITUTIONS ═══════════════ */}
      <InstitutionsSectionWrap id="institutions" ref={institutionsRef}>
        <InstitutionsInner>
          <SectionEyebrow>Package Institutions</SectionEyebrow>
          <SectionTitle>Le JDR au service de vos publics</SectionTitle>
          <SectionDesc>
            Nous intervenons auprès des hôpitaux, écoles, lieux culturels et
            de tous les publics avec des animations sur-mesure.
          </SectionDesc>

          <InstitutionGrid>
            {INSTITUTIONS.map((inst, i) => (
              <InstitutionCard
                key={inst.title}
                $visible={institutionsVisible}
                $delay={i * 80}
                $accent={inst.accent}
              >
                <InstitutionTitle>{inst.title}</InstitutionTitle>
                <InstitutionList>
                  {inst.items.map((item) => (
                    <InstitutionListItem key={item} $accent={inst.accent}>
                      {item}
                    </InstitutionListItem>
                  ))}
                </InstitutionList>
              </InstitutionCard>
            ))}
          </InstitutionGrid>

          <ContactCTA $visible={institutionsVisible}>
            <div>
              <ContactTitle>Envie d'une collaboration ?</ContactTitle>
              <ContactText>
                JDR Réunion construit avec vous des projets sur-mesure,
                adaptés à vos objectifs et à votre public.
              </ContactText>
              <ContactPillRow>
                <ContactPill>🤝 Partenariats durables</ContactPill>
                <ContactPill>📅 Interventions ponctuelles ou régulières</ContactPill>
                <ContactPill>👥 Équipes passionnées et bienveillantes</ContactPill>
              </ContactPillRow>
            </div>
            <ContactLinks>
              <ContactLink href="mailto:jeuderolereunion@gmail.com">
                ✉️ jeuderolereunion@gmail.com
              </ContactLink>
              <ContactLink href="https://discord.gg/ZtHDCt7RdY" target="_blank" rel="noopener noreferrer">
                💬 discord.gg/ZtHDCt7RdY
              </ContactLink>
              <ContactLink href="https://www.instagram.com/jeuderolereunion" target="_blank" rel="noopener noreferrer">
                📸 @jeuderolereunion
              </ContactLink>
              <ContactLink href="https://www.youtube.com/@JDRReunion" target="_blank" rel="noopener noreferrer">
                ▶️ JDR Réunion
              </ContactLink>
            </ContactLinks>
          </ContactCTA>
        </InstitutionsInner>
      </InstitutionsSectionWrap>

      <Divider />

      {/* ═══════════════ 7. NOS VALEURS ═══════════════ */}
      <Section id="nos-valeurs" ref={valuesRef}>
        <SectionEyebrow>Ce qui nous anime</SectionEyebrow>
        <SectionTitle>Nos valeurs</SectionTitle>
        <SectionDesc>
          Plus qu'un jeu, une communauté — voici ce qui guide chacune de nos
          actions.
        </SectionDesc>

        <ValuesGrid>
          {VALUES.map((v, i) => (
            <ValueCard key={v.title} $visible={valuesVisible} $delay={i * 90}>
              <ValueIcon>{v.icon}</ValueIcon>
              <ValueTitle>{v.title}</ValueTitle>
              <ValueText>{v.text}</ValueText>
            </ValueCard>
          ))}
        </ValuesGrid>
      </Section>

      <Divider />

      {/* ═══════════════ NOS PLAQUETTES ═══════════════ */}
      <Section id="nos-plaquettes" ref={plaquettesRef}>
        <SectionEyebrow>À télécharger et partager</SectionEyebrow>
        <SectionTitle>Nos plaquettes</SectionTitle>
        <SectionDesc>
          Toutes les informations sur l'association en un coup d'œil.
          Cliquez sur une plaquette pour l'agrandir ou la télécharger.
        </SectionDesc>

        <PlaquetteGrid>
          {PLAQUETTES.map((p, i) => (
            <PlaquetteCard
              key={p.src}
              $visible={plaquettesVisible}
              $delay={i * 90}
              onClick={() => setLightboxIndex(i)}
              aria-label={`Agrandir : ${p.label}`}
            >
              <img src={p.src} alt={p.alt} loading="lazy" />
              <PlaquetteOverlay>{p.label}</PlaquetteOverlay>
            </PlaquetteCard>
          ))}
        </PlaquetteGrid>
      </Section>

      {lightboxIndex !== null && (
        <LightboxOverlay onClick={() => setLightboxIndex(null)}>
          <LightboxInner onClick={(e) => e.stopPropagation()}>
            <LightboxClose onClick={() => setLightboxIndex(null)} aria-label="Fermer">
              ✕
            </LightboxClose>
            <img src={PLAQUETTES[lightboxIndex].src} alt={PLAQUETTES[lightboxIndex].alt} />
            <LightboxControls>
              <LightboxBtn
                onClick={() => setLightboxIndex((i) => (i === null ? i : (i - 1 + PLAQUETTES.length) % PLAQUETTES.length))}
              >
                ← Précédente
              </LightboxBtn>
              <LightboxDownload href={PLAQUETTES[lightboxIndex].src} download>
                ⬇️ Télécharger
              </LightboxDownload>
              <LightboxBtn
                onClick={() => setLightboxIndex((i) => (i === null ? i : (i + 1) % PLAQUETTES.length))}
              >
                Suivante →
              </LightboxBtn>
            </LightboxControls>
          </LightboxInner>
        </LightboxOverlay>
      )}

      <Divider />

      {/* ═══════════════ 8. LES POURFENDEURS + YOUTUBE ═══════════════ */}
      <PourfendeursSection ref={pourfendeursRef}>
        <PourfendeursInner>
          {/* Image */}
          <PourfendeursImage $visible={pourfendeursVisible}>
            <img
              src="/images/pourfendeurs.jpg"
              alt="L'Histoire des Pourfendeurs — couverture"
            />
          </PourfendeursImage>

          {/* Contenu */}
          <PourfendeursContent $visible={pourfendeursVisible}>
            <EpisodeBadge>🎲 Campagne en cours · 1 épisode</EpisodeBadge>

            <CampaignTitle>L'Histoire des<br />Pourfendeurs</CampaignTitle>
            <CampaignSubtitle>JDR Réunion — La Campagne</CampaignSubtitle>

            <CampaignDesc>
              Bienvenue dans cette nouvelle campagne de jeu de rôle. Dans cet épisode 1,
              ils commencèrent une mission qui semblait simple… mais les apparences sont
              trompeuses. Entre décisions risquées, tensions et imprévus, le destin du
              groupe commence déjà à se dessiner.
            </CampaignDesc>

            <TagRow>
              <Tag>🔥 Aventure immersive</Tag>
              <Tag>🎭 Choix conséquents</Tag>
              <Tag>⚠️ Début périlleux</Tag>
            </TagRow>

            <CTARow>
              <YouTubeCTA
                href="https://www.youtube.com/playlist?list=PLfQ7hO5HUp2nXZqgmYuVL4NAkxaEHfcfp"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/>
                </svg>
                Voir l'épisode 1
              </YouTubeCTA>
              <PlaylistCTA
                href="https://www.youtube.com/playlist?list=PLfQ7hO5HUp2nXZqgmYuVL4NAkxaEHfcfp"
                target="_blank"
                rel="noopener noreferrer"
              >
                📋 Voir la playlist
              </PlaylistCTA>
            </CTARow>
          </PourfendeursContent>
        </PourfendeursInner>
      </PourfendeursSection>

      <Divider />

      {/* ─────────────────── YOUTUBE ─────────────────── */}
      <YoutubeSection>
        <SectionEyebrow>Notre chaîne</SectionEyebrow>
        <SectionTitle>Suivez nos aventures</SectionTitle>

        <YoutubeCard>
          <YoutubeIcon>▶️</YoutubeIcon>
          <YoutubeTitle>JDR Réunion sur YouTube</YoutubeTitle>
          <YoutubeDesc>
            Parties filmées, campagnes en cours, moments épiques et imprévus mémorables —
            rejoignez la communauté et vivez les aventures de nos tables depuis chez vous.
            Abonnez-vous pour ne rater aucun épisode.
          </YoutubeDesc>
          <YoutubeBtn
            href="https://www.youtube.com/@JDRReunion"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/>
            </svg>
            S'abonner à la chaîne
          </YoutubeBtn>
        </YoutubeCard>
      </YoutubeSection>

      <Divider />

      {/* ─────────────────── FOOTER CTA ─────────────────── */}
      <FooterCTA>
        <FooterCTATitle>Prêt à rejoindre l'aventure ?</FooterCTATitle>
        <FooterCTADesc>
          Venez jouer avec nous lors de nos prochaines soirées JDR à La Réunion.
        </FooterCTADesc>
        <FooterBtnRow>
          <PrimaryBtn href="/evenements/soirees-jdr">🎲 Voir les prochaines parties</PrimaryBtn>
          <SecondaryBtn href="/proposer-evenement">➕ Proposer une table</SecondaryBtn>
        </FooterBtnRow>
      </FooterCTA>
    </Page>
  );
}