"use client";

import { useState } from "react";
import styled from "styled-components";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const Page = styled.main`
  min-height: 100vh;
  background: #0d0d14;
  color: white;
  padding: 3rem 1rem;
`;

const Container = styled.div`
  max-width: 700px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: rgba(255,255,255,0.6);
  margin-bottom: 2rem;
`;

const Card = styled.div`
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 1.5rem;
`;

const Field = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  color: white;
  box-sizing: border-box;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 0.75rem;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  color: white;
  resize: vertical;
  box-sizing: border-box;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  color: white;
  box-sizing: border-box;
`;

const Button = styled.button`
  width: 100%;
  padding: 0.9rem;
  border: none;
  border-radius: 10px;
  background: #7c4dff;
  color: white;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Success = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 10px;
  background: rgba(0,255,100,0.1);
  border: 1px solid rgba(0,255,100,0.3);
`;

export default function ProposerEvenementPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    titre: "",
    description: "",
    categorie: "soirees-jdr",
    date: "",
    heure: "",
    niveau: "Débutant",
    places: 6,
    organisateur: "",
    email: "",
  });

  async function handleSubmit() {
    if (
      !form.titre ||
      !form.description ||
      !form.date ||
      !form.heure ||
      !form.organisateur
    ) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "propositions_evenements"), {
        titre: form.titre,
        description: form.description,
        categorie: form.categorie,
        date: form.date,
        heure: form.heure,
        niveau: form.niveau,
        places: Number(form.places),
        organisateur: form.organisateur,
        email: form.email,
        statut: "en_attente",
        createdAt: serverTimestamp(),
      });

      setSuccess(true);

      setForm({
        titre: "",
        description: "",
        categorie: "soirees-jdr",
        date: "",
        heure: "",
        niveau: "Débutant",
        places: 6,
        organisateur: "",
        email: "",
      });
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'envoi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <Container>
        <Title>➕ Proposer un événement</Title>

        <Subtitle>
          Propose une partie, un tournoi ou une animation. Un administrateur
          validera ensuite l'événement.
        </Subtitle>

        <Card>
          <Field>
            <Label>Titre *</Label>
            <Input
              value={form.titre}
              onChange={(e) =>
                setForm({ ...form, titre: e.target.value })
              }
            />
          </Field>

          <Field>
            <Label>Description *</Label>
            <TextArea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>

          <Field>
            <Label>Catégorie</Label>
            <Select
              value={form.categorie}
              onChange={(e) =>
                setForm({ ...form, categorie: e.target.value })
              }
            >
              <option value="soirees-jdr">Soirées JDR</option>
              <option value="tournois">Tournois</option>
              <option value="soirees-jeux">Soirées Jeux</option>
              <option value="initiations">Initiations</option>
            </Select>
          </Field>

          <Field>
            <Label>Date *</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) =>
                setForm({ ...form, date: e.target.value })
              }
            />
          </Field>

          <Field>
            <Label>Heure *</Label>
            <Input
              type="time"
              value={form.heure}
              onChange={(e) =>
                setForm({ ...form, heure: e.target.value })
              }
            />
          </Field>

          <Field>
            <Label>Niveau</Label>
            <Select
              value={form.niveau}
              onChange={(e) =>
                setForm({ ...form, niveau: e.target.value })
              }
            >
              <option>Débutant</option>
              <option>Intermédiaire</option>
              <option>Confirmé</option>
              <option>Tous niveaux</option>
            </Select>
          </Field>

          <Field>
            <Label>Nombre de places</Label>
            <Input
              type="number"
              min="1"
              value={form.places}
              onChange={(e) =>
                setForm({
                  ...form,
                  places: Number(e.target.value),
                })
              }
            />
          </Field>

          <Field>
            <Label>Nom de l'organisateur *</Label>
            <Input
              value={form.organisateur}
              onChange={(e) =>
                setForm({
                  ...form,
                  organisateur: e.target.value,
                })
              }
            />
          </Field>

          <Field>
            <Label>Email de contact</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
            />
          </Field>

          <Button onClick={handleSubmit} disabled={loading}>
            {loading
              ? "Envoi en cours..."
              : "Envoyer la proposition"}
          </Button>

          {success && (
            <Success>
              ✅ Proposition envoyée avec succès. Un administrateur
              l'examinera prochainement.
            </Success>
          )}
        </Card>
      </Container>
    </Page>
  );
}