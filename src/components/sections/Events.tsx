"use client";

import styled from "styled-components";
import { Container } from '@/components/Container';
import Link from "next/link";
const Content = styled.div`
  max-width: 900px;
  padding: 0 1.5rem;
  text-align: center;
  width: 100%;
`;

const Title = styled.h2`
  font-size: clamp(2rem, 4vw, 3rem);
  margin: 0 0 2rem;
`;
const EventButton = styled(Link)`
  display: inline-block;
  margin-top: 0.75rem;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.8rem;

  color: white;
  background: rgba(120, 80, 255, 0.4);
  border: 1px solid rgba(160, 120, 255, 0.5);

  &:hover {
    background: rgba(120, 80, 255, 0.6);
  }
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: left;
  backdrop-filter: blur(4px);
  transition: background 150ms ease, border-color 150ms ease;

  &:hover {
    background: rgba(255, 255, 255, 0.11);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

const CardIcon = styled.span`
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
`;

const CardTitle = styled.h3`
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
`;

const CardDescription = styled.p`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  line-height: 1.55;
`;

const events = [
  {
    icon: '🎲',
    title: 'Soirées JDR',
    slug: "soirees-jdr",
    description:
      'Sessions de jeu de rôle régulières ouvertes à tous les niveaux. Découvrez de nouveaux univers et maîtres de jeu.',
  },
  {
    icon: '🏆',
    title: 'Tournois',
    slug: "tournois",
    description:
      "Compétitions amicales entre joueurs. Testez vos compétences dans des scénarios conçus pour le défi.",
  },
  {
    icon: '🃏',
    title: 'Soirées Jeux',
    description:
      'Soirées dédiées aux jeux de société et de plateau pour varier les plaisirs entre deux aventures.',
  },
  {
    icon: '📖',
    title: 'Initiations',
    description:
      'Ateliers pour découvrir le jeu de rôle de zéro. Un cadre bienveillant pour les nouveaux joueurs.',
  },
];

export default function Events() {
  return (
    <Container id="events">
      <Content>
        <Title>Nos Événements</Title>
        <Grid>
          {events.map((event) => (
            <Card key={event.title}>
              <CardIcon>{event.icon}</CardIcon>
              <CardTitle>{event.title}</CardTitle>
              <CardDescription>{event.description}</CardDescription>

<EventButton href={`/evenements/${event.slug}`}>
  Voir les événements →
</EventButton>
            </Card>
          ))}
        </Grid>
      </Content>
    </Container>
  );
}
