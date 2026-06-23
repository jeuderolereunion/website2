"use client";

import styled from "styled-components";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Navigation from "@/components/Navigation";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

// ─── Types ────────────────────────────────────────────────────────────────────

type Proposition = {
  id: string;
  titre: string;
  description: string;
  categorie: string;
  date: string;
  heure: string;
  niveau: string;
  places: number;
  organisateur: string;
  email: string;
};

type TypeRessource = "regles" | "fiche" | "carte" | "bestiaire" | "scenario";

type Ressource = {
  id: string;
  titre: string;
  type: TypeRessource;
  univers: string;
  taille: string;
  url: string;
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const TYPES_RESSOURCE: { value: TypeRessource; label: string }[] = [
  { value: "regles",    label: "Règles & manuels" },
  { value: "fiche",     label: "Fiche de personnage" },
  { value: "carte",     label: "Carte & lieux" },
  { value: "bestiaire", label: "Bestiaire" },
  { value: "scenario",  label: "Scénario & aventure" },
];

const UNIVERS_SUGGESTIONS = [
  "Donjons & Dragons",
  "Pathfinder",
  "L'Appel de Cthulhu",
  "Warhammer",
  "Shadowrun",
  "Star Wars",
  "Cyberpunk Red",
];

const FORM_VIDE = {
  titre: "",
  type: "regles" as TypeRessource,
  univers: "",
  taille: "",
  url: "",
};

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
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: clamp(1.5rem, 5vw, 2.8rem);
  font-weight: 800;
  margin-bottom: 0.4rem;
  line-height: 1.2;
`;

const Subtitle = styled.p`
  color: rgba(255,255,255,0.5);
  font-size: clamp(0.85rem, 2vw, 0.95rem);
`;

// ── Onglets ───────────────────────────────────────────────────────────────────

const Tabs = styled.div`
  display: flex;
  gap: 0.5rem;
  max-width: 1100px;
  margin: 0 auto 2rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 0.35rem;
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 0.65rem 1rem;
  border-radius: 9px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: clamp(0.82rem, 2vw, 0.9rem);
  transition: all 0.15s;
  background: ${p => p.$active ? "rgba(120,80,255,0.25)" : "transparent"};
  color: ${p => p.$active ? "rgba(180,150,255,1)" : "rgba(255,255,255,0.4)"};
  border: ${p => p.$active ? "1px solid rgba(160,120,255,0.3)" : "1px solid transparent"};

  &:hover:not([data-active="true"]) {
    color: rgba(255,255,255,0.7);
  }
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.4rem;
  background: rgba(120,80,255,0.3);
  color: rgba(200,180,255,1);
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 1px 7px;
`;

// ── Événements ────────────────────────────────────────────────────────────────

const Grid = styled.div`
  max-width: 1100px;
  margin: auto;
  display: grid;
  gap: 1rem;
`;

const Card = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  overflow: hidden;
  transition: .2s;

  &:hover { border-color: rgba(160,120,255,0.3); }

  @media (hover: none) {
    &:hover { transform: none; }
  }
`;

const CardHeader = styled.div`
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, rgba(120,80,255,0.2), rgba(120,80,255,0.05));
`;

const CardTitle = styled.h2`
  margin: 0;
  font-size: clamp(1rem, 3vw, 1.15rem);
  line-height: 1.3;
  word-break: break-word;
`;

const CardBody = styled.div`
  padding: 1rem 1.25rem;
`;

const Description = styled.p`
  color: rgba(255,255,255,0.65);
  line-height: 1.6;
  font-size: clamp(0.85rem, 2vw, 0.95rem);
  word-break: break-word;
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin-top: 0.75rem;
`;

const MetaBadge = styled.div`
  padding: .3rem .65rem;
  border-radius: 999px;
  background: rgba(255,255,255,0.07);
  font-size: clamp(0.75rem, 2vw, 0.82rem);
  white-space: nowrap;
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: .6rem;
  margin-top: 1.25rem;

  @media (min-width: 400px) {
    flex-direction: row;
    flex-wrap: wrap;
  }
`;

const ValidateBtn = styled.button`
  flex: 1;
  min-width: 110px;
  padding: .7rem 1rem;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: clamp(0.82rem, 2.5vw, 0.9rem);
  background: rgba(0,255,120,0.12);
  color: #5dff9d;
  transition: background 0.15s;

  &:hover  { background: rgba(0,255,120,0.22); }
  &:active { background: rgba(0,255,120,0.32); }
`;

const RejectBtn = styled.button`
  flex: 1;
  min-width: 110px;
  padding: .7rem 1rem;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: clamp(0.82rem, 2.5vw, 0.9rem);
  background: rgba(255,80,80,0.12);
  color: #ff7b7b;
  transition: background 0.15s;

  &:hover  { background: rgba(255,80,80,0.22); }
  &:active { background: rgba(255,80,80,0.32); }
`;

// ── Ressources ────────────────────────────────────────────────────────────────

const RessourcesLayout = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  gap: 1.5rem;

  @media (min-width: 900px) {
    grid-template-columns: 360px 1fr;
    align-items: start;
  }
`;

const FormCard = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 1.5rem;

  @media (min-width: 900px) {
    position: sticky;
    top: 5rem;
  }
`;

const FormTitle = styled.h2`
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
`;

const Field = styled.div`
  margin-bottom: 0.9rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.45);
  margin-bottom: 0.35rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.6rem 0.85rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.06);
  color: white;
  font-size: 0.88rem;
  outline: none;
  transition: border-color 0.15s;

  &::placeholder { color: rgba(255,255,255,0.2); }
  &:focus { border-color: rgba(160,120,255,0.5); }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.6rem 0.85rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(30,20,50,0.9);
  color: white;
  font-size: 0.88rem;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s;

  &:focus { border-color: rgba(160,120,255,0.5); }
`;

const SubmitBtn = styled.button`
  width: 100%;
  padding: 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(160,120,255,0.3);
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9rem;
  background: rgba(120,80,255,0.2);
  color: rgba(180,150,255,1);
  transition: all 0.15s;
  margin-top: 0.25rem;

  &:hover:not(:disabled) { background: rgba(120,80,255,0.35); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SuccessMsg = styled.div`
  margin-top: 0.65rem;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  background: rgba(0,200,100,0.1);
  color: #5dff9d;
  font-size: 0.82rem;
  text-align: center;
  border: 1px solid rgba(0,200,100,0.2);
`;

const ErrorMsg = styled.div`
  margin-top: 0.65rem;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  background: rgba(255,80,80,0.1);
  color: #ff7b7b;
  font-size: 0.82rem;
  text-align: center;
  border: 1px solid rgba(255,80,80,0.2);
`;

const ListHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const ListTitle = styled.h2`
  font-size: 1rem;
  font-weight: 700;
`;

const ListCount = styled.span`
  font-size: 0.78rem;
  color: rgba(255,255,255,0.4);
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
`;

const RessourceItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.8rem 1rem;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  margin-bottom: 0.5rem;
  transition: border-color 0.15s;

  &:hover { border-color: rgba(255,255,255,0.13); }
`;

const ItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemTitre = styled.p`
  font-size: 0.88rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemMeta = styled.p`
  font-size: 0.75rem;
  color: rgba(255,255,255,0.38);
  margin-top: 2px;
`;

const TypePill = styled.span`
  font-size: 0.7rem;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(120,80,255,0.15);
  color: rgba(180,150,255,1);
  white-space: nowrap;
  flex-shrink: 0;
`;

const LinkBtn = styled.a`
  padding: 0.35rem 0.65rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.35);
  font-size: 0.75rem;
  text-decoration: none;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover { background: rgba(255,255,255,0.07); color: white; }
`;

const DeleteBtn = styled.button`
  padding: 0.35rem 0.65rem;
  border-radius: 8px;
  border: 1px solid rgba(255,80,80,0.18);
  background: rgba(255,80,80,0.07);
  color: #ff7b7b;
  font-size: 0.75rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover { background: rgba(255,80,80,0.18); }
`;

const Empty = styled.p`
  text-align: center;
  color: rgba(255,255,255,0.3);
  padding: 2.5rem;
  font-size: 0.9rem;
`;

const Loading = styled.p`
  text-align: center;
  color: rgba(255,255,255,0.3);
  padding: 2rem;
  font-size: 0.9rem;
`;

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AdminPage() {
  const [authorized, setAuthorized]     = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [onglet, setOnglet]             = useState<"evenements" | "ressources">("evenements");

  // ── État événements ────────────────────────────────────────────────────────
  const [propositions, setPropositions]   = useState<Proposition[]>([]);
  const [loadingEvts, setLoadingEvts]     = useState(true);

  // ── État ressources ────────────────────────────────────────────────────────
  const [ressources, setRessources]       = useState<Ressource[]>([]);
  const [loadingRes, setLoadingRes]       = useState(true);
  const [form, setForm]                   = useState(FORM_VIDE);
  const [submitting, setSubmitting]       = useState(false);
  const [message, setMessage]             = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = "/login"; return; }

      const userSnap = await getDoc(doc(db, "users", user.uid));

if (
  !userSnap.exists() ||
  userSnap.data().role !== "admin"
) {
  window.location.href = "/";
  return;
}
      setAuthorized(true);
      setCheckingAuth(false);
      chargerPropositions();
      chargerRessources();
    });
    return () => unsub();
  }, []);

  // ── Chargements ───────────────────────────────────────────────────────────

  async function chargerPropositions() {
    setLoadingEvts(true);
    const snap = await getDocs(collection(db, "propositions_evenements"));
    setPropositions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Proposition[]);
    setLoadingEvts(false);
  }

  async function chargerRessources() {
    setLoadingRes(true);
    const snap = await getDocs(collection(db, "ressources"));
    setRessources(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Ressource[]);
    setLoadingRes(false);
  }

  // ── Actions événements ────────────────────────────────────────────────────

  async function accepterEvenement(event: Proposition) {
    try {
      await addDoc(collection(db, "evenements"), {
        titre: event.titre,
        description: event.description,
        categorie: event.categorie,
        date: event.date,
        heure: event.heure,
        niveau: event.niveau,
        places: event.places,
        inscrits: 0,
      });
      await deleteDoc(doc(db, "propositions_evenements", event.id));
      chargerPropositions();
      alert("Événement validé !");
    } catch (err) {
      console.error(err);
      alert("Erreur.");
    }
  }

  async function supprimerProposition(id: string) {
    if (!confirm("Refuser cette proposition ?")) return;
    await deleteDoc(doc(db, "propositions_evenements", id));
    chargerPropositions();
  }

  // ── Actions ressources ────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titre || !form.univers || !form.url) {
      setMessage({ type: "err", text: "Remplissez tous les champs obligatoires." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await addDoc(collection(db, "ressources"), {
        ...form,
        createdAt: serverTimestamp(),
      });
      setMessage({ type: "ok", text: "Ressource ajoutée !" });
      setForm(FORM_VIDE);
      chargerRessources();
    } catch (err) {
      console.error(err);
      setMessage({ type: "err", text: "Erreur lors de l'ajout." });
    } finally {
      setSubmitting(false);
    }
  }

  async function supprimerRessource(id: string, titre: string) {
    if (!confirm(`Supprimer "${titre}" ?`)) return;
    await deleteDoc(doc(db, "ressources", id));
    chargerRessources();
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (checkingAuth) return null;
  if (!authorized)  return null;

  return (
    <Page>
      <Navigation></Navigation>
      <Hero>
        <Title>⚙️ Administration</Title>
        <Subtitle>Gestion des événements et des ressources</Subtitle>
      </Hero>

      <Tabs>
        <Tab
          $active={onglet === "evenements"}
          onClick={() => setOnglet("evenements")}
        >
          📬 Événements
          {propositions.length > 0 && <Badge>{propositions.length}</Badge>}
        </Tab>
        <Tab
          $active={onglet === "ressources"}
          onClick={() => setOnglet("ressources")}
        >
          📚 Ressources
          <Badge>{ressources.length}</Badge>
        </Tab>
      </Tabs>

      {/* ── Onglet Événements ── */}
      {onglet === "evenements" && (
        <Grid>
          {loadingEvts && <Loading>Chargement…</Loading>}

          {!loadingEvts && propositions.length === 0 && (
            <Empty>Aucune proposition en attente.</Empty>
          )}

          {propositions.map(event => (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle>{event.titre}</CardTitle>
              </CardHeader>

              <CardBody>
                <Description>{event.description}</Description>

                <MetaRow>
                  <MetaBadge>📅 {event.date}</MetaBadge>
                  <MetaBadge>🕒 {event.heure}</MetaBadge>
                  <MetaBadge>🎲 {event.categorie}</MetaBadge>
                  <MetaBadge>⭐ {event.niveau}</MetaBadge>
                  <MetaBadge>👥 {event.places} places</MetaBadge>
                  <MetaBadge>👤 {event.organisateur}</MetaBadge>
                </MetaRow>

                <Actions>
                  <ValidateBtn onClick={() => accepterEvenement(event)}>
                    ✅ Valider
                  </ValidateBtn>
                  <RejectBtn onClick={() => supprimerProposition(event.id)}>
                    ❌ Refuser
                  </RejectBtn>
                </Actions>
              </CardBody>
            </Card>
          ))}
        </Grid>
      )}

      {/* ── Onglet Ressources ── */}
      {onglet === "ressources" && (
        <RessourcesLayout>

          {/* Formulaire */}
          <FormCard>
            <FormTitle>➕ Ajouter une ressource</FormTitle>

            <form onSubmit={handleSubmit}>
              <Field>
                <Label htmlFor="titre">Titre *</Label>
                <Input
                  id="titre"
                  placeholder="Ex : Manuel du joueur v5"
                  value={form.titre}
                  onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                />
              </Field>

              <Field>
                <Label htmlFor="type">Type *</Label>
                <Select
                  id="type"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as TypeRessource }))}
                >
                  {TYPES_RESSOURCE.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </Field>

              <Field>
                <Label htmlFor="univers">Univers *</Label>
                <Input
                  id="univers"
                  list="univers-list"
                  placeholder="Ex : Donjons & Dragons"
                  value={form.univers}
                  onChange={e => setForm(f => ({ ...f, univers: e.target.value }))}
                />
                <datalist id="univers-list">
                  {UNIVERS_SUGGESTIONS.map(u => <option key={u} value={u} />)}
                </datalist>
              </Field>

              <Field>
                <Label htmlFor="taille">Taille du fichier</Label>
                <Input
                  id="taille"
                  placeholder="Ex : 3.2 Mo"
                  value={form.taille}
                  onChange={e => setForm(f => ({ ...f, taille: e.target.value }))}
                />
              </Field>

              <Field>
                <Label htmlFor="url">Lien Mega *</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://mega.nz/file/..."
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                />
              </Field>

              <SubmitBtn type="submit" disabled={submitting}>
                {submitting ? "Ajout en cours…" : "Ajouter la ressource"}
              </SubmitBtn>

              {message?.type === "ok"  && <SuccessMsg>{message.text}</SuccessMsg>}
              {message?.type === "err" && <ErrorMsg>{message.text}</ErrorMsg>}
            </form>
          </FormCard>

          {/* Liste */}
          <div>
            <ListHeader>
              <ListTitle>Ressources en ligne</ListTitle>
              <ListCount>{ressources.length} fichier{ressources.length > 1 ? "s" : ""}</ListCount>
            </ListHeader>

            {loadingRes && <Loading>Chargement…</Loading>}

            {!loadingRes && ressources.length === 0 && (
              <Empty>Aucune ressource pour l'instant.</Empty>
            )}

            {ressources.map(r => (
              <RessourceItem key={r.id}>
                <ItemInfo>
                  <ItemTitre>{r.titre}</ItemTitre>
                  <ItemMeta>{r.univers} · {r.taille || "taille non renseignée"}</ItemMeta>
                </ItemInfo>

                <TypePill>
                  {TYPES_RESSOURCE.find(t => t.value === r.type)?.label ?? r.type}
                </TypePill>

                <LinkBtn href={r.url} target="_blank" rel="noopener noreferrer">↗</LinkBtn>

                <DeleteBtn onClick={() => supprimerRessource(r.id, r.titre)}>
                  Supprimer
                </DeleteBtn>
              </RessourceItem>
            ))}
          </div>

        </RessourcesLayout>
      )}
    </Page>
  );
}