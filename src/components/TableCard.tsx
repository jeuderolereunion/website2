"use client";

import Link from "next/link";
import styled from "styled-components";
import { TableMJ, getInitiales, systemeHue } from "@/lib/jdr";

// Carte "de jeu" : portrait, plein cadre, une teinte propre à chaque système.
// Les places sont des sièges autour de la table : pleins = pris, vides = libres.

const Card = styled(Link)<{ $hue: number; $img?: string; $full: boolean }>`
  --h: ${p => p.$hue};
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  aspect-ratio: 3 / 4.2;
  padding: 1rem;
  border-radius: 18px 18px 18px 4px;
  text-decoration: none;
  color: #fff;
  overflow: hidden;
  isolation: isolate;
  background:
    linear-gradient(180deg, rgba(10,10,18,0.05) 25%, rgba(10,10,18,0.92) 82%),
    ${p => p.$img
      ? `url(${p.$img}) center/cover`
      : `linear-gradient(160deg, hsl(var(--h) 55% 30%), hsl(calc(var(--h) + 40) 50% 11%))`};
  box-shadow: inset 0 0 0 1px hsl(var(--h) 70% 70% / 0.35), 0 10px 30px rgba(0,0,0,0.35);
  filter: ${p => (p.$full ? "saturate(0.55)" : "none")};
  transition: transform 220ms ease, box-shadow 220ms ease;

  /* filet intérieur façon carte à collectionner */
  &::before {
    content: "";
    position: absolute;
    inset: 6px;
    border-radius: 13px 13px 13px 2px;
    border: 1px solid hsl(var(--h) 80% 80% / 0.25);
    pointer-events: none;
    z-index: 1;
  }
  &:hover, &:focus-visible {
    transform: translateY(-4px) rotate(-0.6deg);
    box-shadow: inset 0 0 0 1px hsl(var(--h) 80% 75% / 0.7), 0 16px 36px rgba(0,0,0,0.5);
    outline: none;
  }
  @media (hover: none), (prefers-reduced-motion: reduce) {
    &:hover, &:focus-visible { transform: none; }
  }
`;

// Initiale géante en filigrane quand il n'y a pas d'image
const Glyph = styled.span<{ $hue: number }>`
  position: absolute;
  right: -0.05em;
  top: -0.18em;
  font: 800 9rem/1 'Fraunces', Georgia, serif;
  color: hsl(${p => p.$hue} 70% 75% / 0.12);
  z-index: -1;
  user-select: none;
`;

const Top = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  z-index: 2;
`;

const Systeme = styled.span`
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(4px);
`;

const Age = styled.span<{ $adult: boolean }>`
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  background: ${p => (p.$adult ? "rgba(255,80,80,0.3)" : "rgba(255,180,60,0.3)")};
  color: ${p => (p.$adult ? "#ffb0b0" : "#ffd89a")};
`;

const Bottom = styled.div`
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`;

const Title = styled.h3`
  margin: 0;
  font: 700 1.25rem/1.15 'Fraunces', Georgia, serif;
`;

const Desc = styled.p`
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgba(255,255,255,0.72);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Facts = styled.div`
  display: flex;
  gap: 0.9rem;
  font-size: 0.74rem;
  color: rgba(255,255,255,0.65);
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding-top: 0.6rem;
  border-top: 1px solid hsl(var(--h) 60% 80% / 0.2);
`;

const Seats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
`;

const Seat = styled.i<{ $taken: boolean }>`
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 1.5px solid hsl(var(--h) 85% 78%);
  background: ${p => (p.$taken ? "hsl(var(--h) 85% 78%)" : "transparent")};
`;

const SeatLabel = styled.span`
  font-size: 0.72rem;
  font-weight: 600;
  margin-left: 0.35rem;
`;

const Mj = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  color: rgba(255,255,255,0.7);
  min-width: 0;
  & b {
    width: 22px; height: 22px; border-radius: 50%;
    display: grid; place-items: center; flex-shrink: 0;
    font-size: 0.58rem;
    background: hsl(var(--h) 70% 55% / 0.45);
  }
  & span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80px; }
`;

export default function TableCard({ table, href }: { table: TableMJ; href: string }) {
  const hue = systemeHue(table.systeme);
  const dispo = table.placesMax - (table.inscrits ?? 0);
  const full = dispo <= 0;
  const showPips = table.placesMax <= 10;

  return (
    <Card href={href} $hue={hue} $img={table.image || undefined} $full={full}
      aria-label={`Table de ${table.mjNom}, ${table.systeme}`}>
      {!table.image && <Glyph $hue={hue} aria-hidden>{(table.systeme || "?")[0]}</Glyph>}

      <Top>
        <Systeme>{table.systeme}</Systeme>
        {table.ageTag && table.ageTag !== "tous" && (
          <Age $adult={table.ageTag === "18"}>{table.ageTag}+</Age>
        )}
      </Top>

      <Bottom>
        <Title>Table de {table.mjNom}</Title>
        <Desc>{table.description}</Desc>
        <Facts>
          {table.duree && <span>⏱ {table.duree}</span>}
          {table.personnages && <span>{table.personnages === "pretires" ? "🧾 Prétirés" : "✏️ Création"}</span>}
        </Facts>
        <Footer>
          <Seats role="img" aria-label={full ? "Table complète" : `${dispo} places libres sur ${table.placesMax}`}>
            {showPips
              ? Array.from({ length: table.placesMax }, (_, i) => <Seat key={i} $taken={i < (table.inscrits ?? 0)} />)
              : <SeatLabel>{table.inscrits}/{table.placesMax}</SeatLabel>}
            <SeatLabel>{full ? "Complet" : `${dispo} libre${dispo > 1 ? "s" : ""}`}</SeatLabel>
          </Seats>
          <Mj><b>{getInitiales(table.mjNom)}</b></Mj>
        </Footer>
      </Bottom>
    </Card>
  );
}