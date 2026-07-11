"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styled from "styled-components";
import { Container } from '@/components/Container';

// About a un contenu de hauteur variable (liste d'événements + images) :
// on désactive le snap plein écran hérité de Container pour éviter le
// double-scroll (snap qui force à "entrer" dans la section avant de
// pouvoir la lire en entier).
const AboutContainer = styled(Container)`
  min-height: auto;
  height: auto;
  overflow: visible;
  scroll-snap-align: none;
  padding-top: 4rem;
  padding-bottom: 4rem;
`;

const CardThumbnail = styled.div<{ $src: string }>`
  width: 52px;
  height: 52px;
  border-radius: 10px;
  background: url(${p => p.$src}) center/cover;
  flex-shrink: 0;
  border: 0.5px solid rgba(255, 255, 255, 0.1);
`;

// Contour réel de l'île tracé à partir de données géographiques (littoral),
// projeté dans un viewBox respectant le vrai ratio largeur/hauteur de l'île.
const REUNION_PATH =
  "M 367.2 165.6 L 371.7 170.7 L 358.0 185.7 L 375.7 175.1 L 380.4 184.1 L 383.7 186.6 L 393.1 186.9 L 398.2 191.3 L 398.5 193.6 L 411.5 199.6 L 412.1 204.8 L 417.2 211.9 L 415.5 215.1 L 415.6 220.2 L 418.0 227.3 L 414.0 229.7 L 411.0 229.2 L 409.8 232.2 L 410.4 239.4 L 408.0 244.4 L 402.7 249.4 L 402.3 254.4 L 399.2 258.7 L 399.1 264.5 L 394.6 281.0 L 396.7 290.5 L 396.2 295.9 L 398.8 301.3 L 396.9 305.8 L 396.3 315.0 L 397.4 329.1 L 400.2 332.4 L 398.5 336.2 L 391.5 346.2 L 376.4 357.5 L 365.2 354.7 L 358.8 358.8 L 347.0 359.5 L 338.3 363.7 L 327.6 364.7 L 316.0 363.0 L 312.3 364.0 L 312.5 366.3 L 307.8 369.7 L 302.3 368.7 L 291.1 374.0 L 288.3 370.1 L 283.4 368.6 L 267.5 372.2 L 262.5 370.0 L 259.2 366.1 L 254.1 364.6 L 251.7 361.1 L 241.9 364.5 L 230.8 360.8 L 227.7 363.0 L 226.2 359.7 L 219.9 355.7 L 210.2 353.7 L 198.3 348.9 L 196.5 346.8 L 191.4 345.8 L 183.8 347.1 L 181.4 343.9 L 180.0 344.6 L 181.3 343.5 L 179.7 341.6 L 180.1 342.9 L 177.5 343.1 L 177.6 342.0 L 167.7 339.7 L 163.7 334.5 L 164.3 332.7 L 162.3 331.4 L 161.5 332.5 L 160.1 330.3 L 147.1 328.8 L 138.7 323.9 L 133.5 315.6 L 122.5 305.2 L 102.7 298.7 L 90.1 296.8 L 89.4 298.0 L 84.8 294.6 L 82.6 290.8 L 84.4 288.9 L 81.1 280.3 L 75.3 276.8 L 75.2 274.2 L 70.4 271.3 L 67.3 266.9 L 56.6 260.1 L 52.1 245.8 L 48.4 241.5 L 50.2 239.4 L 52.3 230.7 L 52.7 211.8 L 49.5 206.6 L 42.9 203.7 L 41.3 190.2 L 30.2 177.8 L 31.1 175.4 L 17.0 163.4 L 9.7 153.8 L 8.5 147.6 L 10.9 135.6 L 6.0 125.1 L 11.9 116.2 L 18.5 109.9 L 27.1 111.1 L 33.8 107.8 L 40.7 102.9 L 46.8 95.8 L 49.7 77.5 L 46.0 66.4 L 48.6 61.4 L 50.9 44.4 L 54.1 42.3 L 63.9 46.7 L 74.0 45.4 L 74.3 48.3 L 71.1 49.7 L 78.0 51.2 L 78.1 47.0 L 76.5 46.7 L 76.1 44.7 L 79.5 46.2 L 91.3 41.5 L 95.9 34.3 L 103.2 30.4 L 107.9 25.0 L 117.8 19.4 L 124.4 13.1 L 143.6 7.7 L 155.1 9.3 L 161.3 6.0 L 172.5 14.1 L 176.8 15.5 L 187.0 16.1 L 197.3 13.7 L 219.4 20.1 L 221.8 22.3 L 227.9 23.0 L 232.5 20.0 L 241.1 20.9 L 249.1 24.5 L 256.4 23.5 L 273.8 33.4 L 291.5 36.7 L 303.8 43.8 L 307.0 49.0 L 315.3 56.6 L 326.0 74.4 L 327.0 80.0 L 326.0 81.6 L 315.5 84.2 L 315.7 85.7 L 323.5 84.7 L 327.3 86.4 L 328.9 109.4 L 332.2 116.5 L 337.3 118.7 L 337.4 121.3 L 339.4 120.1 L 344.8 129.3 L 348.5 132.1 L 347.7 138.3 L 348.9 141.7 L 367.2 165.6 Z";

type EventSpot = {
  id: string;
  slug: string;   // ← doit être présent
  name: string;
  venue: string;
  city: string;
  address: string;
  schedule: string;
  tag: string;
  description: string;
  image: string;
  x: number;
  y: number;
};

// URL unique vers laquelle le bouton "S'inscrire" de chaque événement renvoie.
const REGISTRATION_HREF = "/evenements/animations";

// Coordonnées projetées à partir des positions GPS réelles de chaque lieu,
// sur le même repère que REUNION_PATH.
// ⚠️ Placer les photos correspondantes dans /public/images/events/.
const EVENTS: EventSpot[] = [
  {
    id: "st-paul",
    slug: "3brasseurs",     // ← doit correspondre exactement à la clé dans lib/lieux.ts
    name: "Soirée JDR aux 3 Brasseurs",
    venue: "3 Brasseurs",
    city: "Saint-Paul",
    address: "Front de mer, Saint-Paul",
    schedule: "Tous les dimanches",
    tag: "Ambiance brasserie",
    description: "...",
    image: "/images/3-brasseurs.jpeg",
    x: 42.0,
    y: 104.1,
  },
  {
    id: "st-leu",
    slug: "la-kour",        // ← idem
    name: "Rencontre JDR à La Kour",
    venue: "La Kour",
    city: "Saint-Leu",
    address: "La Kour, Saint-Leu",
    schedule: "Tous les mercredis soirs",
    tag: "Découverte",
    description: "...",
    image: "/images/LaKourcaferoliste.png",
    x: 54.7,
    y: 218.4,
  },
  {
    id: "tampon",
    slug: "qg-tampon",      // ← idem
    name: "QG de l'association",
    venue: "Local JDR Réunion",
    city: "Le Tampon",
    address: "Le Tampon",
    schedule: "Permanence hebdomadaire",
    tag: "Notre QG",
    description: "...",
    image: "/images/qg-tampon.png",
    x: 204.5,
    y: 294.3,
  },
];

const Content = styled.div`
  max-width: 1100px;
  width: 100%;
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  box-sizing: border-box;

  @media (max-width: 480px) {
    padding: 0 1rem;
  }
`;

const Title = styled.h2`
  font-size: clamp(1.5rem, 6vw, 2.5rem);
  margin: 0 0 0.5rem;
  text-align: center;
`;



const Subtitle = styled.p`
  margin: 0 0 1.5rem;
  font-size: clamp(0.9rem, 3.2vw, 1.1rem);
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  max-width: min(640px, 100%);
  overflow-wrap: break-word;
`;

const MapLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 480px) minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
  justify-content: center;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 860px) {
    grid-template-columns: minmax(0, 1fr);
    justify-items: stretch;
    gap: 1.25rem;
  }
`;

const MapWrapper = styled.div`
  position: relative;
  width: 100%;
  max-width: 480px;

  @media (max-width: 860px) {
    max-width: 420px;
    margin: 0 auto;
  }

  @media (max-width: 480px) {
    max-width: 100%;
  }
`;

const IslandSvg = styled.svg`
  width: 100%;
  height: auto;
  display: block;
`;

const IslandShape = styled.path`
  fill: rgba(255, 255, 255, 0.07);
  stroke: rgba(255, 255, 255, 0.3);
  stroke-width: 1.5;
  stroke-linejoin: round;
`;

// Pin redevient un simple <g> cliquable qui ne fait que toggler la
// FloatingCard (pas de navigation directe).
const Pin = styled.g<{ $active: boolean }>`
  cursor: pointer;

  circle.halo {
    fill: rgba(255, 255, 255, 0.15);
    transform-origin: center;
    transform: scale(${({ $active }) => ($active ? 1.8 : 1)});
    transition: transform 0.25s ease;
  }

  circle.dot {
    fill: ${({ $active }) => ($active ? "#ffffff" : "rgba(255,255,255,0.75)")};
    transition: fill 0.2s ease;
  }

  text {
    fill: rgba(255, 255, 255, 0.85);
    font-size: 12px;
    font-weight: ${({ $active }) => ($active ? 700 : 400)};
    pointer-events: none;
  }

  &:hover circle.dot {
    fill: #ffffff;
  }

  &:focus-visible {
    outline: none;
  }

  &:focus-visible circle.halo {
    fill: rgba(255, 255, 255, 0.3);
  }
`;

const EventGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
  min-width: 0;
`;

// Card redevenue un simple bouton (toggle de la FloatingCard). La
// navigation se fait uniquement via le bouton "S'inscrire" à l'intérieur.
const EventCard = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.65rem 0.85rem;
  border-radius: 12px;
  text-align: left;
  border: 1px solid
    ${({ $active }) => ($active ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.1)")};
  background: ${({ $active }) => ($active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)")};
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s ease;
  width: 100%;
  box-sizing: border-box;

  &:hover {
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.06);
    transform: translateY(-1px);
  }

  &:focus-visible {
    border-color: rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.08);
  }

  @media (hover: none) {
    &:hover { transform: none; }
  }

  @media (max-width: 860px) {
    padding: 0.75rem 0.9rem;
  }
`;

const CardMain = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  overflow: hidden;
  flex: 1;
`;

const CardTextCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
`;

const CardNameRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
`;

const ScheduleRow = styled.span`
  font-size: 0.72rem;
  color: rgba(160, 120, 255, 0.85);
  display: flex;
  align-items: center;
  gap: 0.3rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const EventName = styled.span`
  font-weight: 600;
  font-size: 0.85rem;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const EventCity = styled.span`
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  flex-shrink: 0;
`;

const CardRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-end;
    gap: 0.35rem;
  }
`;

const Tag = styled.span`
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.75);
  white-space: nowrap;
  flex-shrink: 0;
`;

// Bouton "S'inscrire" — seul élément de la card qui navigue réellement.
// stopPropagation pour éviter de déclencher aussi le toggle du parent.
const RegisterLink = styled(Link)`
  all: unset;
  cursor: pointer;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #111;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.2s ease, transform 0.15s ease;

  &:hover {
    background: #ffffff;
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.6);
    outline-offset: 2px;
  }
`;

// Card flottante affichée sur la carte au survol/sélection d'un point.
// Positionnée en pourcentage par rapport au viewBox de l'île.
// Sur petits écrans (téléphone/tablette), la carte fait presque toute la
// largeur du MapWrapper et se recentre horizontalement plutôt que de se
// coller au point, pour ne jamais déborder de l'écran.
const FloatingCard = styled.div<{ $x: number; $y: number }>`
  position: absolute;
  left: ${({ $x }) => ($x / 424) * 100}%;
  top: ${({ $y }) => ($y / 380) * 100}%;
  transform: translate(-50%, -50%)
    translate(${({ $x }) => ($x > 212 ? "calc(-100% - 22px)" : "22px")}, -50%);
  width: 210px;
  max-width: calc(100vw - 4rem);
  background: rgba(20, 20, 24, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  z-index: 5;
  animation: floatIn 0.15s ease;

  @keyframes floatIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* Tablette : carte un peu plus large, on garde le positionnement à
     côté du point mais avec une marge de sécurité plus généreuse. */
  @media (max-width: 860px) {
    width: 190px;
    max-width: calc(100vw - 3rem);
  }

  /* Téléphone : plus de logique gauche/droite basée sur $x (trop de
     risques de déborder sur les petits viewports) — la carte se centre
     horizontalement au-dessus ou en dessous du point à la place. */
  @media (max-width: 480px) {
    left: 50%;
    top: ${({ $y }) => ($y / 380) * 100}%;
    width: min(85vw, 280px);
    max-width: none;
    transform: translate(-50%, ${({ $y }) => ($y < 190 ? "18px" : "calc(-100% - 18px)")});

    @keyframes floatIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  }
`;

const FloatingThumbnail = styled.div`
  position: relative;
  width: 100%;
  height: 90px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);

  img {
    object-fit: cover;
  }

  @media (max-width: 480px) {
    height: 110px;
  }
`;

const FloatingName = styled.div`
  font-weight: 700;
  font-size: 0.85rem;
  color: #fff;

  @media (max-width: 480px) {
    font-size: 0.95rem;
  }
`;

const FloatingMeta = styled.div`
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.55);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;

  @media (max-width: 480px) {
    font-size: 0.78rem;
  }
`;

const FloatingDescription = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;

  @media (max-width: 480px) {
    font-size: 0.82rem;
    -webkit-line-clamp: 4;
  }
`;

// Bouton "S'inscrire" dans la card flottante. pointer-events: auto pour
// rester cliquable malgré le pointer-events: none du parent FloatingCard.
const FloatingRegisterLink = styled(Link)`
  all: unset;
  cursor: pointer;
  pointer-events: auto;
  align-self: flex-start;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #111;
  transition: background 0.2s ease, transform 0.15s ease;

  &:hover {
    background: #ffffff;
    transform: translateY(-1px);
  }
`;

const Footer = styled.footer`
  margin-top: 1.5rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
`;

export default function About() {
  const [activeId, setActiveId] = useState<string>(EVENTS[0].id);
  // hoveredId : distinct de activeId pour ne montrer la card flottante
  // que pendant un survol réel du point sur la carte (pas juste au clic).
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const floatingEvent = EVENTS.find((e) => e.id === hoveredId);

  return (
    <AboutContainer id="about">
      <Content>
        <Title>Nos évènements</Title>
        <Subtitle>
          JDR Réunion est une association loi 1901 dédiée aux jeux de rôle sur table à
          La Réunion. Retrouvez-nous à ces trois lieux, aux quatre coins de l&apos;île.
        </Subtitle>

        <MapLayout>
          <MapWrapper>
            <IslandSvg viewBox="0 0 424 380" xmlns="http://www.w3.org/2000/svg">
              <IslandShape d={REUNION_PATH} />

              {EVENTS.map((event) => (
                <Pin
                  key={event.id}
                  $active={activeId === event.id}
                  onMouseEnter={() => {
                    setActiveId(event.id);
                    setHoveredId(event.id);
                  }}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => {
                    setActiveId(event.id);
                    setHoveredId((current) => (current === event.id ? null : event.id));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveId(event.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${event.venue} — ${event.city}`}
                  aria-pressed={activeId === event.id}
                >
                  <circle className="halo" cx={event.x} cy={event.y} r="9" />
                  <circle className="dot" cx={event.x} cy={event.y} r="4.5" />
                  <text x={event.x + 10} y={event.y + 4}>
                    {event.city}
                  </text>
                </Pin>
              ))}
            </IslandSvg>

            {floatingEvent && (
              <FloatingCard $x={floatingEvent.x} $y={floatingEvent.y}>
                <FloatingThumbnail>
                  <Image
                    src={floatingEvent.image}
                    alt={`${floatingEvent.venue} — ${floatingEvent.city}`}
                    fill
                    sizes="210px"
                  />
                </FloatingThumbnail>
                <FloatingName>{floatingEvent.name}</FloatingName>
                <FloatingMeta>
                  <span>📍 {floatingEvent.venue} — {floatingEvent.city}</span>
                  <span>🗓️ {floatingEvent.schedule}</span>
                </FloatingMeta>
                <FloatingDescription>{floatingEvent.description}</FloatingDescription>
                <FloatingRegisterLink href={`/evenements/animations/${floatingEvent.slug}`}>
  S&apos;inscrire
</FloatingRegisterLink>
              </FloatingCard>
            )}
          </MapWrapper>

          <EventGrid>
  {EVENTS.map((event) => (
    <EventCard
      key={event.id}
      type="button"
      $active={activeId === event.id}
      onMouseEnter={() => {
        setActiveId(event.id);
        setHoveredId(event.id);
      }}
      onMouseLeave={() => setHoveredId(null)}
      onClick={() => {
        setActiveId(event.id);
        setHoveredId((current) => (current === event.id ? null : event.id));
      }}
      aria-pressed={activeId === event.id}
    >
      <CardMain>
        <CardThumbnail $src={event.image} />
        <CardTextCol>
          <CardNameRow>
            <EventName>{event.name}</EventName>
            <EventCity>· {event.city}</EventCity>
          </CardNameRow>
          <ScheduleRow>🗓️ {event.schedule}</ScheduleRow>
        </CardTextCol>
      </CardMain>
      <CardRight>
        <Tag>{event.tag}</Tag>
        <RegisterLink
          href={`/evenements/animations/${event.slug}`}
          onClick={(e) => e.stopPropagation()}
        >
          S&apos;inscrire
        </RegisterLink>
      </CardRight>
    </EventCard>
  ))}
</EventGrid>
        </MapLayout>

        <Footer>© {new Date().getFullYear()} JDR Réunion — Association loi 1901</Footer>
      </Content>
    </AboutContainer>
  );
}