"use client";

import Link from "next/link";
import styled from "styled-components";
import { EventDoc, cheminAnimation, systemeHue } from "@/lib/jdr";

// Carte d'animation pour l'accueil et les listes : toute la carte est cliquable
// et mène à la page de l'animation (détails + inscription). Le lien est porté
// par le titre ("stretched link") : un seul lien, accessible au clavier.

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

const Card = styled.article<{ $hue: number }>`
  --h: ${p => p.$hue};
  position: relative; display: flex; flex-direction: column; overflow: hidden;
  border-radius: 16px; background: rgba(255,255,255,0.04);
  border: 1px solid hsl(var(--h) 60% 70% / 0.25);
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
  &:hover, &:focus-within {
    transform: translateY(-3px); background: rgba(255,255,255,0.07);
    border-color: hsl(var(--h) 80% 75% / 0.6);
  }
  @media (hover: none), (prefers-reduced-motion: reduce) {
    &:hover, &:focus-within { transform: none; }
  }
`;

const Cover = styled.div<{ $img?: string }>`
  position: relative; min-height: 130px;
  background:
    linear-gradient(180deg, rgba(13,13,20,0.05) 30%, rgba(13,13,20,0.55) 100%),
    ${p => p.$img
      ? `url(${p.$img}) center/cover`
      : `linear-gradient(150deg, hsl(var(--h) 55% 30%), hsl(calc(var(--h) + 40) 50% 12%))`};
`;

const DateBadge = styled.div`
  position: absolute; top: 0.75rem; left: 0.75rem; min-width: 52px; padding: 0.4rem 0.5rem;
  text-align: center; border-radius: 12px; background: rgba(13,13,20,0.82);
  backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.14);
  & b { display: block; font: 800 1.5rem/1 'Fraunces', Georgia, serif; }
  & span { font-size: 0.68rem; color: rgba(255,255,255,0.7); }
`;

const Places = styled.span<{ $level: "ok" | "low" | "full" }>`
  position: absolute; top: 0.75rem; right: 0.75rem; font-size: 0.72rem; font-weight: 700;
  padding: 3px 10px; border-radius: 999px; backdrop-filter: blur(4px);
  background: ${p => p.$level === "full" ? "rgba(255,80,80,0.25)" : p.$level === "low" ? "rgba(255,170,0,0.25)" : "rgba(80,200,120,0.25)"};
  color: ${p => p.$level === "full" ? "#ffb0b0" : p.$level === "low" ? "#ffd48a" : "#9affc0"};
`;

const Body = styled.div`display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem 1.1rem 1.1rem; flex: 1;`;

const TitleLink = styled(Link)`
  color: #fff; text-decoration: none; font: 700 1.1rem/1.25 'Fraunces', Georgia, serif;
  /* étire le lien sur toute la carte */
  &::after { content: ""; position: absolute; inset: 0; border-radius: 16px; }
  &:focus-visible { outline: none; }
  &:focus-visible::after { outline: 2px solid #fff; outline-offset: -3px; }
`;

const Pitch = styled.p`
  margin: 0; font-size: 0.84rem; line-height: 1.5; color: rgba(255,255,255,0.65);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
`;

const Meta = styled.p`margin: 0; font-size: 0.78rem; color: rgba(255,255,255,0.5);`;

const Cta = styled.span`
  margin-top: auto; padding-top: 0.6rem; font-size: 0.82rem; font-weight: 700;
  color: hsl(var(--h) 85% 80%);
`;

export default function AnimationCard({ animation: a, href }: { animation: EventDoc; href?: string }) {
  const [, m, d] = a.date.split("-").map(Number);
  const dispo = a.places - (a.inscrits ?? 0);
  const level = dispo <= 0 ? "full" : dispo <= 2 ? "low" : "ok";
  const hue = systemeHue(a.systeme || a.titre);

  return (
    <Card $hue={hue}>
      <Cover $img={a.image}>
        <DateBadge><b>{d}</b><span>{MOIS[m - 1]}</span></DateBadge>
        <Places $level={level}>{level === "full" ? "Complet" : `${dispo} place${dispo > 1 ? "s" : ""}`}</Places>
      </Cover>
      <Body>
        <TitleLink href={href ?? cheminAnimation(a)}>{a.titre}</TitleLink>
        {a.accroche && <Pitch>{a.accroche}</Pitch>}
        <Meta>{[a.heure, a.duree, a.ville].filter(Boolean).join(" · ")}</Meta>
        <Cta>{level === "full" ? "Voir les détails, liste d'attente →" : "Voir les détails et s'inscrire →"}</Cta>
      </Body>
    </Card>
  );
}