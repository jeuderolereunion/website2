"use client";

import styled, { css } from 'styled-components';

const Container = styled.div<{ $fullHeight?: boolean; $tone?: "base" | "alt" }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  width: 100%;
  box-sizing: border-box;
  scroll-snap-align: start;

  min-height: ${({ $fullHeight }) => ($fullHeight ? "100svh" : "auto")};
  min-height: ${({ $fullHeight }) => ($fullHeight ? "100dvh" : "auto")};

  padding-top: ${({ $fullHeight }) => ($fullHeight ? "0" : "clamp(3rem, 8vh, 6rem)")};
  padding-bottom: ${({ $fullHeight }) => ($fullHeight ? "0" : "clamp(3rem, 8vh, 6rem)")};

  /* Alternance de fond : sépare visuellement les sections sans dépendre
     de la hauteur — fonctionne même si le contenu est court. */
  ${({ $tone }) =>
    $tone === "alt" &&
    css`
      background: rgba(255, 255, 255, 0.02);
    `}

  /* Liseré fin en haut de section, sauf pour la hero plein écran
     (qui n'a pas besoin de frontière, elle occupe déjà tout l'écran). */
  ${({ $fullHeight }) =>
    !$fullHeight &&
    css`
      &::before {
        content: "";
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: min(90%, 1100px);
        height: 1px;
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(212, 168, 83, 0.25) 50%,
          transparent 100%
        );
      }
    `}

  @media (max-width: 768px) {
    padding-top: ${({ $fullHeight }) => ($fullHeight ? "0" : "2.5rem")};
    padding-bottom: ${({ $fullHeight }) => ($fullHeight ? "0" : "2.5rem")};
  }

  @media (max-width: 480px) {
    padding-top: ${({ $fullHeight }) => ($fullHeight ? "0" : "1.75rem")};
    padding-bottom: ${({ $fullHeight }) => ($fullHeight ? "0" : "1.75rem")};
  }
`;

export { Container };