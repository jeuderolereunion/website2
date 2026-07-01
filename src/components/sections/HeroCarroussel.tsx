"use client";

import { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import Link from "next/link";
import { Container } from '@/components/Container';

const trailers = [
  {
    id: 1,
    title: "Bienvenue chez JDR Réunion",
    subtitle: "Découvrez notre communauté de joueurs de rôle à La Réunion",
    image: "/images/Carroussel1.png",
    link: "/presentation",
  },
  {
    id: 2,
    title: "Un film une série un scénario",
    subtitle: "Mario,Le Silo et bien plus encore ",
    image: "/images/Carroussel2.png",
    link: "/evenements/soirees-jdr",
  },
  {
    id: 3,
    title: "Tournois & Événements",
    subtitle: "Rencontrez d'autres passionnés et vivez l'aventure",
    image: "/images/banner3.webp",
    link: "/evenements/tournois",
  },
];

// Seuil minimum (en px) de déplacement horizontal pour considérer un swipe
// comme intentionnel, plutôt qu'un simple tap ou un scroll vertical.
const SWIPE_THRESHOLD = 50;

const Hero = styled.section`
  position: relative;
  width: 100%;
  height: 750px;
  overflow: hidden;
  border-radius: 20px;
  /* Empêche le navigateur d'intercepter le geste horizontal pour scroller
     la page (le swipe doit rester dédié au changement de slide). */
  touch-action: pan-y;

  @media (max-width: 1024px) {
    height: 560px;
    border-radius: 14px;
  }

  @media (max-width: 768px) {
    height: 480px;
    border-radius: 10px;
  }

  @media (max-width: 400px) {
    height: 420px;
    border-radius: 8px;
  }
`;

const Slide = styled.div<{ $image: string; $active: boolean }>`
  position: absolute;
  inset: 0;
  opacity: ${(p) => (p.$active ? 1 : 0)};
  transition: opacity 0.8s ease;
  background:
    linear-gradient(
      rgba(0, 0, 0, 0.35),
      rgba(0, 0, 0, 0.8)
    ),
    url(${(p) => p.$image});
  background-size: cover;
  background-position: center;
`;

const Content = styled.div`
  position: absolute;
  left: 60px;
  bottom: 80px;
  max-width: 650px;
  z-index: 2;

  @media (max-width: 1024px) {
    left: 40px;
    right: 40px;
    bottom: 64px;
    max-width: none;
  }

  @media (max-width: 768px) {
    left: 20px;
    right: 20px;
    bottom: 56px;
  }

  @media (max-width: 400px) {
    left: 16px;
    right: 16px;
    bottom: 48px;
  }
`;

const Title = styled.h2`
  font-size: clamp(1.5rem, 6vw, 4rem);
  color: white;
  margin: 0 0 0.6rem;
  line-height: 1.15;

  @media (max-width: 768px) {
    margin: 0 0 0.5rem;
  }
`;

const Subtitle = styled.p`
  font-size: clamp(0.85rem, 2.5vw, 1.1rem);
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 1.25rem;

  @media (max-width: 400px) {
    margin-bottom: 1rem;
  }
`;

const Button = styled(Link)`
  display: inline-block;
  padding: 12px 24px;
  border-radius: 12px;
  background: var(--theme-color-gold);
  color: black;
  text-decoration: none;
  font-weight: 700;
  transition: transform 0.2s ease;
  font-size: 0.9rem;

  &:hover {
    transform: translateY(-2px);
  }

  @media (max-width: 400px) {
    padding: 10px 20px;
    font-size: 0.85rem;
  }
`;

const Controls = styled.div`
  position: absolute;
  right: 25px;
  bottom: 25px;
  display: flex;
  gap: 10px;
  z-index: 5;

  /* Sur téléphone, on retire les flèches : la navigation se fait au swipe. */
  @media (max-width: 768px) {
    display: none;
  }
`;

const NavButton = styled.button`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  background: rgba(255,255,255,0.85);

  &:hover {
    background: white;
  }

  @media (max-width: 1024px) {
    width: 36px;
    height: 36px;
    font-size: 0.9rem;
  }
`;

const Dots = styled.div`
  position: absolute;
  left: 50%;
  bottom: 35px;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 5;

  @media (max-width: 768px) {
    bottom: 20px;
    gap: 8px;
  }
`;

const Dot = styled.button<{ $active: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: ${(p) =>
    p.$active
      ? "white"
      : "rgba(255,255,255,0.4)"};
  transition: all 0.2s ease;

  @media (max-width: 768px) {
    width: 8px;
    height: 8px;
  }
`;

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);

  // ── Swipe tactile (mobile/tablette) ─────────────────────────────────────
  // On ne stocke que les coordonnées de départ/arrivée du geste, puis on
  // compare au relâchement (touchend) pour décider next/prev.
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX   = useRef<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % trailers.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const next = () => {
    setCurrent((prev) => (prev + 1) % trailers.length);
  };

  const prev = () => {
    setCurrent((prev) =>
      prev === 0 ? trailers.length - 1 : prev - 1
    );
  };

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = null;
  }

  function handleTouchMove(e: React.TouchEvent) {
    touchEndX.current = e.touches[0].clientX;
  }

  function handleTouchEnd() {
    if (touchStartX.current === null || touchEndX.current === null) return;

    const deltaX = touchStartX.current - touchEndX.current;

    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX > 0) {
        next(); // swipe vers la gauche → slide suivante
      } else {
        prev(); // swipe vers la droite → slide précédente
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
  }

  return (
    <Container id="home">
      <Hero
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {trailers.map((slide, index) => (
          <Slide
            key={slide.id}
            $image={slide.image}
            $active={index === current}
          >
            {index === current && (
              <Content>
                <Title>{slide.title}</Title>
                <Subtitle>
                  {slide.subtitle}
                </Subtitle>
                <Button href={slide.link}>
                  Découvrir
                </Button>
              </Content>
            )}
          </Slide>
        ))}

        <Dots>
          {trailers.map((_, index) => (
            <Dot
              key={index}
              $active={index === current}
              onClick={() => setCurrent(index)}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </Dots>

        {/* Flèches conservées sur tablette/desktop, masquées sur téléphone
            (voir media query dans Controls) au profit du swipe tactile. */}
        <Controls>
          <NavButton
            type="button"
            onClick={prev}
            aria-label="Précédent"
          >
            ←
          </NavButton>
          <NavButton
            type="button"
            onClick={next}
            aria-label="Suivant"
          >
            →
          </NavButton>
        </Controls>
      </Hero>
    </Container>
  );
}