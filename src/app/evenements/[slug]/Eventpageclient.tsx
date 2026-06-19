"use client";
import { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { runTransaction } from "firebase/firestore";

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  increment,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Page = styled.main`
  min-height: 100vh;
  background: #0d0d14;
  color: #fff;
  font-family: 'Inter', system-ui, sans-serif;
  padding: 0 0 5rem;
`;

const Hero = styled.section`
  position: relative;
  padding: 5rem 1.5rem 3.5rem;
  text-align: center;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(120, 80, 255, 0.18) 0%, transparent 70%);
    pointer-events: none;
  }
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 500;
  color: rgba(255,255,255,0.5);
  text-decoration: none;
  margin-bottom: 2rem;
  transition: color 150ms;
  &:hover { color: rgba(255,255,255,0.85); }
`;

const HeroIcon = styled.span`
  font-size: 3.5rem;
  display: block;
  margin-bottom: 1rem;
  animation: ${fadeUp} 0.4s ease both;
`;

const HeroTitle = styled.h1`
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 800;
  margin: 0 0 0.75rem;
  letter-spacing: -0.02em;
  animation: ${fadeUp} 0.45s ease 0.05s both;
`;

const HeroSubtitle = styled.p`
  font-size: 1rem;
  color: rgba(255,255,255,0.55);
  max-width: 520px;
  margin: 0 auto;
  line-height: 1.6;
  animation: ${fadeUp} 0.45s ease 0.1s both;
`;

const FiltersRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0 1.5rem;
  margin-bottom: 2.5rem;
`;

const FilterBtn = styled.button<{ $active: boolean }>`
  padding: 0.4rem 1rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid ${p => p.$active ? 'rgba(160,120,255,0.7)' : 'rgba(255,255,255,0.15)'};
  background: ${p => p.$active ? 'rgba(120,80,255,0.2)' : 'transparent'};
  color: ${p => p.$active ? '#c8a8ff' : 'rgba(255,255,255,0.5)'};
  transition: all 150ms;
  &:hover { border-color: rgba(160,120,255,0.5); color: #c8a8ff; }
`;

const Section = styled.section`
  max-width: 960px;
  margin: 0 auto;
  padding: 0 1.5rem;
`;

const SectionLabel = styled.p`
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(160,120,255,0.8);
  margin: 0 0 1rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 3rem;
`;

const Card = styled.article`
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  overflow: hidden;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
  animation: ${fadeUp} 0.4s ease both;
  display: flex;
  flex-direction: column;
  &:hover {
    transform: translateY(-3px);
    background: rgba(255,255,255,0.08);
    border-color: rgba(160,120,255,0.3);
  }
`;

const CardHeader = styled.div`
  padding: 1.25rem 1.25rem 0.75rem;
  background: linear-gradient(135deg, rgba(80,60,160,0.3) 0%, rgba(40,30,80,0.1) 100%);
`;

const CardDate = styled.time`
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.6);
  display: block;
  margin-bottom: 0.4rem;
`;

const CardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.3;
`;

const CardBody = styled.div`
  padding: 0.9rem 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const CardMeta = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
`;

const MetaBadge = styled.span`
  font-size: 0.75rem;
  color: rgba(255,255,255,0.5);
  display: flex;
  align-items: center;
  gap: 0.3rem;
`;

const CardDesc = styled.p`
  font-size: 0.85rem;
  color: rgba(255,255,255,0.6);
  margin: 0 0 1rem;
  line-height: 1.55;
  flex: 1;
`;

const RegisterBtn = styled.button`
  display: inline-block;
  padding: 0.45rem 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 8px;
  background: rgba(120,80,255,0.2);
  border: 1px solid rgba(160,120,255,0.4);
  color: #c8a8ff;
  cursor: pointer;
  transition: background 150ms, border-color 150ms;
  width: fit-content;
  &:hover { background: rgba(120,80,255,0.35); border-color: rgba(160,120,255,0.7); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 1rem;
  color: rgba(255,255,255,0.35);
  font-size: 0.95rem;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 4rem 1rem;
  color: rgba(255,255,255,0.3);
  font-size: 0.9rem;
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const Modal = styled.div`
  background: #1a1a2e;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  padding: 2rem;
  width: 100%;
  max-width: 440px;
  animation: ${fadeUp} 0.25s ease both;
`;

const ModalTitle = styled.h2`
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 0.4rem;
`;

const ModalSubtitle = styled.p`
  font-size: 0.85rem;
  color: rgba(255,255,255,0.5);
  margin: 0 0 1.5rem;
`;

const Field = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(255,255,255,0.6);
  margin-bottom: 0.35rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.6rem 0.9rem;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color 150ms;
  &:focus { border-color: rgba(160,120,255,0.6); }
  &::placeholder { color: rgba(255,255,255,0.25); }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

const CancelBtn = styled.button`
  flex: 1;
  padding: 0.6rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: rgba(255,255,255,0.5);
  font-size: 0.85rem;
  cursor: pointer;
  &:hover { background: rgba(255,255,255,0.05); }
`;

const ConfirmBtn = styled.button`
  flex: 2;
  padding: 0.6rem;
  border-radius: 8px;
  border: 1px solid rgba(160,120,255,0.5);
  background: rgba(120,80,255,0.25);
  color: #c8a8ff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: rgba(120,80,255,0.4); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const SuccessMsg = styled.div`
  text-align: center;
  padding: 1rem 0;
  color: #7dffb3;
  font-size: 0.95rem;
`;

type EventDoc = {
  id: string;
  titre: string;
  date: string;
  heure: string;
  places: number;
  inscrits: number;
  niveau: string;
  organisateur : string, 
  description: string;
  categorie: string;
};

const categories: Record<string, { icon: string; title: string; subtitle: string }> = {
  "soirees-jdr": { icon: "🎲", title: "Soirées JDR", subtitle: "Sessions de jeu de rôle régulières ouvertes à tous les niveaux." },
  "tournois": { icon: "🏆", title: "Tournois", subtitle: "Compétitions amicales entre joueurs pour tester vos compétences." },
  "soirees-jeux": { icon: "🃏", title: "Soirées Jeux", subtitle: "Jeux de société et de plateau pour varier les plaisirs." },
  "initiations": { icon: "📖", title: "Initiations", subtitle: "Ateliers pour découvrir le jeu de rôle de zéro, dans un cadre bienveillant." },
};

export default function EventPageClient({ slug }: { slug: string }) {
  const cat = categories[slug];
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const [selectedEvent, setSelectedEvent] = useState<EventDoc | null>(null);
  const [form, setForm] = useState({ nom: "", email: "", pseudo: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);




  useEffect(() => {
  const q = query(collection(db, "evenements"));

  const unsub = onSnapshot(q, (snap) => {
    console.log("Documents:", snap.size);

    const data = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(data);

    setEvents(data as EventDoc[]);
    setLoading(false);
  });

  return () => unsub();
}, []);

  async function handleSubmit() {
  if (!selectedEvent || !form.nom || !form.email) {
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(form.email)) {
    alert("Adresse email invalide");
    return;
  }

  setSubmitting(true);
await runTransaction(db, async (transaction) => {
  const eventRef = doc(db, "evenements", selectedEvent.id);
  const eventSnap = await transaction.get(eventRef);

  if (!eventSnap.exists()) {
    throw new Error("Événement introuvable");
  }

  const data = eventSnap.data();

  const placesDispo =
    data.places - (data.inscrits || 0);

  if (placesDispo <= 0) {
    throw new Error("Événement complet");
  }

  transaction.update(eventRef, {
    inscrits: increment(1),
  });
});
  try {
    // Vérifier si déjà inscrit
    const existingQuery = query(
  collection(db, "inscriptions"),
  where("eventId", "==", selectedEvent.id),
  where("email", "==", form.email)
);

const existing = await getDocs(existingQuery);

if (!existing.empty) {
  alert("Vous êtes déjà inscrit.");
  return;
}

    // Vérifier les places restantes
    const placesDispo =
      selectedEvent.places - (selectedEvent.inscrits ?? 0);

    if (placesDispo <= 0) {
      alert("Cet événement est complet.");
      setSubmitting(false);
      return;
    }

    // Enregistrer l'inscription
    await addDoc(collection(db, "inscriptions"), {
      eventId: selectedEvent.id,
      eventTitle: selectedEvent.titre,
      categorie: slug,
      nom: form.nom,
      email: form.email,
      pseudo: form.pseudo,
      createdAt: serverTimestamp(),
    });

    // Incrémenter le nombre d'inscrits
    await updateDoc(
      doc(db, "evenements", selectedEvent.id),
      {
        inscrits: increment(1),
      }
    );

    // Envoyer le mail
    const mailResponse = await fetch(
      "/api/inscription",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nom: form.nom,
          email: form.email,
          eventTitle: selectedEvent.titre,
          date: selectedEvent.date,
          time: selectedEvent.heure,
        }),
      }
    );

    if (!mailResponse.ok) {
      console.warn(
        "Inscription enregistrée mais email non envoyé."
      );
    }

    setSuccess(true);

  } catch (error) {
    console.error(error);
    alert(
      "Une erreur est survenue lors de l'inscription."
    );
  } finally {
    setSubmitting(false);
  }
}

  function closeModal() {
    setSelectedEvent(null);
    setForm({ nom: "", email: "", pseudo: "" });
    setSuccess(false);
  }
async function createEvent() {
  try {
    await addDoc(collection(db, "evenements"), {
      
      categorie: slug,
      inscrits: 0,
      createdAt: serverTimestamp(),
    });

    setShowCreateModal(false);


  } catch (error) {
    console.error(error);
  }
}
  if (!cat) {
    return (
      <Page>
        <Hero>
          <BackLink href="/#events">← Retour aux événements</BackLink>
          <HeroTitle>Page introuvable</HeroTitle>
          <HeroSubtitle>Cette catégorie n&apos;existe pas.</HeroSubtitle>
        </Hero>
      </Page>
    );
  }

  const now = new Date().toISOString().split("T")[0];
  const filtered = events.filter(e => {
    if (filter === "upcoming") return e.date >= now;
    if (filter === "past") return e.date < now;
    return true;
  });
  const upcoming = filtered.filter(e => e.date >= now);
  const past = filtered.filter(e => e.date < now);

  return (
    <Page>
      <Hero>
        <BackLink href="/#events">← Tous les événements</BackLink>
        <HeroIcon>{cat.icon}</HeroIcon>
        <HeroTitle>{cat.title}</HeroTitle>
        <HeroSubtitle>{cat.subtitle}</HeroSubtitle>
      </Hero>
     <Link href="/proposer-evenement">
  <RegisterBtn as="span">
    ➕ Proposer un événement
  </RegisterBtn>
</Link>
      <FiltersRow>
        {(["all", "upcoming", "past"] as const).map(f => (
          <FilterBtn key={f} $active={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? "Tous" : f === "upcoming" ? "À venir" : "Passés"}
          </FilterBtn>
        ))}
      </FiltersRow>

      <Section>
        {loading && <LoadingState>Chargement des événements...</LoadingState>}
        {!loading && filtered.length === 0 && (
          <EmptyState>Aucun événement pour le moment. Revenez bientôt !</EmptyState>
        )}
        {!loading && upcoming.length > 0 && (
          <>
            <SectionLabel>À venir</SectionLabel>
            <Grid>
              {upcoming.map((event, i) => {
                const placesDispo = event.places - (event.inscrits ?? 0);
                const complet = placesDispo <= 0;
                return (
                  <Card key={event.id} style={{ animationDelay: `${i * 0.06}s` }}>
                    <CardHeader>
                      <CardDate dateTime={event.date}>{event.date} · {event.heure}</CardDate>
                      <CardTitle>{event.titre}</CardTitle>
                    </CardHeader>
                    <CardBody>
                      <CardMeta>
                        <MetaBadge>👤 {complet ? "Complet" : `${placesDispo} place${placesDispo > 1 ? "s" : ""} dispo`}</MetaBadge>
                        <MetaBadge>⭐ {event.niveau}</MetaBadge>
                      </CardMeta>
                      <CardDesc>{event.description}</CardDesc>
                      <RegisterBtn disabled={complet} onClick={() => !complet && setSelectedEvent(event)}>
                        {complet ? "Complet" : "S'inscrire →"}
                      </RegisterBtn>
                    </CardBody>
                  </Card>
                );
              })}
            </Grid>
          </>
        )}
        {!loading && past.length > 0 && (
          <>
            <SectionLabel>Événements passés</SectionLabel>
            <Grid>
              {past.map((event, i) => (
                <Card key={event.id} style={{ animationDelay: `${i * 0.06}s`, opacity: 0.55 }}>
                  <CardHeader>
                    <CardDate dateTime={event.date}>{event.date} · {event.heure}</CardDate>
                    <CardTitle>{event.titre}</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <CardMeta>
                      <MetaBadge>👤 {event.places} places</MetaBadge>
                      <MetaBadge>⭐ {event.niveau}</MetaBadge>
                    </CardMeta>
                    <CardDesc>{event.description}</CardDesc>
                    <CardDesc>{event.organisateur}</CardDesc>
                  </CardBody>
                </Card>
              ))}
            </Grid>
          </>
        )}
      </Section>

      {selectedEvent && (
        <Overlay onClick={closeModal}>
          <Modal onClick={e => e.stopPropagation()}>
            {!success ? (
              <>
                <ModalTitle>S&apos;inscrire</ModalTitle>
                <ModalSubtitle>{selectedEvent.titre} · {selectedEvent.date} à {selectedEvent.heure}</ModalSubtitle>
                <Field>
                  <Label>Nom *</Label>
                  <Input placeholder="Jean Dupont" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
                </Field>
                <Field>
                  <Label>Email *</Label>
                  <Input type="email" placeholder="jean@exemple.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </Field>
                <Field>
                  
                </Field>
                <ModalActions>
                  <CancelBtn onClick={closeModal}>Annuler</CancelBtn>
                  <ConfirmBtn onClick={handleSubmit} disabled={submitting || !form.nom || !form.email}>
                    {submitting ? "Envoi..." : "Confirmer l'inscription"}
                  </ConfirmBtn>
                </ModalActions>
              </>
            ) : (
              <>
                <SuccessMsg>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🎉</div>
                  <strong>Inscription confirmée !</strong>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    On te recontacte à <strong>{form.email}</strong> pour les détails.
                  </p>
                </SuccessMsg>
                <ModalActions>
                  <ConfirmBtn onClick={closeModal}>Fermer</ConfirmBtn>
                </ModalActions>
              </>
            )}
          </Modal>
        </Overlay>
        
      )}
    </Page>
    
  );
}