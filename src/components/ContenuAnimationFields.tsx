"use client";

import styled from "styled-components";
import type { ProgrammeItem, ProposeItem } from "@/lib/jdr";

// Bloc de saisie du contenu éditorial d'une animation, pour l'admin.
// L'image, le lieu, l'adresse, la durée, le niveau et les tags restent gérés
// par les champs existants du formulaire : ce bloc ne les duplique pas.

export type ContenuAnimation = {
  accroche?: string;
  description?: string;
  programme?: ProgrammeItem[];
  propose?: ProposeItem[];
  tarif?: string;
  ageMin?: number;
  debutants?: boolean | null;
  aApporter?: string;
};

/** À étaler dans le payload Firestore : retire les lignes vides et ne renvoie
 *  jamais `undefined` (Firestore le refuse). `debutants: null` = non précisé. */
export function nettoyerContenu(c: ContenuAnimation) {
  return {
    accroche: c.accroche?.trim() || "",
    description: c.description?.trim() || "",
    tarif: c.tarif?.trim() || "",
    aApporter: c.aApporter?.trim() || "",
    ageMin: Number.isFinite(c.ageMin) && (c.ageMin ?? 0) > 0 ? (c.ageMin as number) : 0,
    debutants: typeof c.debutants === "boolean" ? c.debutants : null,
    programme: (c.programme ?? [])
      .filter(p => p.titre.trim())
      .map(p => ({ heure: p.heure.trim(), titre: p.titre.trim(), detail: p.detail?.trim() || "" })),
    propose: (c.propose ?? [])
      .filter(p => p.titre.trim())
      .map(p => ({ icone: p.icone?.trim() || "", titre: p.titre.trim(), detail: p.detail?.trim() || "" })),
  };
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const Box = styled.div`
  margin: 1.2rem 0; padding: 1rem; border-radius: 12px;
  border: 1px solid rgba(160,120,255,0.25); background: rgba(120,80,255,0.05);
`;
const Heading = styled.p`margin: 0 0 0.2rem; font-weight: 700; font-size: 0.9rem;`;
const Help = styled.p`margin: 0 0 0.4rem; font-size: 0.75rem; color: rgba(255,255,255,0.45); line-height: 1.5;`;
const Field = styled.div`margin-top: 0.9rem;`;
const Label = styled.label`display: block; margin-bottom: 0.3rem; font-size: 0.78rem; color: rgba(255,255,255,0.55);`;
const base = `
  width: 100%; box-sizing: border-box; padding: 0.5rem 0.7rem; border-radius: 8px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14);
  color: #fff; font-size: 0.85rem; font-family: inherit; outline: none;
  &:focus { border-color: rgba(160,120,255,0.6); }
`;
const Input = styled.input`${base}`;
const Area = styled.textarea`${base} min-height: 110px; resize: vertical; line-height: 1.5;`;
const Sel = styled.select`${base} background: rgba(30,20,50,0.9);`;
const Row = styled.div`display: flex; gap: 0.5rem; align-items: flex-start; margin-bottom: 0.5rem;`;
const Small = styled.button`
  padding: 0.4rem 0.7rem; border-radius: 8px; font-size: 0.78rem; cursor: pointer;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.18); color: rgba(255,255,255,0.8);
  &:hover { background: rgba(255,255,255,0.12); }
`;
const Two = styled.div`display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; @media (max-width: 420px) { grid-template-columns: 1fr; }`;

// ─── Composant ───────────────────────────────────────────────────────────────

export default function ContenuAnimationFields({
  value, onChange,
}: { value: ContenuAnimation; onChange: (v: ContenuAnimation) => void }) {
  const set = <K extends keyof ContenuAnimation>(k: K, v: ContenuAnimation[K]) => onChange({ ...value, [k]: v });
  const programme = value.programme ?? [];
  const propose = value.propose ?? [];

  return (
    <Box>
      <Heading>Contenu de la page de l&apos;animation</Heading>
      <Help>Ces informations s&apos;affichent sur la page publique. Tout est facultatif : une rubrique vide n&apos;apparaît pas.</Help>

      <Field>
        <Label>Accroche (une phrase qui donne envie)</Label>
        <Input value={value.accroche ?? ""} onChange={e => set("accroche", e.target.value)} placeholder="Une soirée pour découvrir le jeu de rôle, sans rien connaître." />
      </Field>

      <Field>
        <Label>De quoi s&apos;agit-il ? (description complète)</Label>
        <Area value={value.description ?? ""} onChange={e => set("description", e.target.value)} placeholder="Ce qu'est l'animation, pour qui, dans quel esprit…" />
      </Field>

      <Field>
        <Label>Au programme (dans l&apos;ordre)</Label>
        {programme.map((p, i) => (
          <Row key={i}>
            <Input style={{ flex: "0 0 5rem" }} value={p.heure} placeholder="19h30"
              onChange={e => set("programme", programme.map((x, j) => j === i ? { ...x, heure: e.target.value } : x))} />
            <div style={{ flex: 1, display: "grid", gap: "0.4rem" }}>
              <Input value={p.titre} placeholder="Accueil et présentation des tables"
                onChange={e => set("programme", programme.map((x, j) => j === i ? { ...x, titre: e.target.value } : x))} />
              <Input value={p.detail ?? ""} placeholder="Détail (facultatif)"
                onChange={e => set("programme", programme.map((x, j) => j === i ? { ...x, detail: e.target.value } : x))} />
            </div>
            <Small type="button" aria-label="Supprimer cette étape" onClick={() => set("programme", programme.filter((_, j) => j !== i))}>✕</Small>
          </Row>
        ))}
        <Small type="button" onClick={() => set("programme", [...programme, { heure: "", titre: "", detail: "" }])}>+ Ajouter une étape</Small>
      </Field>

      <Field>
        <Label>Ce qu&apos;on propose</Label>
        {propose.map((p, i) => (
          <Row key={i}>
            <Input style={{ flex: "0 0 3.2rem", textAlign: "center" }} value={p.icone ?? ""} placeholder="🎲" maxLength={4}
              onChange={e => set("propose", propose.map((x, j) => j === i ? { ...x, icone: e.target.value } : x))} />
            <div style={{ flex: 1, display: "grid", gap: "0.4rem" }}>
              <Input value={p.titre} placeholder="Initiation débutants"
                onChange={e => set("propose", propose.map((x, j) => j === i ? { ...x, titre: e.target.value } : x))} />
              <Input value={p.detail ?? ""} placeholder="Détail (facultatif)"
                onChange={e => set("propose", propose.map((x, j) => j === i ? { ...x, detail: e.target.value } : x))} />
            </div>
            <Small type="button" aria-label="Supprimer cette proposition" onClick={() => set("propose", propose.filter((_, j) => j !== i))}>✕</Small>
          </Row>
        ))}
        <Small type="button" onClick={() => set("propose", [...propose, { icone: "", titre: "", detail: "" }])}>+ Ajouter une proposition</Small>
      </Field>

      <Two>
        <Field><Label>Tarif</Label><Input value={value.tarif ?? ""} onChange={e => set("tarif", e.target.value)} placeholder="Gratuit" /></Field>
        <Field><Label>Âge minimum (0 = tous)</Label><Input type="number" min={0} value={value.ageMin ?? 0} onChange={e => set("ageMin", Number(e.target.value))} /></Field>
      </Two>

      <Two>
        <Field>
          <Label>Débutants</Label>
          <Sel
            value={value.debutants === true ? "oui" : value.debutants === false ? "non" : ""}
            onChange={e => set("debutants", e.target.value === "oui" ? true : e.target.value === "non" ? false : null)}
          >
            <option value="">Non précisé</option>
            <option value="oui">Bienvenus</option>
            <option value="non">Expérience conseillée</option>
          </Sel>
        </Field>
        <Field><Label>À apporter</Label><Input value={value.aApporter ?? ""} onChange={e => set("aApporter", e.target.value)} placeholder="Rien, les dés sont fournis" /></Field>
      </Two>
    </Box>
  );
}