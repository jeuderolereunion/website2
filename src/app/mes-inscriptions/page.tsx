"use client";

import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import Navigation from "@/components/Navigation";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  runTransaction,
  increment,
  getDoc,
} from "firebase/firestore";

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Styled components ────────────────────────────────────────────────────────

const Page = styled.main`
  min-height: 100vh;
  background: #0d0d14;
  color: #fff;
  padding: 6rem 1rem 4rem;
`;

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  font-weight: 800;
  margin-bottom: 0.4rem;
`;

const Subtitle = styled.p`
  color: rgba(255,255,255,0.5);
  font-size: 0.92rem;
  margin-bottom: 2.5rem;
`;

const Card = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 14px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1rem;
  animation: ${fadeUp} 0.3s ease both;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  @media (min-width: 560px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
`;

const EventTitle = styled.p`
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 0.3rem;
`;

const EventMeta = styled.p`
  font-size: 0.82rem;
  color: rgba(255,255,255,0.5);
`;

const StatusPill = styled.span<{ $past?: boolean }>`
  display: inline-block;
  margin-top: 0.4rem;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
  background: ${p => p.$past ? "rgba(255,255,255,0.08)" : "rgba(120,80,255,0.2)"};
  color: ${p => p.$past ? "rgba(255,255,255,0.4)" : "#c8a8ff"};
`;

const CancelBtn = styled.button`
  padding: 0.55rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255,80,80,0.25);
  background: rgba(255,80,80,0.08);
  color: #ff9a9a;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;

  &:hover:not(:disabled) { background: rgba(255,80,80,0.18); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const Empty = styled.div`
  text-align: center;
  padding: 4rem 1rem;
  color: rgba(255,255,255,0.35);
`;

const Loading = styled.div`
  text-align: center;
  padding: 4rem 1rem;
  color: rgba(255,255,255,0.3);
`;

const BrowseLink = styled(Link)`
  display: inline-block;
  margin-top: 1rem;
  color: #c8a8ff;
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type Inscription = {
  id: string;
  eventId: string;
  eventTitle: string;
  categorie: string;
  createdAt?: any;
};

// ─── Composant ────────────────────────────────────────────────────────────────

export default function MesInscriptionsPage() {
  const [user, setUser]               = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loading, setLoading]         = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
      if (!u) window.location.href = "/login?redirect=/mes-inscriptions";
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "inscriptions"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setInscriptions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Inscription[]);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  async function annuler(inscription: Inscription) {
    if (!confirm(`Annuler votre inscription à "${inscription.eventTitle}" ?`)) return;

    setCancellingId(inscription.id);
    try {
      // Libère une place sur l'événement, si celui-ci existe encore
      const eventRef = doc(db, "evenements", inscription.eventId);
      const eventSnap = await getDoc(eventRef);

      if (eventSnap.exists()) {
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(eventRef);
          if (snap.exists()) {
            transaction.update(eventRef, { inscrits: increment(-1) });
          }
        });
      }

      await deleteDoc(doc(db, "inscriptions", inscription.id));
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'annulation. Réessayez.");
    } finally {
      setCancellingId(null);
    }
  }

  if (!authChecked || loading) {
    return (
      <Page>
        <Navigation />
        <Container>
          <Loading>Chargement…</Loading>
        </Container>
      </Page>
    );
  }

  return (
    <Page>
      <Navigation />
      <Container>
        <Title>🎟️ Mes inscriptions</Title>
        <Subtitle>Retrouvez ici toutes les parties auxquelles vous êtes inscrit.</Subtitle>

        {inscriptions.length === 0 ? (
          <Empty>
            Vous n'êtes inscrit à aucun événement pour le moment.
            <br />
            <BrowseLink href="/#events">Parcourir les événements →</BrowseLink>
          </Empty>
        ) : (
          inscriptions.map((insc, i) => (
            <Card key={insc.id} style={{ animationDelay: `${i * 0.05}s` }}>
              <Info>
                <EventTitle>{insc.eventTitle}</EventTitle>
                <EventMeta>Catégorie : {insc.categorie}</EventMeta>
                <StatusPill>✓ Inscrit</StatusPill>
              </Info>
              <CancelBtn
                onClick={() => annuler(insc)}
                disabled={cancellingId === insc.id}
              >
                {cancellingId === insc.id ? "Annulation…" : "Annuler"}
              </CancelBtn>
            </Card>
          ))
        )}
      </Container>
    </Page>
  );
}