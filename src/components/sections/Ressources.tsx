"use client";

import styled from "styled-components";
import { Container } from '@/components/Container';
import { Image } from '@/components/semantic/Image';

const Content = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  padding-top: 60px;
`;

const Title = styled.h1`
  font-size: clamp(2.5rem, 5vw, 4rem);
  letter-spacing: 0.08em;
  margin: 0;
  text-shadow: 0 0 3px #fff;
  color: var(--theme-color-gold);
`;

const Subtitle = styled.p`
  font-size: clamp(1rem, 2.5vw, 1.5rem);
  line-height: 1.3;
  margin: 0;
  max-width: 640px;
  text-shadow: 0 0 1px var(--theme-color-gold);
`;

export default function Ressources() {
  return (
    <Container id="ressources">
      <Content>
        <Image src="/images/logo.webp" alt="Logo de JDR Réunion" width={120} height={120} />
        <Title>JDR Réunion</Title>
        <Subtitle>JDR Réunion est une organisation dédiée aux jeux de rôle, aux tournois, aux soirées jeux et à l&apos;improvisation à La Réunion.</Subtitle>
        <Subtitle>Notre mission est de créer une communauté immersive où chacun peut explorer sa créativité et vivre des aventures uniques.</Subtitle>
      </Content>
    </Container>
  );
}
