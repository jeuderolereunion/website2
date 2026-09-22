"use client";

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Container } from "@/components/Container";
import Link from "next/link";

/* ---------- Design tokens (section Hero) ----------
   Palette "grimoire" : fond encre, laiton mat, grenat en accent rare.
   Voir la proposition de design validée pour le détail des rôles. */
const colors = {
  ink: "#0B0D12",
  surface: "#161B24",
  brass: "#C9A25D",
  garnet: "#7A2E2E",
  parchment: "#E8DCC0",
  text: "#F2EFE9",
  textMuted: "rgba(242, 239, 233, 0.72)",
};

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
  align-items: center;
  width: 100%;
  align-self: flex-start;
`;

const Eyebrow = styled.p`
  font-size: 0.85rem;
  color: ${colors.brass};
  margin: 0 0 0.75rem;
`;

const Title = styled.h2`
  font-family: var(--font-fraunces, Georgia, serif);
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 600;
  margin: 0 0 3rem;
  padding-top: 0.5rem;
  line-height: 1.2;
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

  border: 1px solid rgba(201, 162, 93, 0.35);

  @media (max-width: 768px) {
    min-height: 220px;
    padding: 1.25rem;
    border-radius: 14px;
    margin-bottom: 0.75rem;
  }

  @media (max-width: 480px) {
    min-height: 170px;
    padding: 1rem;
    border-radius: 11px;
    margin-bottom: 0.6rem;
  }

  @media (max-width: 360px) {
    min-height: 150px;
    padding: 0.85rem;
  }
`;

const HeroImage = styled.div<{ $image: string }>`
  position: absolute;
  inset: 0;

  background-image: url(${({ $image }) => $image});
  background-size: cover;
  background-position: center;

  transform: scale(1.02);
  z-index: -2;

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

/* Grain léger + dégradé encre : le "moment fort" de la page, concentré
   ici plutôt que dispersé sur chaque carte de la grille. */
const HeroOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: -1;

  background:
    linear-gradient(
      180deg,
      rgba(11, 13, 18, 0.10) 0%,
      rgba(11, 13, 18, 0.30) 30%,
      rgba(11, 13, 18, 0.90) 78%,
      rgba(11, 13, 18, 0.97) 100%
    );

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    opacity: 0.5;
    mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E");
  }

  @media (max-width: 640px) {
    background:
      linear-gradient(
        180deg,
        rgba(11, 13, 18, 0.10) 0%,
        rgba(11, 13, 18, 0.25) 25%,
        rgba(11, 13, 18, 0.78) 55%,
        rgba(11, 13, 18, 0.96) 100%
      );
  }
`;

/* La couleur porte le sens (laiton = nouveauté, grenat = à venir)
   plutôt que des majuscules trackées. */
const Badge = styled.span<{ $variant: "brass" | "garnet" }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ $variant }) => ($variant === "garnet" ? colors.parchment : "#1a1305")};
  background: ${({ $variant }) => ($variant === "garnet" ? colors.garnet : colors.brass)};
  margin-bottom: 1rem;

  &::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.55;
  }
`;

const HeroTitle = styled.h3`
  font-family: var(--font-fraunces, Georgia, serif);
  font-size: clamp(1.5rem, 3.2vw, 2.1rem);
  font-weight: 600;
  margin: 0 0 0.7rem;
  color: ${colors.parchment};

  @media (max-width: 640px) {
    font-size: 1.4rem;
    margin-bottom: 0.4rem;
    max-width: 100%;
    overflow-wrap: break-word;
  }
`;

const HeroDescription = styled.p`
  font-size: 1rem;
  color: ${colors.textMuted};
  margin: 0 0 1.25rem;
  line-height: 1.6;
  max-width: 560px;

  @media (max-width: 640px) {
    font-size: 0.78rem;
    line-height: 1.4;
    margin-bottom: 0.7rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

const HeroMeta = styled.span`
  font-size: 0.85rem;
  color: ${colors.brass};
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
  gap: 0.5rem;
  z-index: 5;
`;

/* Indicateur en forme de dé (hexagone façon face de d6) plutôt que des
   points neutres : encode l'identité JDR dès le premier écran. */
const CarouselDot = styled.button<{ $active: boolean }>`
  width: 16px;
  height: 16px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 100%;
    height: 100%;
    transition: all 250ms ease;
  }

  polygon {
    fill: ${({ $active }) => (active_fill($active))};
    stroke: ${({ $active }) =>
      $active ? colors.brass : "rgba(255, 255, 255, 0.45)"};
    stroke-width: ${({ $active }) => ($active ? 0 : 1.5)};
    transition: all 250ms ease;
  }
`;

function active_fill(active: boolean) {
  return active ? colors.brass : "transparent";
}

const HexIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" />
  </svg>
);

/* ---------- GRILLE : les activités permanentes ---------- */

const SectionLabel = styled.h4`
  text-align: left;
  font-size: 1rem;
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
      border-color: rgba(201, 162, 93, 0.6);
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
    rgba(11, 13, 18, 0.35) 0%,
    rgba(11, 13, 18, 0.85) 100%
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
  color: ${colors.parchment};

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
  font-size: 0.78rem;
  font-weight: 600;
  color: ${colors.brass};
`;

/* ---------- Contenu ---------- */

const featured = [
  {
    slug: "tournoi-dd-debutants",
    title: "Tournoi D&D Débutants",
    image: "/images/events/tournoi-dnd.jpg",
    badge: "Nouveauté",
    badgeVariant: "brass" as const,
    description:
      "Un tournoi Donjons & Dragons pensé pour les débutants, avec personnages pré-tirés ou création de personnage jusqu'au niveau 2.",
    meta: "Septembre 2026 — inscriptions ouvertes",
  },
  {
    slug: "animations/destruction-room",
    title: "1 après-midi, 2 ambiances",
    image: "/images/events/destruction-rage.jpg",
    badge: "À venir",
    badgeVariant: "garnet" as const,
    description:
      "Retrouvez JDR Réunion pour une nouvelle après-midi spéciale avec deux univers et deux ambiances à découvrir.",
    meta: "27 septembre, Saint-Pierre",
  },
  {
    slug: "cafe-roliste",
    title: "Café Rôliste",
    image: "/images/events/cafe-roliste.jpg",
    badge: "Nouveau",
    badgeVariant: "brass" as const,
    description:
      "Une rencontre conviviale pour découvrir le jeu de rôle, discuter, poser vos questions et pourquoi pas lancer votre première partie.",
    meta: "Le Tampon, régulièrement",
  },
  {
    slug: "levasion",
    title: "L'Évasion — Escape Game au Kolkol",
    image: "/images/events/levasion.jpg",
    badge: "À venir",
    badgeVariant: "garnet" as const,
    description:
      "Un escape game grandeur nature à Kolkol : énigmes, ambiance immersive et aventure pensée par l'association.",
    meta: "Le Tampon, sur réservation",
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
    tag: "Ateliers",
    description: "Des ateliers pour permettre",
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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % featured.length);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

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
          <Eyebrow>Vivre l&apos;aventure</Eyebrow>

          <Title>Nos Activités</Title>

          <SectionLabel>À la une</SectionLabel>

          <Hero
            href={`/evenements/${event.slug}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <HeroImage $image={event.image} />
            <HeroOverlay />

            <Badge $variant={event.badgeVariant}>{event.badge}</Badge>

            <HeroTitle>{event.title}</HeroTitle>

            <HeroDescription>{event.description}</HeroDescription>

            <HeroMeta>{event.meta}</HeroMeta>

            <CarouselDots onClick={(e) => e.preventDefault()}>
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
                >
                  <HexIcon />
                </CarouselDot>
              ))}
            </CarouselDots>
          </Hero>

          <SectionLabel>Toute l&apos;année</SectionLabel>

          <Grid>
            {sections.map((section) => (
              <Card key={section.slug} href={`/evenements/${section.slug}`}>
                <CardImage $image={section.image} />
                <CardOverlay />

                <CardIcon>{section.icon}</CardIcon>

                <CardTitle>{section.title}</CardTitle>

                <CardDescription>{section.description}</CardDescription>

                <CardTag>{section.tag}</CardTag>
              </Card>
            ))}
          </Grid>
        </Content>
      </Wrapper>
    </Container>
  );
}