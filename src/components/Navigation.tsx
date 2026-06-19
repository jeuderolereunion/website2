"use client";

import styled from 'styled-components';

const Nav = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 60px;
  background: rgba(18, 18, 18, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const Logo = styled.button`
  background: none;
  border: none;
  color: var(--theme-color-gold);
  cursor: pointer;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0;

  &:hover {
    opacity: 0.85;
  }
`;

const Links = styled.ul`
  display: flex;
  gap: 2rem;
  list-style: none;
  margin: 0;
  padding: 0;

  @media (max-width: 600px) {
    gap: 1rem;
  }
`;

const NavLink = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 0.03em;
  padding: 0;
  transition: color 150ms ease;

  &:hover {
    color: #fff;
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.8);
    outline-offset: 4px;
    border-radius: 2px;
  }
`;

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function Navigation() {
  return (
    <Nav>
      <Logo onClick={() => scrollTo('home')}>⚔️ JDR Réunion</Logo>
      <Links>
        <li><NavLink onClick={() => scrollTo('home')}>Accueil</NavLink></li>
        <li><NavLink onClick={() => scrollTo('events')}>Événements</NavLink></li>
        <li><NavLink onClick={() => scrollTo('about')}>Ressources</NavLink></li>
        <li><NavLink onClick={() => scrollTo('community')}>Communauté</NavLink></li>
        <li><NavLink onClick={() => scrollTo('about')}>À propos</NavLink></li>
        <li><NavLink onClick={() => scrollTo('about')}>Se connecter</NavLink></li>
      </Links>
    </Nav>
  );
}
