"use client";

import styled from "styled-components";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import Navigation from "@/components/Navigation";
// ─── Types ────────────────────────────────────────────────────────────────────

type TypeRessource = "regles" | "fiche" | "carte" | "bestiaire" | "scenario";

type Ressource = {
  id: string;
  titre: string;
  type: TypeRessource;
  univers: string;
  taille: string;
  url: string;
};

type UniversGroupe = {
  nom: string;
  ressources: Ressource[];
};

// ─── Config univers (couleurs & icônes) ───────────────────────────────────────

const UNIVERS_CONFIG: Record<string, { couleur: string; icone: string }> = {
  "Donjons & Dragons": { couleur: "#E24B4A", icone: "⚔️" },
  "Pathfinder":        { couleur: "#1D9E75", icone: "🛡️" },
  "L'Appel de Cthulhu":{ couleur: "#534AB7", icone: "👁️" },
  "Warhammer":         { couleur: "#BA7517", icone: "💀" },
};

const TYPE_LABELS: Record<TypeRessource, string> = {
  regles:    "Règles",
  fiche:     "Fiche",
  carte:     "Carte",
  bestiaire: "Bestiaire",
  scenario:  "Scénario",
};

const TYPE_ICONS: Record<TypeRessource, string> = {
  regles:    "📖",
  fiche:     "👤",
  carte:     "🗺️",
  bestiaire: "🐾",
  scenario:  "📜",
};

const TYPE_COLORS: Record<TypeRessource, { bg: string; color: string }> = {
  regles:    { bg: "rgba(83,74,183,0.15)",  color: "#7F77DD" },
  fiche:     { bg: "rgba(55,138,221,0.15)", color: "#378ADD" },
  carte:     { bg: "rgba(29,158,117,0.15)", color: "#1D9E75" },
  bestiaire: { bg: "rgba(186,117,23,0.15)", color: "#BA7517" },
  scenario:  { bg: "rgba(216,90,48,0.15)",  color: "#D85A30" },
};

const FILTRES: { label: string; value: TypeRessource | "tous" }[] = [
  { label: "Tous",      value: "tous" },
  { label: "Règles",    value: "regles" },
  { label: "Fiches",    value: "fiche" },
  { label: "Cartes",    value: "carte" },
  { label: "Bestiaires",value: "bestiaire" },
  { label: "Scénarios", value: "scenario" },
];

// ─── Styled components ────────────────────────────────────────────────────────

const Page = styled.main`
  min-height: 100vh;
  background: #0d0d14;
  color: white;
  padding: 5rem 1rem 3rem;

  @media (min-width: 640px) {
    padding: 6rem 2rem 3rem;
  }
`;

const Hero = styled.div`
  text-align: center;
  margin-bottom: 2.5rem;
`;

const Title = styled.h1`
  font-size: clamp(1.8rem, 5vw, 3rem);
  font-weight: 800;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: rgba(255,255,255,0.5);
  font-size: clamp(0.9rem, 2vw, 1rem);
`;

const Controls = styled.div`
  max-width: 1200px;
  margin: 0 auto 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05);
  color: white;
  font-size: 0.95rem;
  outline: none;
  width: 100%;

  &::placeholder { color: rgba(255,255,255,0.3); }
  &:focus { border-color: rgba(160,120,255,0.5); }
`;

const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const FilterBtn = styled.button<{ $active: boolean }>`
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  border: 1px solid ${p => p.$active
    ? "rgba(160,120,255,0.6)"
    : "rgba(255,255,255,0.1)"};
  background: ${p => p.$active
    ? "rgba(120,80,255,0.2)"
    : "transparent"};
  color: ${p => p.$active ? "white" : "rgba(255,255,255,0.5)"};
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover {
    border-color: rgba(160,120,255,0.4);
    color: white;
  }
`;

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
`;

const UniversSection = styled.section``;

const UniversHeader = styled.div<{ $couleur: string }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
`;

const UniversIcone = styled.div<{ $couleur: string }>`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${p => p.$couleur}22;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
`;

const UniversNom = styled.h2`
  font-size: 1.1rem;
  font-weight: 700;
  flex: 1;
`;

const UniversCount = styled.span`
  font-size: 0.8rem;
  color: rgba(255,255,255,0.4);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;

  @media (max-width: 400px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  transition: border-color 0.15s, transform 0.15s;

  &:hover {
    border-color: rgba(160,120,255,0.35);
    transform: translateY(-2px);
  }

  @media (hover: none) {
    &:hover { transform: none; }
  }
`;

const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
`;

const TypeBadge = styled.span<{ $type: TypeRessource }>`
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  background: ${p => TYPE_COLORS[p.$type].bg};
  color: ${p => TYPE_COLORS[p.$type].color};
  white-space: nowrap;
`;

const CardIcone = styled.span`
  font-size: 1.2rem;
  flex-shrink: 0;
`;

const CardTitre = styled.p`
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.35;
  color: white;
  word-break: break-word;
`;

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  gap: 0.5rem;
`;

const CardTaille = styled.span`
  font-size: 0.75rem;
  color: rgba(255,255,255,0.35);
`;

const DlBtn = styled.a`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.6);
  text-decoration: none;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover {
    background: rgba(255,255,255,0.08);
    color: white;
  }
`;

const Empty = styled.div`
  text-align: center;
  padding: 4rem 1rem;
  color: rgba(255,255,255,0.3);
  font-size: 0.95rem;
`;

const Loading = styled.p`
  text-align: center;
  color: rgba(255,255,255,0.4);
  padding: 3rem;
`;

// ─── Composant principal ──────────────────────────────────────────────────────

export default function RessourcesPage() {
    const [user, setUser] = useState<User | null>(null);
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<TypeRessource | "tous">("tous");
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    async function charger() {
      try {
        const snap = await getDocs(collection(db, "ressources"));
        const data = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
        })) as Ressource[];
        setRessources(data);
      } catch (err) {
        console.error("Erreur chargement ressources :", err);
      } finally {
        setLoading(false);
      }
    }
    charger();
  }, []);

  useEffect(() => {
  const unsub = onAuthStateChanged(auth, (firebaseUser) => {
    setUser(firebaseUser);
  });

  return () => unsub();
}, []);

  // Filtrage
  const filtrees = ressources.filter(r => {
    const matchType = filtre === "tous" || r.type === filtre;
    const matchQ = r.titre.toLowerCase().includes(recherche.toLowerCase()) ||
                   r.univers.toLowerCase().includes(recherche.toLowerCase());
    return matchType && matchQ;
  });

  // Groupement par univers
  const groupes: UniversGroupe[] = Object.values(
    filtrees.reduce<Record<string, UniversGroupe>>((acc, r) => {
      if (!acc[r.univers]) acc[r.univers] = { nom: r.univers, ressources: [] };
      acc[r.univers].ressources.push(r);
      return acc;
    }, {})
  );

  return (
    
    <Page>
         
      <Hero>
       <Navigation />
        <Title>📚 Bibliothèque</Title>
        <Subtitle>Ressources pour vos jeux de rôle — fiches, règles, cartes et plus</Subtitle>
      </Hero>

      <Controls>
        <SearchInput
          type="search"
          placeholder="Rechercher un fichier ou un univers…"
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          aria-label="Rechercher une ressource"
        />
        <FilterRow role="group" aria-label="Filtrer par type">
          {FILTRES.map(f => (
            <FilterBtn
              key={f.value}
              $active={filtre === f.value}
              onClick={() => setFiltre(f.value)}
            >
              {f.label}
            </FilterBtn>
          ))}
        </FilterRow>
      </Controls>

      {loading && <Loading>Chargement…</Loading>}

      {!loading && groupes.length === 0 && (
        <Empty>Aucune ressource trouvée.</Empty>
      )}

      <Content>
        {groupes.map(groupe => {
          const config = UNIVERS_CONFIG[groupe.nom] ?? { couleur: "#7F77DD", icone: "🎲" };
          return (
            <UniversSection key={groupe.nom}>
              <UniversHeader $couleur={config.couleur}>
                <UniversIcone $couleur={config.couleur}>
                  {config.icone}
                </UniversIcone>
                <UniversNom>{groupe.nom}</UniversNom>
                <UniversCount>
                  {groupe.ressources.length} fichier{groupe.ressources.length > 1 ? "s" : ""}
                </UniversCount>
              </UniversHeader>

              <Grid>
                {groupe.ressources.map(r => (
                  <Card key={r.id}>
                    <CardTop>
                      <TypeBadge $type={r.type}>
                        {TYPE_LABELS[r.type]}
                      </TypeBadge>
                      <CardIcone aria-hidden="true">
                        {TYPE_ICONS[r.type]}
                      </CardIcone>
                    </CardTop>

                    <CardTitre>{r.titre}</CardTitre>

                    <CardMeta>
                      <CardTaille>{r.taille}</CardTaille>
                      {user ? (
  <DlBtn
    href={r.url}
    target="_blank"
    rel="noopener noreferrer"
  >
    ↓ PDF
  </DlBtn>
) : (
  <DlBtn
  as="button"
  disabled
>
  🔒 Connectez-vous pour télécharger
</DlBtn>
)}
                    </CardMeta>
                  </Card>
                ))}
              </Grid>
            </UniversSection>
          );
        })}
      </Content>
    </Page>
  );
}