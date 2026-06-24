"use client";
import HeroCarousel from "@/components/sections/HeroCarroussel";
import { useState, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { Container } from '@/components/Container';
import { Image } from '@/components/semantic/Image';
import Link from "next/link";
import { db } from "@/lib/firebase";

import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Styled components ────────────────────────────────────────────────────────

const Content = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  padding-top: 60px;
  width: 100%;
`;

const Title = styled.h1`
  font-size: clamp(2.5rem, 5vw, 4rem);
  letter-spacing: 0.08em;
  margin: 0;
  text-shadow: 0 0 3px #fff;
  color: var(--theme-color-gold);
  animation: ${fadeUp} 0.4s ease both;
`;

const Subtitle = styled.p`
  font-size: clamp(0.95rem, 2.5vw, 1.25rem);
  line-height: 1.5;
  margin: 0;
  max-width: 600px;
  color: rgba(255,255,255,0.65);
  animation: ${fadeUp} 0.45s ease 0.1s both;
`;

// ── Carrousel ─────────────────────────────────────────────────────────────────

const CarouselSection = styled.div`
  width: 100%;
  max-width: 1100px;
  padding: 0 1rem;
  animation: ${fadeUp} 0.5s ease 0.15s both;
`;

const CarouselHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 0 0.25rem;
`;

const CarouselLabel = styled.p`
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(160,120,255,0.8);
  margin: 0;
`;

const CarouselNav = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const NavBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.7);
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms;
  &:hover { background: rgba(255,255,255,0.12); color: #fff; }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`;

const CarouselTrack = styled.div`
  display: flex;
  gap: 1.25rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  scroll-behavior: smooth;
  padding-bottom: 0.5rem;
  &::-webkit-scrollbar { display: none; }
`;

const Slide = styled(Link)`
  flex-shrink: 0;
  width: 280px;
  scroll-snap-align: start;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  overflow: hidden;
  text-decoration: none;
  color: white;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;

  &:hover {
    transform: translateY(-4px);
    background: rgba(255,255,255,0.08);
    border-color: rgba(160,120,255,0.35);
  }

  @media (max-width: 500px) {
    width: 240px;
  }
`;

const SlideImage = styled.div<{ $bg?: string }>`
  width: 100%;
  height: 160px;
  background: ${p =>
    p.$bg
      ? `linear-gradient(180deg, rgba(13,13,20,0.1) 0%, rgba(13,13,20,0.75) 100%), url(${p.$bg})`
      : "linear-gradient(135deg, rgba(80,60,160,0.4) 0%, rgba(40,30,80,0.2) 100%)"};
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
  padding: 0.75rem;
`;

const SlideBadge = styled.span<{ $type: string }>`
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: ${p => p.$type === "campagne"
    ? "rgba(120,80,255,0.7)"
    : "rgba(255,160,50,0.7)"};
  border: 1px solid ${p => p.$type === "campagne"
    ? "rgba(160,120,255,0.6)"
    : "rgba(255,200,100,0.6)"};
  color: white;
`;

const SlideBody = styled.div`
  padding: 0.85rem 1rem 1rem;
  text-align: left;
`;

const SlideSystem = styled.p`
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(160,120,255,0.9);
  margin: 0 0 0.3rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const SlideTitle = styled.h3`
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0 0 0.4rem;
  line-height: 1.3;
`;

const SlideMeta = styled.p`
  font-size: 0.75rem;
  color: rgba(255,255,255,0.45);
  margin: 0;
`;

const EmptySlide = styled.div`
  flex-shrink: 0;
  width: 280px;
  height: 240px;
  border: 1.5px dashed rgba(255,255,255,0.1);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: rgba(255,255,255,0.3);
  font-size: 0.85rem;
`;

const LoadingSlide = styled(EmptySlide)`
  animation: pulse 1.5s ease infinite;
  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type Partie = {
  id: string;
  titre: string;
  systeme?: string;
  type?: string;
  image?: string;
  date?: string;
  organisateur?: string;
  visibility?: string;
};

// ─── Composant ────────────────────────────────────────────────────────────────

export default function Home() {
  const [parties, setParties] = useState<Partie[]>([]);
  const [loading, setLoading] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, "parties"),
      where("visibility", "==", "public"),
      where("status", "in", ["waiting", "active"]),
      limit(12)
    );

    const unsub = onSnapshot(q, (snap) => {
      setParties(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Partie[]);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  function scrollLeft() {
    trackRef.current?.scrollBy({ left: -300, behavior: "smooth" });
  }

  function scrollRight() {
    trackRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  }

  const now = new Date().toISOString().split("T")[0];
  const upcoming = parties.filter(p => !p.date || p.date >= now);
  const display  = parties;

  return (
    <Container id="home">
      <Content>
        <Image src="/images/logo.webp" alt="Logo de JDR Réunion" width={120} height={120} />
        <Title>JDR Réunion</Title>
        <Subtitle>
          Une communauté dédiée aux jeux de rôle, tournois et soirées jeux à La Réunion.
        </Subtitle>

        {/* ── Carrousel ── */}
        <CarouselSection>
          <CarouselHeader>
            <CarouselLabel>🎲 Campagnes & One-Shots</CarouselLabel>
            <CarouselNav>
              <NavBtn onClick={scrollLeft} aria-label="Précédent">‹</NavBtn>
              <NavBtn onClick={scrollRight} aria-label="Suivant">›</NavBtn>
            </CarouselNav>
          </CarouselHeader>

          <CarouselTrack ref={trackRef}>
            {loading && (
              <>
                <LoadingSlide>Chargement…</LoadingSlide>
                <LoadingSlide>Chargement…</LoadingSlide>
                <LoadingSlide>Chargement…</LoadingSlide>
              </>
            )}

            {!loading && display.length === 0 && (
              <EmptySlide>
                <span style={{ fontSize: "2rem" }}>🎲</span>
                Aucune partie pour le moment
              </EmptySlide>
            )}

            {!loading && display.map((p, i) => {
              const isUpcoming = !p.date || p.date >= now;
              return (
                <Slide key={p.id} href={`/parties/${p.id}`}>
                  <SlideImage $bg={p.image}>
                    <SlideBadge $type={p.type || "one-shot"}>
                      {p.type === "campagne" ? "📖 Campagne" : "⚡ One-Shot"}
                    </SlideBadge>
                  </SlideImage>
                  <SlideBody>
                    {p.systeme && <SlideSystem>{p.systeme}</SlideSystem>}
                    <SlideTitle>{p.titre}</SlideTitle>
                    <SlideMeta>
                      {p.date
                        ? `📅 ${isUpcoming ? "À venir · " : ""}${p.date}`
                        : "📅 Date à définir"}
                      {p.organisateur && ` · 🧙 ${p.organisateur}`}
                    </SlideMeta>
                  </SlideBody>
                </Slide>
              );
            })}
          </CarouselTrack>
        </CarouselSection>

        <Subtitle>
          Notre mission est de créer une communauté immersive où chacun peut explorer sa créativité et vivre des aventures uniques.
        </Subtitle>
      </Content>
    </Container>
  );
}