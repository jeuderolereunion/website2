"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styled from "styled-components";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Navigation from "@/components/Navigation";
import TableCard from "@/components/TableCard";
import { EventDoc, TableMJ, formatJourComplet, inscrire, systemeHue } from "@/lib/jdr";

// ─── Styles ──────────────────────────────────────────────────────────────────

const Page = styled.main`
  min-height: 100vh; background: #0d0d14; color: #fff;
  font-family: 'Inter', system-ui, sans-serif; padding-bottom: 5rem;
`;
const Wrap = styled.div`max-width: 1040px; margin: 0 auto; padding: 0 1.5rem;`;

const Hero = styled.header<{ $hue: number; $img?: string }>`
  --h: ${p => p.$hue};
  min-height: 380px;
  padding: 6.5rem 0 2.5rem;
  display: flex; align-items: flex-end;
  background:
    linear-gradient(180deg, rgba(13,13,20,0.2) 0%, #0d0d14 100%),
    ${p => p.$img
      ? `url(${p.$img}) center/cover`
      : `linear-gradient(150deg, hsl(var(--h) 55% 28%), hsl(calc(var(--h) + 40) 50% 10%))`};
`;
const Back = styled(Link)`
  font-size: 0.82rem; color: rgba(255,255,255,0.7); text-decoration: none;
  &:hover { color: #fff; }
`;
const H1 = styled.h1`margin: 1rem 0 0.5rem; font: 800 clamp(2.1rem, 6vw, 3.4rem)/1.05 'Fraunces', Georgia, serif;`;
const Accroche = styled.p`margin: 0 0 1rem; max-width: 52ch; font: 400 1.15rem/1.5 'Fraunces', Georgia, serif; color: rgba(255,255,255,0.85);`;
const When = styled.p`margin: 0; font-size: 0.95rem; color: rgba(255,255,255,0.7);`;

const Layout = styled.div`
  display: grid; grid-template-columns: 1fr 320px; gap: 3rem; align-items: start;
  @media (max-width: 860px) { grid-template-columns: 1fr; gap: 2rem; }
`;

const Section = styled.section`margin-top: 2.6rem; &:first-child { margin-top: 2rem; }`;
const H2 = styled.h2`margin: 0 0 1rem; font: 700 1.5rem/1.2 'Fraunces', Georgia, serif;`;
const Prose = styled.p`
  margin: 0; max-width: 62ch; white-space: pre-line;
  font: 400 1.02rem/1.8 'Fraunces', Georgia, serif; color: rgba(255,255,255,0.82);
`;

// Programme : ici la numérotation par heure est justifiée, c'est un déroulé.
const Timeline = styled.ol`
  list-style: none; margin: 0; padding: 0; position: relative;
  &::before {
    content: ""; position: absolute; left: 4.6rem; top: 0.5rem; bottom: 0.5rem;
    width: 1px; background: rgba(255,255,255,0.14);
  }
`;
const Step = styled.li`
  display: grid; grid-template-columns: 4rem 1fr; gap: 1.6rem;
  padding: 0.7rem 0; position: relative;
  &::after {
    content: ""; position: absolute; left: calc(4rem + 0.8rem - 4px + 0.1rem); top: 1.15rem;
    width: 9px; height: 9px; border-radius: 50%;
    background: hsl(var(--h) 80% 70%);
  }
`;
const Hour = styled.time`font: 700 0.95rem/1.6 'Fraunces', Georgia, serif; color: hsl(var(--h) 80% 80%); text-align: right;`;
const StepTitle = styled.p`margin: 0; font-weight: 600; font-size: 1rem;`;
const StepDetail = styled.p`margin: 0.2rem 0 0; font-size: 0.88rem; line-height: 1.55; color: rgba(255,255,255,0.6);`;

const Offers = styled.ul`
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 1rem 1.6rem;
`;
const Offer = styled.li`display: grid; grid-template-columns: 2rem 1fr; gap: 0.7rem;`;
const OfferIcon = styled.span`font-size: 1.5rem; line-height: 1.2;`;

const Cards = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.1rem;`;
const Soft = styled.p`margin: 0; color: rgba(255,255,255,0.55); font-size: 0.9rem; line-height: 1.6;`;

// Colonne de droite : l'inscription n'est qu'un bloc parmi d'autres
const Aside = styled.aside`
  position: sticky; top: 5.5rem; margin-top: 2rem;
  display: flex; flex-direction: column; gap: 1.2rem;
  @media (max-width: 860px) { position: static; margin-top: 0; }
`;
const Box = styled.div`
  padding: 1.2rem; border-radius: 14px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
`;
const Facts = styled.dl`
  margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 0.55rem 1rem; font-size: 0.86rem;
  & dt { color: rgba(255,255,255,0.45); }
  & dd { margin: 0; color: rgba(255,255,255,0.88); }
`;
const Btn = styled.button`
  width: 100%; padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.9rem; font-weight: 700; cursor: pointer;
  background: hsl(var(--h) 70% 55% / 0.3); border: 1px solid hsl(var(--h) 80% 75% / 0.6); color: #fff;
  &:hover:not(:disabled) { background: hsl(var(--h) 70% 55% / 0.5); }
  &:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
const Ghost = styled(Btn)`background: transparent; border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.75); font-weight: 600;`;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AnimationPage() {
  const { slug, lieu, eventId } = useParams<{ slug: string; lieu: string; eventId: string }>();
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [tables, setTables] = useState<TableMJ[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [pseudo, setPseudo] = useState("");
  const [statut, setStatut] = useState<"confirme" | "attente" | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");

  useEffect(() => {
    (async () => {
      const e = await getDoc(doc(db, "evenements", eventId));
      if (e.exists()) setEvent({ id: e.id, ...e.data() } as EventDoc);
      const t = await getDocs(collection(db, "evenements", eventId, "tables"));
      setTables(t.docs.map(d => ({ id: d.id, inscrits: 0, ...d.data() })) as TableMJ[]);
    })().catch(() => {});
  }, [eventId]);

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u);
    if (!u) return;
    setPseudo((await getDoc(doc(db, "users", u.uid))).data()?.pseudo || "");
    const mine = await getDocs(query(collection(db, "evenements", eventId, "inscriptions"), where("userId", "==", u.uid)));
    if (!mine.empty) setStatut(mine.docs[0].data().statut);
  }), [eventId]);

  if (!event) return <Page><Navigation /></Page>;

  const hue = systemeHue(event.systeme || event.titre);
  const dispo = event.places - (event.inscrits ?? 0);
  const approuvees = tables.filter(t => t.status === "approved");

  async function registerGeneral() {
    if (!user) { window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`; return; }
    setBusy(true); setInfo("");
    try {
      setStatut(await inscrire({ event: event!, table: null, slug, user: { uid: user.uid, pseudo, email: user.email || "" } }));
    } catch (e: any) { setInfo(e.message || "L'inscription a échoué."); }
    finally { setBusy(false); }
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: event!.titre, url });
      else { await navigator.clipboard.writeText(url); setInfo("Lien copié."); }
    } catch { /* partage annulé */ }
  }

  const facts: [string, string][] = [
    ["Quand", `${formatJourComplet(event.date)}, ${event.heure}`],
    ...(event.duree ? [["Durée", event.duree] as [string, string]] : []),
    ...(event.adresse || event.ville ? [["Où", [event.adresse, event.ville].filter(Boolean).join(", ")] as [string, string]] : []),
    ...(event.tarif ? [["Tarif", event.tarif] as [string, string]] : []),
    ...(event.ageMin ? [["Âge", `à partir de ${event.ageMin} ans`] as [string, string]] : []),
    ...(event.debutants !== undefined ? [["Débutants", event.debutants ? "Bienvenus" : "Expérience conseillée"] as [string, string]] : []),
    ...(event.aApporter ? [["À apporter", event.aApporter]  as [string, string]] : []),
  ];

  return (
    <Page style={{ ["--h" as any]: hue }}>
      <Navigation />

      <Hero $hue={hue} $img={event.image}>
        <Wrap>
          <Back href={`/evenements/${slug}/${lieu}`}>← Toutes les animations</Back>
          <H1>{event.titre}</H1>
          {event.accroche && <Accroche>{event.accroche}</Accroche>}
          <When>{formatJourComplet(event.date)} à {event.heure}{event.ville ? `, ${event.ville}` : ""}</When>
        </Wrap>
      </Hero>

      <Wrap>
        <Layout>
          <div>
            {event.description && (
              <Section>
                <H2>De quoi s&apos;agit-il ?</H2>
                <Prose>{event.description}</Prose>
              </Section>
            )}

            {event.programme && event.programme.length > 0 && (
              <Section>
                <H2>Au programme</H2>
                <Timeline>
                  {event.programme.map((p, i) => (
                    <Step key={i}>
                      <Hour>{p.heure}</Hour>
                      <div>
                        <StepTitle>{p.titre}</StepTitle>
                        {p.detail && <StepDetail>{p.detail}</StepDetail>}
                      </div>
                    </Step>
                  ))}
                </Timeline>
              </Section>
            )}

            {event.propose && event.propose.length > 0 && (
              <Section>
                <H2>Ce qu&apos;on vous propose</H2>
                <Offers>
                  {event.propose.map((o, i) => (
                    <Offer key={i}>
                      <OfferIcon aria-hidden>{o.icone || "✦"}</OfferIcon>
                      <div>
                        <StepTitle>{o.titre}</StepTitle>
                        {o.detail && <StepDetail>{o.detail}</StepDetail>}
                      </div>
                    </Offer>
                  ))}
                </Offers>
              </Section>
            )}

            <Section>
              <H2>Les tables de jeu</H2>
              {approuvees.length === 0
                ? <Soft>Aucun MJ n&apos;a encore proposé de table. Vous pouvez quand même vous inscrire : les tables sont réparties à l&apos;arrivée.</Soft>
                : <Cards>{approuvees.map(t => <TableCard key={t.id} table={t} href={`/evenements/${slug}/${lieu}/${eventId}/tables/${t.id}`} />)}</Cards>}
            </Section>
          </div>

          <Aside>
            {facts.length > 0 && (
              <Box>
                <Facts>
                  {facts.map(([k, v]) => (<><dt key={k}>{k}</dt><dd key={k + v}>{v}</dd></>))}
                </Facts>
              </Box>
            )}
            <Box>
              <Soft style={{ marginBottom: "0.8rem" }}>
                {statut
                  ? (statut === "confirme" ? "Vous êtes inscrit." : "Vous êtes sur la liste d'attente.")
                  : dispo <= 0 ? "L'animation est complète, la liste d'attente est ouverte." : `${dispo} place${dispo > 1 ? "s" : ""} restante${dispo > 1 ? "s" : ""}.`}
              </Soft>
              {!statut && (
                <Btn onClick={registerGeneral} disabled={busy} style={{ marginBottom: "0.6rem" }}>
                  {!user ? "Se connecter pour s'inscrire" : dispo <= 0 ? "Rejoindre la liste d'attente" : "Je m'inscris"}
                </Btn>
              )}
              <Ghost onClick={share}>Partager cette animation</Ghost>
              {info && <Soft role="status" style={{ marginTop: "0.7rem" }}>{info}</Soft>}
            </Box>
          </Aside>
        </Layout>
      </Wrap>
    </Page>
  );
}