"use client";

import styled from 'styled-components';

const Container = styled.div`
  position: relative;
  align-items: center;
  color: #fff;
  display: flex;
  flex: 0 0 auto;
  font-size: 2rem;
  min-height: 100vh;      /* ← min au lieu de height fixe */
  height: auto;           /* ← laisse grandir si besoin */
  justify-content: center;
  scroll-snap-align: start;
  width: 100%;
  padding-bottom: 4rem;   /* ← respiration en bas */
`;

export { Container };
