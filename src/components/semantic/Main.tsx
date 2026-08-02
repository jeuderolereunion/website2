"use client";

import styled from 'styled-components';

const Main = styled.main`
  height: 100vh;
  height: 100dvh; /* dynamic viewport height, ignore la barre d'adresse mobile */
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  scroll-behavior: smooth;
  scroll-snap-type: y mandatory;

  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }

  /* Sur mobile, le snap "mandatory" force le retour en haut dès qu'une
     section (comme About, qui a un contenu plus long que l'écran)
     n'est plus un point de snap valide. On passe en "proximity" pour
     garder l'effet page-par-page sur les sections courtes tout en
     laissant le scroll libre sur les sections longues. */
  @media (max-width: 768px) {
    scroll-snap-type: y proximity;
  }
`;

export { Main };