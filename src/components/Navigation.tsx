"use client";

import styled, { keyframes } from "styled-components";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut, User } from "firebase/auth";

// ─── Animations ───────────────────────────────────────────────────────────────

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Styled components ────────────────────────────────────────────────────────

const Nav = styled.nav`
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 60px;
  background: rgba(13, 13, 20, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  @media (max-width: 600px) { padding: 0 1rem; }
`;

const DesktopOnly = styled.div`
  display: flex;
  gap: 0.5rem;

  @media (max-width: 768px) {
    display: none;
  }
`;

const Logo = styled.button`
  background: none;
  border: none;
  color: var(--theme-color-gold);
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0;
  flex-shrink: 0;
  &:hover { opacity: 0.8; }
`;

const Links = styled.ul`
  display: flex;
  gap: 1.75rem;
  list-style: none;
  margin: 0;
  padding: 0;

  @media (max-width: 768px) { display: none; }
`;

const NavLink = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0;
  transition: color 150ms;
  white-space: nowrap;
  &:hover { color: #fff; }
`;

const AuthButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const Btn = styled.button`
  padding: 0.4rem 0.9rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 150ms;
`;

const OutlineBtn = styled(Btn)`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.8);
  &:hover { background: rgba(255, 255, 255, 0.07); color: #fff; }
`;

const GoldBtn = styled(Btn)`
  background: var(--theme-color-gold);
  border: none;
  color: #000;
  font-weight: 600;
  &:hover { opacity: 0.88; }
`;

const AccountBtn = styled(Link)`
  padding: 0.4rem 0.9rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 500;
  white-space: nowrap;
  text-decoration: none;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.8);
  transition: all 150ms;
  &:hover { background: rgba(255, 255, 255, 0.07); color: #fff; }
`;

// ─── Hamburger ────────────────────────────────────────────────────────────────

const HamburgerBtn = styled.button`
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.4rem;
  color: rgba(255, 255, 255, 0.8);
  flex-direction: column;
  gap: 5px;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) { display: flex; }
`;

const Bar = styled.span<{ $open: boolean; $pos: "top" | "mid" | "bot" }>`
  display: block;
  width: 22px;
  height: 2px;
  background: currentColor;
  border-radius: 2px;
  transition: all 250ms ease;

  ${p => p.$open && p.$pos === "top" && `transform: translateY(7px) rotate(45deg);`}
  ${p => p.$open && p.$pos === "mid" && `opacity: 0; transform: scaleX(0);`}
  ${p => p.$open && p.$pos === "bot" && `transform: translateY(-7px) rotate(-45deg);`}
`;

// ─── Menu mobile ─────────────────────────────────────────────────────────────

const MobileMenu = styled.div<{ $open: boolean }>`
  display: none;

  @media (max-width: 768px) {
    display: ${p => p.$open ? "flex" : "none"};
    flex-direction: column;
    position: fixed;
    top: 60px;
    left: 0; right: 0;
    background: rgba(13, 13, 20, 0.98);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1rem 1.5rem 1.5rem;
    gap: 0.25rem;
    animation: ${slideDown} 200ms ease both;
    z-index: 999;
  }
`;

const MobileNavLink = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  padding: 0.75rem 0;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  transition: color 150ms;
  width: 100%;
  &:hover { color: #fff; }
  &:last-child { border-bottom: none; }
`;

const MobileDivider = styled.div`
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 0.5rem 0;
`;

const MobileAuthRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function navigate(path: string) { window.location.href = path; }

function goToSection(id: string, isHome: boolean) {
  if (isHome) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  } else {
    window.location.href = `/#${id}`;
  }
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function Navigation() {
  const [user, setUser]       = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname              = usePathname();
  const isHome                = pathname === "/";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const snap = await getDoc(doc(db, "admins", firebaseUser.uid));
        setIsAdmin(snap.exists());
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsub();
  }, []);

  // Fermer le menu au changement de route
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  function handleNav(action: () => void) {
    action();
    setMenuOpen(false);
  }

  return (
    <>
      <Nav>
        <Logo onClick={() => navigate("/")}>⚔️ JDR Réunion</Logo>

        {/* Desktop links */}
        <Links>
          <li><NavLink onClick={() => goToSection("home", isHome)}>Accueil</NavLink></li>
          <li><NavLink onClick={() => goToSection("events", isHome)}>Événements</NavLink></li>
          <li><NavLink onClick={() => goToSection("community", isHome)}>Communauté</NavLink></li>
          <li><NavLink onClick={() => navigate("/ressources")}>Ressources</NavLink></li>
          <li><NavLink onClick={() => goToSection("about", isHome)}>À propos</NavLink></li>
          {isAdmin && <li><NavLink onClick={() => navigate("/admin")}>⚙️ Admin</NavLink></li>}
        </Links>

        <AuthButtons>
          {/* Desktop auth */}
          {!user ? (
            <>
              <OutlineBtn
                onClick={() => navigate(`/login?redirect=${encodeURIComponent(pathname)}`)}
                style={{ display: "" } as any}
                
              >
                Se connecter
              </OutlineBtn>
              <GoldBtn
                onClick={() => navigate("/register")}
                
              >
                S'inscrire
              </GoldBtn>
            </>
          ) : (
            <>
              <AccountBtn href="/mon-compte" className="desktop-only">👤 Mon compte</AccountBtn>
              <OutlineBtn onClick={() => signOut(auth)} className="desktop-only">Déconnexion</OutlineBtn>
            </>
          )}

          {/* Hamburger */}
          <HamburgerBtn onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            <Bar $open={menuOpen} $pos="top" />
            <Bar $open={menuOpen} $pos="mid" />
            <Bar $open={menuOpen} $pos="bot" />
          </HamburgerBtn>
        </AuthButtons>
      </Nav>

      {/* Mobile menu */}
      <MobileMenu $open={menuOpen}>
        <MobileNavLink onClick={() => handleNav(() => goToSection("home", isHome))}>Accueil</MobileNavLink>
        <MobileNavLink onClick={() => handleNav(() => goToSection("events", isHome))}>Événements</MobileNavLink>
        <MobileNavLink onClick={() => handleNav(() => goToSection("community", isHome))}>Communauté</MobileNavLink>
        <MobileNavLink onClick={() => handleNav(() => navigate("/ressources"))}>Ressources</MobileNavLink>
        <MobileNavLink onClick={() => handleNav(() => goToSection("about", isHome))}>À propos</MobileNavLink>
        {isAdmin && <MobileNavLink onClick={() => handleNav(() => navigate("/admin"))}>⚙️ Administration</MobileNavLink>}

        <MobileDivider />

        <MobileAuthRow>
          {!user ? (
            <>
             
            
            </>
          ) : (
            <DesktopOnly>
  <AccountBtn href="/mon-compte">
    👤 Mon compte
  </AccountBtn>

  <OutlineBtn onClick={() => signOut(auth)}>
    Déconnexion
  </OutlineBtn>
</DesktopOnly>
          )}
        </MobileAuthRow>
      </MobileMenu>
    </>
  );
}