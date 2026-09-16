"use client";

import styled from 'styled-components';

const Section = styled.section`
  position: relative;
  width: 100%;
  scroll-snap-align: start;
  flex-shrink: 0;   /* ← empêche le flex parent de compresser la section */

  height: 100vh;

  @media (max-width: 1024px) {
    height: auto;
    min-height: 100vh;
  }
`;

export { Section };