"use client";

import { useState } from "react";
import styled, { keyframes } from "styled-components";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

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
  margin-top: 1rem;
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

const FieldBlock = styled.div`
  margin-bottom: 1.1rem;
`;

const FieldLabel = styled.label`
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.4);
  margin-bottom: 0.4rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;

  &::placeholder { color: rgba(255,255,255,0.25); }
  &:focus { border-color: rgba(160,120,255,0.6); }
`;

const VisibilityRow = styled.label`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.55rem;
  cursor: pointer;
  font-size: 0.8rem;
  color: rgba(255,255,255,0.55);
  user-select: none;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: rgba(160,120,255,0.9);
  cursor: pointer;
`;

const SaveBtn = styled.button`
  margin-top: 0.5rem;
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
  &:disabled { opacity: 0.5; cursor: not-allowed; }
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

const HintNote = styled.p`
  font-size: 0.74rem;
  color: rgba(255,255,255,0.3);
  margin-top: 0.35rem;
`;

type Props = {
  uid: string;
  currentEmail?: string;
  currentTelephone?: string;
  currentEmailVisible?: boolean;
  currentTelephoneVisible?: boolean;
  onSaved?: (data: {
    telephone: string;
    emailVisible: boolean;
    telephoneVisible: boolean;
  }) => void;
};

// Validation simple, non bloquante à l'excès : on vérifie juste un format plausible
function isValidPhone(value: string): boolean {
  if (!value) return true; // champ optionnel
  return /^[0-9+()\s.-]{6,20}$/.test(value);
}

export default function CoordonneesForm({
  uid,
  currentEmail,
  currentTelephone,
  currentEmailVisible,
  currentTelephoneVisible,
}: Props) {
  const [telephone, setTelephone] = useState(currentTelephone ?? "");
  const [emailVisible, setEmailVisible] = useState(currentEmailVisible ?? false);
  const [telephoneVisible, setTelephoneVisible] = useState(currentTelephoneVisible ?? false);

  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState("");

  const telephoneValide = isValidPhone(telephone.trim());

  async function handleSave() {
    if (!telephoneValide) {
      setError("Le numéro de téléphone semble invalide.");
      return;
    }
    setSaving(true);
    setError("");
    setJustSaved(false);
    try {
      await updateDoc(doc(db, "users", uid), {
        telephone: telephone.trim(),
        emailVisible,
        // La visibilité du téléphone n'a de sens que si un numéro est renseigné
        telephoneVisible: telephone.trim() ? telephoneVisible : false,
      });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } catch (err: any) {
      setError("Impossible d'enregistrer vos coordonnées pour le moment. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel>
      <Title>Coordonnées</Title>
      <Subtitle>
        Ces informations sont optionnelles. Vous choisissez ce qui apparaît sur votre profil public.
      </Subtitle>

      <FieldBlock>
        <FieldLabel>Email</FieldLabel>
        <Input value={currentEmail || ""} disabled placeholder="votre@email.com" />
        <VisibilityRow>
          <Checkbox
            type="checkbox"
            checked={emailVisible}
            onChange={e => setEmailVisible(e.target.checked)}
          />
          Afficher mon email sur mon profil public
        </VisibilityRow>
      </FieldBlock>

      <FieldBlock>
        <FieldLabel>Téléphone (optionnel)</FieldLabel>
        <Input
          type="tel"
          value={telephone}
          onChange={e => setTelephone(e.target.value)}
          placeholder="06 12 34 56 78"
        />
        {!telephoneValide && (
          <HintNote style={{ color: "#ff9a9a" }}>Format de numéro invalide.</HintNote>
        )}
        {telephone.trim() && (
          <VisibilityRow>
            <Checkbox
              type="checkbox"
              checked={telephoneVisible}
              onChange={e => setTelephoneVisible(e.target.checked)}
            />
            Afficher mon numéro sur mon profil public
          </VisibilityRow>
        )}
        {!telephone.trim() && (
          <HintNote>Renseignez un numéro pour pouvoir choisir de l'afficher.</HintNote>
        )}
      </FieldBlock>

      {error && <ErrorNote>{error}</ErrorNote>}

      <SaveBtn onClick={handleSave} disabled={saving || !telephoneValide}>
        {saving ? <><Spinner /> Enregistrement…</> : "Enregistrer"}
      </SaveBtn>
      {justSaved && <SavedNote>✓ Enregistré</SavedNote>}
    </Panel>
  );
}