"use client";

import styled from "styled-components";
import Link from "next/link";
import Navigation from "@/components/Navigation";

/* ---------- Palette (cohérente avec le Hero de la page d'accueil) ---------- */
const colors = {
  ink: "#0B0D12",
  surface: "#161B24",
  brass: "#C9A25D",
  garnet: "#7A2E2E",
  parchment: "#E8DCC0",
  text: "#F2EFE9",
  textMuted: "rgba(242, 239, 233, 0.72)",
};

/* ---------- Layout ---------- */

const Page = styled.main`
  min-height: 100vh;
  background: ${colors.ink};
  color: ${colors.text};
  padding-bottom: 5rem;
`;

const Hero = styled.section`
  position: relative;
  padding: 6rem 1.5rem 3.5rem;
  text-align: center;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse 70% 50% at 50% 0%,
      rgba(201, 162, 93, 0.16) 0%,
      transparent 70%
    );
    pointer-events: none;
  }
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: ${colors.textMuted};
  text-decoration: none;
  margin-bottom: 2rem;
  transition: color 150ms;

  &:hover {
    color: ${colors.text};
  }
`;

const HeroIcon = styled.span`
  font-size: 3.5rem;
  display: block;
  margin-bottom: 1rem;
`;

const HeroTitle = styled.h1`
  font-family: var(--font-fraunces, Georgia, serif);
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 600;
  margin: 0 0 0.75rem;
  color: ${colors.parchment};
`;

const HeroSubtitle = styled.p`
  font-size: 1rem;
  color: ${colors.textMuted};
  max-width: 560px;
  margin: 0 auto;
  line-height: 1.6;
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 1.5rem;
  padding: 0.4rem 1rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${colors.parchment};
  background: rgba(122, 46, 46, 0.35);
  border: 1px solid rgba(122, 46, 46, 0.6);
`;

const Section = styled.section`
  max-width: 800px;
  margin: 0 auto;
  padding: 0 1.5rem 3rem;
`;

const SectionLabel = styled.h2`
  font-family: var(--font-fraunces, Georgia, serif);
  font-size: 1.4rem;
  font-weight: 600;
  color: ${colors.parchment};
  margin: 0 0 1rem;
`;

/* ---------- Infos pratiques ---------- */

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 3rem;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const InfoCard = styled.div`
  background: ${colors.surface};
  border: 1px solid rgba(201, 162, 93, 0.25);
  border-radius: 14px;
  padding: 1.25rem 1.5rem;
`;

const InfoLabel = styled.p`
  font-size: 0.78rem;
  color: ${colors.brass};
  margin: 0 0 0.35rem;
`;

const InfoValue = styled.p`
  font-size: 1rem;
  font-weight: 600;
  color: ${colors.text};
  margin: 0;
  line-height: 1.4;
`;

/* ---------- Contenu texte ---------- */

const Paragraph = styled.p`
  font-size: 0.95rem;
  color: ${colors.textMuted};
  line-height: 1.7;
  margin: 0 0 1.25rem;
`;

const List = styled.ul`
  margin: 0 0 1.5rem;
  padding-left: 1.25rem;
  color: ${colors.textMuted};
  font-size: 0.95rem;
  line-height: 1.8;
`;

/* ---------- Inscription ---------- */

const RegisterBox = styled.div`
  background: ${colors.surface};
  border: 1px solid rgba(201, 162, 93, 0.3);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
`;

const RegisterTitle = styled.h3`
  font-family: var(--font-fraunces, Georgia, serif);
  font-size: 1.3rem;
  color: ${colors.parchment};
  margin: 0 0 0.5rem;
`;

const RegisterNote = styled.p`
  font-size: 0.88rem;
  color: ${colors.textMuted};
  margin: 0 0 1.5rem;
  line-height: 1.5;
`;

const IframeWrapper = styled.div`
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 12px;
`;

const ContactLink = styled.a`
  display: inline-block;
  margin-top: 1.25rem;
  font-size: 0.85rem;
  color: ${colors.brass};
  text-decoration: underline;

  &:hover {
    color: ${colors.parchment};
  }
`;

export default function TournoiDndDebutantsPage() {
  return (
    <Page>
      <Navigation />

      <Hero>
        <BackLink href="/#events">← Tous les événements</BackLink>
        <HeroIcon>🎲</HeroIcon>
        <HeroTitle>Tournoi D&D Débutants</HeroTitle>
        <HeroSubtitle>
          Un tournoi Donjons &amp; Dragons pensé pour les débutants, avec
          personnages pré-tirés ou création de personnage jusqu&apos;au
          niveau 2.
        </HeroSubtitle>
        {/* TODO(Alex) : remplacer par "Date confirmée" + la date une fois fixée */}
        <StatusPill>📅 Date à venir</StatusPill>
      </Hero>

      <Section>
        <InfoGrid>
          <InfoCard>
            <InfoLabel>Date</InfoLabel>
            {/* TODO(Alex) : remplacer par la date exacte */}
            <InfoValue>À confirmer prochainement</InfoValue>
          </InfoCard>
          <InfoCard>
            <InfoLabel>Lieu</InfoLabel>
            {/* TODO(Alex) : remplacer par le lieu exact */}
            <InfoValue>À confirmer prochainement</InfoValue>
          </InfoCard>
          <InfoCard>
            <InfoLabel>Tarif</InfoLabel>
            <InfoValue>Gratuit — adhésion à prendre sur place</InfoValue>
          </InfoCard>
          <InfoCard>
            <InfoLabel>Niveau</InfoLabel>
            <InfoValue>Débutants bienvenus</InfoValue>
          </InfoCard>
        </InfoGrid>

        <SectionLabel>Le format</SectionLabel>
        <Paragraph>
          Ce tournoi est pensé pour découvrir Donjons &amp; Dragons dans de
          bonnes conditions, sans expérience préalable requise. Deux options
          s&apos;offrent à vous :
        </Paragraph>
        <List>
          <li>
            Jouer un personnage pré-tiré, prêt à l&apos;emploi, pour vous
            concentrer sur le jeu dès le début.
          </li>
          <li>
            Créer votre propre personnage jusqu&apos;au niveau 2, accompagné
            par un MJ de l&apos;association.
          </li>
        </List>
        {/* TODO(Alex) : préciser ici le déroulé exact — nombre de tables,
            système d'élimination ou de score, durée des parties, nombre
            de manches, etc. */}
        <Paragraph>
          Le déroulé précis du tournoi (nombre de tables, format des
          manches) sera communiqué prochainement.
        </Paragraph>

        <SectionLabel>Inscription</SectionLabel>
        <RegisterBox>
          <RegisterTitle>Réservez votre place</RegisterTitle>
          <RegisterNote>
            L&apos;événement est gratuit. L&apos;adhésion à l&apos;association
            se prend directement sur place le jour J. Les inscriptions au
            tournoi se font via HelloAsso.
          </RegisterNote>

          <IframeWrapper>
            {/* TODO(Alex) : remplacer par l'URL HelloAsso spécifique à cet
                événement (billetterie/formulaire), pas celle de l'adhésion
                générale utilisée dans Community.tsx */}
            <iframe
              id="haWidgetButtonTournoi"
              allowTransparency={true}
              src="https://www.helloasso.com/associations/jdr-reunion/evenements/REMPLACER-PAR-LE-SLUG-DE-L-EVENEMENT/widget-bouton"
              style={{
                width: "100%",
                height: "70px",
                border: "none",
                display: "block",
              }}
            />
          </IframeWrapper>

          <ContactLink
            href="https://discord.gg/ZtHDCt7RdY"
            target="_blank"
            rel="noopener noreferrer"
          >
            Une question ? Rejoignez le Discord →
          </ContactLink>
        </RegisterBox>
      </Section>
    </Page>
  );
}