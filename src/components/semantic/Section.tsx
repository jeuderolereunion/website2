"use client";

import styled from 'styled-components';

const Section = styled.section`
  position: relative;
  min-height: 100dvh;   /* min + dvh au lieu de height: 100vh fixe */
  height: auto;
  scroll-snap-align: start;
  width: 100%;
`;

export { Section };