"use client";

import styled, { keyframes } from "styled-components";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

type NiveauChoice = "debutant" | "confirme" | "expert";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Panel = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 16px;
  padding: 1.5rem;
  animation: ${fadeIn} 0.3s ease;
`;

const Title = styled.h3`
  font-size: 1rem;
  font-weight: 800;
  color: white;
  margin-bottom: 0.25rem;
`;

const Subtitle = styled.p`
  font-size: 0.82rem;
  color: rgba(255,255,255,0.45);
  margin-bottom: 1.1rem;
`;

const Group = styled.div`
  display: flex;
  gap: 0.75rem;

  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

const Card = styled.label<{ $active: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid ${p => (p.$active ? "rgba(160,120,255,0.7)" : "rgba(255,255,255,0.1)")};
  background: ${p => (p.$active ? "rgba(120,80,255,0.15)" : "rgba(255,255,255,0.04)")};
  transition: border-color 0.15s, background 0.15s;

  input { display: none; }

  strong {
    font-size: 0.9rem;
    color: white;
  }

  span {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.45);
    line-height: 1.3;
  }
`;

const Hint = styled.p`
  margin-top: 0.85rem;
  font-size: 0.78rem;
  color: rgba(180,150,255,0.9);
`;

const SaveBtn = styled.button`
  margin-top: 1.1rem;
  padding: 0.7rem 1.2rem;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.88rem;
  background: linear-gradient(135deg, rgba(120,80,255,0.8), rgba(80,40,200,0.9));
  color: white;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: opacity 0.15s;

  &:hover:not(:disabled) { opacity: 0.9; }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Spinner = styled.span`
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  display: inline-block;
  animation: ${spin} 0.7s linear infinite;
`;

const SavedNote = styled.span`
  margin-left: 0.75rem;
  font-size: 0.8rem;
  color: #86efac;
`;

const ErrorNote = styled.p`
  margin-top: 0.6rem;
  font-size: 0.8rem;
  color: #ff9a9a;
`;

type Props = {
  uid: string;
  currentNiveau?: NiveauChoice | null;
  onSaved?: (niveau: NiveauChoice) => void;
};

const OPTIONS: { value: NiveauChoice; label: string; desc: string }[] = [
  { value: "debutant", label: "🌱 Débutant", desc: "Je découvre le JDR, j'aimerais être accompagné" },
  { value: "confirme", label: "🎯 Confirmé", desc: "J'ai déjà pratiqué régulièrement" },
  { value: "expert", label: "🏆 Expert", desc: "Je pratique depuis longtemps" },
];

export default function ProfileNiveauSelector({ uid, currentNiveau, onSaved }: Props) {
  const [niveau, setNiveau] = useState<NiveauChoice | null>(currentNiveau ?? null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!niveau) return;
    setSaving(true);
    setError("");
    setJustSaved(false);
    try {
      await updateDoc(doc(db, "users", uid), { niveau });
      setJustSaved(true);
      onSaved?.(niveau);
      setTimeout(() => setJustSaved(false), 2500);
    } catch (err: any) {
      setError("Impossible d'enregistrer votre niveau pour le moment. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel>
      <Title>Votre niveau d'expérience</Title>
      <Subtitle>
        Cette information nous permet de mieux vous accompagner sur la plateforme.
      </Subtitle>

      <Group>
        {OPTIONS.map(opt => (
          <Card key={opt.value} $active={niveau === opt.value}>
            <input
              type="radio"
              name="niveau"
              value={opt.value}
              checked={niveau === opt.value}
              onChange={() => setNiveau(opt.value)}
            />
            <strong>{opt.label}</strong>
            <span>{opt.desc}</span>
          </Card>
        ))}
      </Group>

      {niveau === "debutant" && (
        <Hint>
          💬 En tant que débutant, vous pourrez contacter directement un membre du bureau de l'association depuis votre compte.
        </Hint>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      <SaveBtn onClick={handleSave} disabled={!niveau || saving || niveau === currentNiveau}>
        {saving ? <><Spinner /> Enregistrement…</> : "Enregistrer"}
      </SaveBtn>
      {justSaved && <SavedNote>✓ Enregistré</SavedNote>}
    </Panel>
  );
}