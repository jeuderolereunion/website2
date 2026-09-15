"use client";

import styled from 'styled-components';

const Container = styled.div`
  position: relative;
  align-items: safe center;   /* évite le débordement quand le contenu est trop haut */
  color: #fff;
  display: flex;
  flex: 0 0 auto;
  font-size: 2rem;
  min-height: 100dvh;         /* dvh au lieu de vh : fiable sur mobile (Safari) */
  height: auto;
  justify-content: center;
  scroll-snap-align: start;
  width: 100%;
  padding-bottom: 4rem;
`;

export { Container };