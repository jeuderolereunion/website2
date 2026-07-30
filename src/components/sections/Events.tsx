"use client";
import styled from "styled-components";
import { Container } from '@/components/Container';
import Link from "next/link";

const Content = styled.div`
  max-width: 1000px;
  padding: 0 1.5rem;
  text-align: center;
  width: 100%;

  @media (max-width: 640px) {
    padding: 0 1rem;
  }
`;

const Title = styled.h2`
  font-size: clamp(2rem, 4vw, 3rem);
  margin: 0 0 2rem;

  @media (max-width: 640px) {
    font-size: 1.5rem;
    margin: 0 0 1.25rem;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const Card = styled(Link)`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  min-height: 280px;
  padding: 2rem;
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

  @media (max-width: 640px) {
    min-height: 200px;
    padding: 1.25rem;
    border-radius: 10px;
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

const CardTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
  color: #f0d9a6;

  @media (max-width: 640px) {
    font-size: 1.15rem;
    margin: 0 0 0.5rem;
  }
`;

const CardDescription = styled.p`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.75);
  margin: 0;
  line-height: 1.6;
  transition: color 300ms ease;

  @media (hover: hover) {
    ${Card}:hover & {
      color: rgba(255, 255, 255, 0.92);
    }
  }

  @media (max-width: 640px) {
    font-size: 0.82rem;
    line-height: 1.5;
  }
`;

const sections = [
  {
    slug: "soirees-jdr",
    title: "Sessions JDR",
    image: "/images/events/soirees-jdr.jpg",
    description:
      "Des sessions conviviales chaque semaine pour partager des aventures inoubliables autour d'une table, tables ouvertes à tous les niveaux.",
  },
  {
    slug: "animations",
    title: "Animations",
    image: "/images/events/initiations.jpg",
    description:
      "Découvrez le JDR en toute simplicité avec nos initiations gratuites et accompagnées par des MJ passionnés, dans un cadre bienveillant.",
  },
];

export default function Events() {
  return (
    <Container id="events">
      <Content>
        <Title>Nos Activités</Title>
        <Grid>
          {sections.map((section) => (
            <Card key={section.slug} href={`/evenements/${section.slug}`}>
              <CardImage $image={section.image} />
              <CardOverlay />
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </Card>
          ))}
        </Grid>
      </Content>
    </Container>
  );
}