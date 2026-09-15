"use client";

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Container } from "@/components/Container";
import Link from "next/link";

const Content = styled.div`
  max-width: 1100px;
  padding: 1rem 1.5rem 2rem;
  text-align: center;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 0.75rem 1.25rem 1.5rem;
  }

  @media (max-width: 480px) {
    padding: 0.5rem 0.9rem 1rem;
  }
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;      /* garde le centrage horizontal du contenu */
  width: 100%;
  align-self: flex-start;   /* ← la clé : s'auto-aligne en haut, indépendamment du parent */
`;

const Eyebrow = styled.p`
  font-size: 0.8rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(212, 168, 83, 0.85);
  margin: 0 0 0.75rem;
`;

const Title = styled.h2`
  font-size: clamp(2rem, 5vw, 3rem);
  margin: 0 0 3rem;
  padding-top: 0.5rem;   /* ← remplace le margin-top, évite le collapse */
  line-height: 1.2;      /* ← légèrement augmenté pour ne pas rogner le haut des lettres */
  color: #fff;

  @media (max-width: 640px) {
    font-size: 2rem;
    margin-bottom: 4rem;
  }
`;

/* ---------- HERO : l'actu du moment ---------- */

const Hero = styled(Link)`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-start;
  min-width: 0;

  min-height: 340px;
  padding: 2.5rem;

  border-radius: 18px;
  overflow: hidden;
  isolation: isolate;

  text-align: left;
  text-decoration: none;
  color: inherit;

  margin-bottom: 1.25rem;

  border: 1px solid rgba(212, 168, 83, 0.35);

  @media (max-width: 768px) {
    min-height: 200px;
    padding: 1rem;
    border-radius: 14px;
    margin-bottom: 0.75rem;
  }

  @media (max-width: 480px) {
    min-height: 150px;
    padding: 0.75rem;
    border-radius: 11px;
    margin-bottom: 0.6rem;
  }

  @media (max-width: 360px) {
    min-height: 130px;
    padding: 0.6rem;
  }
`;
const HeroImage = styled.div<{ $image: string }>`
  position: absolute;
  inset: 0;

  background-image: url(${({ $image }) => $image});
  background-size: cover;
  background-position: center;

  transform: scale(1.02);
  z-index: -1;

  animation: heroFade 600ms ease;

  @keyframes heroFade {
    0% {
      opacity: 0.3;
      transform: scale(1.06);
    }

    100% {
      opacity: 1;
      transform: scale(1.02);
    }
  }

  ${Hero}:hover & {
    transform: scale(1.08);
  }
`;

const HeroOverlay = styled.div`
  position: absolute;
  inset: 0;

  background:
    linear-gradient(
      180deg,
      rgba(8, 8, 12, 0.05) 0%,
      rgba(8, 8, 12, 0.25) 30%,
      rgba(8, 8, 12, 0.88) 78%,
      rgba(8, 8, 12, 0.97) 100%
    );

  z-index: -1;

  @media (max-width: 640px) {
    background:
      linear-gradient(
        180deg,
        rgba(8, 8, 12, 0.05) 0%,
        rgba(8, 8, 12, 0.20) 25%,
        rgba(8, 8, 12, 0.72) 55%,
        rgba(8, 8, 12, 0.96) 100%
      );
  }
`;
const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0b0b0f;
  background: #d4a853;
  margin-bottom: 1rem;

  &::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #0b0b0f;
    opacity: 0.6;
  }
`;

const HeroTitle = styled.h3`
  font-size: clamp(1.4rem, 3vw, 2rem);
  font-weight: 600;
  margin: 0 0 0.7rem;
  color: #f5e6c8;

  @media (max-width: 640px) {
    font-size: 1.3rem;
    margin-bottom: 0.4rem;
    max-width: 100%;
  overflow-wrap: break-word;
  }
`;

const HeroDescription = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 1.25rem;
  line-height: 1.6;
  max-width: 560px;

  @media (max-width: 640px) {
    font-size: 0.78rem;
    line-height: 1.4;
    margin-bottom: 0.7rem;

    /* évite que la description fasse 4-5 lignes */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

const HeroMeta = styled.span`
  font-size: 0.85rem;
  color: rgba(212, 168, 83, 0.9);
  font-weight: 600;

  @media (max-width: 640px) {
    font-size: 0.72rem;
  }
`;



const CarouselDots = styled.div`
  position: absolute;
  bottom: 1.25rem;
  right: 1.5rem;
  display: flex;
  gap: 0.4rem;
  z-index: 5;
`;

const CarouselDot = styled.button<{ $active: boolean }>`
  width: ${({ $active }) => ($active ? "24px" : "7px")};
  height: 7px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  cursor: pointer;

  background: ${({ $active }) =>
    $active ? "#d4a853" : "rgba(255, 255, 255, 0.45)"};

  transition: all 250ms ease;
`;

/* ---------- GRILLE : les activités permanentes ---------- */

const SectionLabel = styled.h4`
  text-align: left;
  font-size: 1rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  margin: 0 0 1rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.25rem;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 1rem;
  }
`;

const Card = styled(Link)`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  min-width: 0;
  min-height: 240px;
  padding: 1.75rem;
  border-radius: 14px;
  overflow: hidden;
  isolation: isolate;
  text-align: left;
  text-decoration: none;
  color: inherit;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: border-color 250ms ease, transform 250ms ease;

  @media (hover: hover) {
    &:hover {
      border-color: rgba(212, 168, 83, 0.6);
      transform: translateY(-2px);
    }
  }

  &:active {
    transform: scale(0.99);
  }

  @media (max-width: 768px) {
    min-height: 140px;
    padding: 1rem;
    border-radius: 10px;
  }

  @media (max-width: 480px) {
    min-height: 110px;
    padding: 0.85rem;
  }

  
`;

const CardImage = styled.div<{ $image: string }>`
  position: absolute;
  inset: 0;
  background-image: url(${({ $image }) => $image});
  background-size: cover;
  background-position: center;
  opacity: 0;
  transform: scale(1.1);
  transition: opacity 400ms ease, transform 500ms ease;
  z-index: -2;

  @media (hover: hover) {
    ${Card}:hover & {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

const CardOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 12, 0.35) 0%,
    rgba(8, 8, 12, 0.85) 100%
  );
  opacity: 0;
  transition: opacity 400ms ease;
  z-index: -1;

  @media (hover: hover) {
    ${Card}:hover & {
      opacity: 1;
    }
  }
`;

const CardIcon = styled.span`
  font-size: 1.6rem;
  margin-bottom: 0.75rem;
  line-height: 1;
`;

const CardTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: #f0d9a6;

  @media (max-width: 640px) {
    font-size: 1.05rem;
    max-width: 100%;
  overflow-wrap: break-word;
  }
`;

const CardDescription = styled.p`
  font-size: 0.88rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 0.75rem;
  line-height: 1.55;
  transition: color 300ms ease;

  @media (hover: hover) {
    ${Card}:hover & {
      color: rgba(255, 255, 255, 0.92);
    }
  }

  @media (max-width: 640px) {
    font-size: 0.8rem;
  }
`;

const CardTag = styled.span`
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgba(212, 168, 83, 0.8);
  text-transform: uppercase;
`;

/* ---------- Contenu ---------- */

// Remplaçable plus tard par une requête Firestore ("événement du moment")
const featured = [
  {
    slug: "tournoi-dd-debutants",
    title: "Tournoi D&D Débutants",
    image: "/images/events/tournoi-dnd.jpg",
    badge: "Nouveauté",
    description:
      "Un tournoi Donjons & Dragons pensé pour les débutants, avec personnages pré-tirés ou création de personnage jusqu'au niveau 2.",
    meta: "Septembre 2026 · Inscriptions ouvertes",
  },
  {
    slug: "destruction-rage-room",
    title: "1 après-midi · 2 ambiances",
    image: "/images/events/destruction-rage.jpg",
    badge: "À venir",
    description:
      "Retrouvez JDR Réunion pour une nouvelle après-midi spéciale avec deux univers et deux ambiances à découvrir.",
    meta: "27 septembre · Saint-Pierre",
  },
  {
    slug: "cafe-roliste",
    title: "Café Rôliste",
    image: "/images/events/cafe-roliste.jpg",
    badge: "Nouveau",
    description:
      "Une rencontre conviviale pour découvrir le jeu de rôle, discuter, poser vos questions et pourquoi pas lancer votre première partie.",
    meta: "Le Tampon · Régulièrement",
  },
  {
    slug: "levasion",
    title: "L'Évasion — Escape Game au Kolkol",
    image: "/images/events/levasion.jpg",
    badge: "À venir",
    description:
      "Un escape game grandeur nature à Kolkol : énigmes, ambiance immersive et aventure pensée par l'association.",
    meta: "Le Tampon · Sur réservation",
  },
];

const sections = [
  {
    slug: "soirees-jdr",
    icon: "🎲",
    title: "Sessions JDR",
    image: "/images/events/soirees-jdr.jpg",
    tag: "Chaque semaine",
    description:
      "Des tables ouvertes à tous les niveaux pour partager des aventures inoubliables, dans une ambiance conviviale et sans jugement.",
  },
  {
    slug: "animations",
    icon: "✨",
    title: "Animations",
    image: "/images/events/initiations.jpg",
    tag: "Gratuit",
    description:
      "Découvrez le JDR en douceur avec nos initiations accompagnées par des MJ passionnés, dans un cadre bienveillant.",
  },
  {
    slug: "Ateliers",
    icon: "📜",
    title: "Ateliers",
    image: "/images/events/atelier.jpg",
    tag: "Ateliers ",
    description:
      "Des atreliers pour permettre ",
  },
  {
    slug: "levasion",
    icon: "🔐",
    title: "Escape Game",
    image: "/images/events/levasion.jpg",
    tag: "Au Kolkol",
    description:
      "L'Évasion : une expérience grandeur nature au Tampon, entre énigmes physiques et narration immersive.",
  },
];

export default function Events() {
  const [current, setCurrent] = useState(0);

  const touchStart = useRef(0);
  const touchEnd = useRef(0);

  const event = featured[current];

  // Défilement automatique toutes les 5 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % featured.length);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // Swipe
  const handleTouchStart = (e: React.TouchEvent<HTMLAnchorElement>) => {
  touchStart.current = e.touches[0].clientX;
};

const handleTouchEnd = (e: React.TouchEvent<HTMLAnchorElement>) => {
  touchEnd.current = e.changedTouches[0].clientX;

  const distance = touchStart.current - touchEnd.current;

  if (Math.abs(distance) > 50) {
    if (distance > 0) {
      setCurrent((prev) => (prev + 1) % featured.length);
    } else {
      setCurrent((prev) => (prev - 1 + featured.length) % featured.length);
    }
  }
};

   

  return (
    <Container id="events">
      <Wrapper>
      <Content>
        <Eyebrow>Vivre l'aventure</Eyebrow>

        <Title>Nos Activités</Title>

        <SectionLabel>À la une</SectionLabel>

        <Hero
          href={`/evenements/${event.slug}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <HeroImage $image={event.image} />
          <HeroOverlay />

          <Badge>{event.badge}</Badge>

          <HeroTitle>{event.title}</HeroTitle>

          <HeroDescription>
            {event.description}
          </HeroDescription>

          <HeroMeta>{event.meta} →</HeroMeta>

          <CarouselDots
            onClick={(e) => e.preventDefault()}
          >
            {featured.map((item, index) => (
              <CarouselDot
                key={item.slug}
                type="button"
                $active={index === current}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrent(index);
                }}
                aria-label={`Afficher ${item.title}`}
              />
            ))}
          </CarouselDots>
        </Hero>

        <SectionLabel>Toute l'année</SectionLabel>

        <Grid>
          {sections.map((section) => (
            <Card
              key={section.slug}
              href={`/evenements/${section.slug}`}
            >
              <CardImage $image={section.image} />
              <CardOverlay />

              <CardIcon>{section.icon}</CardIcon>

              <CardTitle>{section.title}</CardTitle>

              <CardDescription>
                {section.description}
              </CardDescription>

              <CardTag>{section.tag}</CardTag>
            </Card>
          ))}
        </Grid>
      </Content>
      </Wrapper>
    </Container>
  );
}