"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styled from "styled-components";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Navigation from "@/components/Navigation";
import { EventDoc, TableMJ, formatJourComplet, getInitiales, inscrire, systemeHue } from "@/lib/jdr";

const Page = styled.main`
  min-height: 100vh; background: #0d0d14; color: #fff;
  font-family: 'Inter', system-ui, sans-serif; padding-bottom: 5rem;
`;

const Hero = styled.header<{ $hue: number; $img?: string }>`
  --h: ${p => p.$hue};
  position: relative;
  min-height: 340px;
  padding: 6.5rem 1.5rem 2.5rem;
  display: flex;
  align-items: flex-end;
  background:
    linear-gradient(180deg, rgba(13,13,20,0.25) 0%, #0d0d14 100%),
    ${p => p.$img
      ? `url(${p.$img}) center/cover`
      : `linear-gradient(150deg, hsl(var(--h) 55% 28%), hsl(calc(var(--h) + 40) 50% 10%))`};
`;

const Wrap = styled.div`max-width: 960px; margin: 0 auto; width: 100%;`;

const Back = styled(Link)`
  display: inline-block; margin-bottom: 1.2rem; font-size: 0.82rem;
  color: rgba(255,255,255,0.65); text-decoration: none;
  &:hover { color: #fff; }
`;

const Systeme = styled.span`
  display: inline-block; font-size: 0.78rem; font-weight: 600; padding: 3px 12px;
  border-radius: 999px; background: hsl(var(--h) 70% 55% / 0.3);
  border: 1px solid hsl(var(--h) 80% 75% / 0.5); margin-bottom: 0.7rem;
`;

const H1 = styled.h1`
  margin: 0 0 0.4rem; font: 800 clamp(2rem, 6vw, 3.2rem)/1.05 'Fraunces', Georgia, serif;
`;

const Sub = styled.p`margin: 0; color: rgba(255,255,255,0.65); font-size: 0.95rem;`;

const Grid = styled.div`
  max-width: 960px; margin: 0 auto; padding: 0 1.5rem;
  display: grid; grid-template-columns: 1fr 300px; gap: 2rem;
  @media (max-width: 800px) { grid-template-columns: 1fr; }
`;

const Prose = styled.section`
  font: 400 1.02rem/1.75 'Fraunces', Georgia, serif;
  color: rgba(255,255,255,0.82);
  max-width: 62ch;
  white-space: pre-line;
`;

const Tags = styled.div`display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0 0 1.5rem;`;
const Tag = styled.span`
  font-size: 0.78rem; padding: 4px 11px; border-radius: 999px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.7);
`;

const Aside = styled.aside`
  position: sticky; top: 5.5rem; align-self: start;
  padding: 1.3rem; border-radius: 16px;
  background: rgba(255,255,255,0.04); border: 1px solid hsl(var(--h) 60% 70% / 0.3);
  display: flex; flex-direction: column; gap: 1rem;
  @media (max-width: 800px) { position: static; }
`;

const SeatsRow = styled.div`display: flex; flex-wrap: wrap; gap: 7px;`;
const Seat = styled.i<{ $taken: boolean }>`
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid hsl(var(--h) 85% 78%);
  background: ${p => (p.$taken ? "hsl(var(--h) 85% 78%)" : "transparent")};
`;

const MjRow = styled.div`
  display: flex; align-items: center; gap: 0.7rem; font-size: 0.9rem;
  & b {
    width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center;
    background: hsl(var(--h) 70% 55% / 0.4); font-size: 0.8rem;
  }
  & small { display: block; color: rgba(255,255,255,0.5); font-size: 0.74rem; }
`;

const Cta = styled.button`
  padding: 0.8rem 1rem; border-radius: 10px; font-size: 0.92rem; font-weight: 700; cursor: pointer;
  background: hsl(var(--h) 70% 55% / 0.3); border: 1px solid hsl(var(--h) 80% 75% / 0.6); color: #fff;
  &:hover:not(:disabled) { background: hsl(var(--h) 70% 55% / 0.5); }
  &:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Note = styled.p<{ $ok?: boolean }>`
  margin: 0; font-size: 0.82rem; line-height: 1.5;
  color: ${p => (p.$ok ? "#7dffb3" : "rgba(255,255,255,0.55)")};
`;

export default function TableClient() {
  const { slug, lieu, eventId, tableId } = useParams<{ slug: string; lieu: string; eventId: string; tableId: string }>();
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [table, setTable] = useState<TableMJ | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [pseudo, setPseudo] = useState("");
  const [statut, setStatut] = useState<"confirme" | "attente" | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventId || !tableId) return;
    (async () => {
      const [e, t] = await Promise.all([
        getDoc(doc(db, "evenements", eventId)),
        getDoc(doc(db, "evenements", eventId, "tables", tableId)),
      ]);
      if (e.exists()) setEvent({ id: e.id, ...e.data() } as EventDoc);
      if (t.exists()) setTable({ id: t.id, inscrits: 0, ...t.data() } as TableMJ);
      setLoading(false);
    })().catch(() => setLoading(false));
  }, [eventId, tableId]);

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u);
    if (!u || !eventId) return;
    const prof = await getDoc(doc(db, "users", u.uid));
    setPseudo(prof.data()?.pseudo || "");
    const mine = await getDocs(query(collection(db, "evenements", eventId, "inscriptions"), where("userId", "==", u.uid)));
    if (!mine.empty) setStatut(mine.docs[0].data().statut);
  }), [eventId]);

  if (loading) return <Page><Navigation /></Page>;
  if (!event || !table || (table.status !== "approved")) {
    return (
      <Page><Navigation />
        <Wrap style={{ paddingTop: "8rem", textAlign: "center" }}>
          <p>Cette table n&apos;existe pas ou n&apos;est pas encore validée.</p>
          <Back href={`/evenements/${slug}/${lieu}`}>Retour aux animations</Back>
        </Wrap>
      </Page>
    );
  }

  const hue = systemeHue(table.systeme);
  const dispo = table.placesMax - (table.inscrits ?? 0);
  const complet = dispo <= 0;
  const pips = table.placesMax <= 12;

  async function onRegister() {
    if (!user) { window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`; return; }
    setBusy(true); setError("");
    try {
      const s = await inscrire({ event: event!, table: table!, slug, user: { uid: user.uid, pseudo, email: user.email || "" } });
      setStatut(s);
      if (s === "confirme") setTable(t => t && { ...t, inscrits: (t.inscrits ?? 0) + 1 });
    } catch (e: any) {
      setError(e.message || "L'inscription a échoué. Réessayez dans un instant.");
    } finally { setBusy(false); }
  }

  return (
    <Page style={{ ["--h" as any]: hue }}>
      <Navigation />
      <Hero $hue={hue} $img={table.image}>
        <Wrap>
          <Back href={`/evenements/${slug}/${lieu}/${eventId}`}>← {event.titre}</Back><br />
          <Systeme>{table.systeme}</Systeme>
          <H1>Table de {table.mjNom}</H1>
          <Sub>{formatJourComplet(event.date)} à {event.heure}{event.ville ? `, ${event.ville}` : ""}</Sub>
        </Wrap>
      </Hero>

      <Grid>
        <div>
          <Tags>
            {table.duree && <Tag>⏱ {table.duree}</Tag>}
            {table.personnages && <Tag>{table.personnages === "pretires" ? "🧾 Prétirés fournis" : "✏️ Création à la table"}</Tag>}
            <Tag>{table.ageTag === "18" ? "18+ : contenu explicite" : table.ageTag === "16" ? "16+ : thèmes matures" : "Tous publics"}</Tag>
          </Tags>
          <Prose>{table.description}</Prose>
        </div>

        <Aside>
          <MjRow><b>{getInitiales(table.mjNom)}</b><div>{table.mjNom}<small>Maître du jeu</small></div></MjRow>

          <div>
            {pips
              ? <SeatsRow role="img" aria-label={`${table.inscrits} places prises sur ${table.placesMax}`}>
                  {Array.from({ length: table.placesMax }, (_, i) => <Seat key={i} $taken={i < (table.inscrits ?? 0)} />)}
                </SeatsRow>
              : <strong>{table.inscrits}/{table.placesMax}</strong>}
            <Note style={{ marginTop: "0.5rem" }}>
              {complet ? "La table est complète : vous pouvez rejoindre la liste d'attente." : `${dispo} place${dispo > 1 ? "s" : ""} libre${dispo > 1 ? "s" : ""} sur ${table.placesMax}.`}
            </Note>
          </div>

          {statut ? (
            <Note $ok>{statut === "confirme" ? "Vous êtes inscrit à cette animation." : "Vous êtes sur la liste d'attente."} Pour vous désinscrire, passez par la page de l&apos;animation.</Note>
          ) : (
            <Cta onClick={onRegister} disabled={busy}>
              {busy ? "Inscription…" : !user ? "Se connecter pour s'inscrire" : complet ? "Rejoindre la liste d'attente" : "Réserver ma place"}
            </Cta>
          )}
          {error && <Note role="alert" style={{ color: "#ff8080" }}>{error}</Note>}
        </Aside>
      </Grid>
    </Page>
  );
}