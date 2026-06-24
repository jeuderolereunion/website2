"use client";

import { useState, useEffect } from "react";
import styled from "styled-components";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

// ─── Styled components ────────────────────────────────────────────────────────

const Page = styled.main`
  min-height: 100vh;
  background: #0d0d14;
  color: white;
  padding: 5rem 1rem 3rem;
`;

const Container = styled.div`
  max-width: 700px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  padding-top: 1rem;
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

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
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

// ── Type toggle ───────────────────────────────────────────────────────────────

const TypeRow = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const TypeBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 0.65rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms;
  border: 1px solid ${p => p.$active ? "rgba(124,77,255,0.7)" : "rgba(255,255,255,0.12)"};
  background: ${p => p.$active ? "rgba(124,77,255,0.2)" : "rgba(255,255,255,0.04)"};
  color: ${p => p.$active ? "#c8a8ff" : "rgba(255,255,255,0.5)"};

  &:hover {
    border-color: rgba(124,77,255,0.5);
    color: #c8a8ff;
  }
`;

const FileDropZone = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 140px;
  border: 1.5px dashed rgba(255,255,255,0.2);
  border-radius: 10px;
  background: rgba(255,255,255,0.03);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  overflow: hidden;
  position: relative;

  &:hover {
    border-color: rgba(124,77,255,0.6);
    background: rgba(124,77,255,0.06);
  }

  input { display: none; }
`;

const PreviewImg = styled.img`
  width: 100%;
  height: 100%;
  max-height: 220px;
  object-fit: cover;
`;

const FileHint = styled.span`
  font-size: 0.8rem;
  color: rgba(255,255,255,0.4);
  text-align: center;
  padding: 0 1rem;
`;

const RemoveImgBtn = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(0,0,0,0.6);
  border: none;
  color: white;
  border-radius: 6px;
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
  cursor: pointer;
  z-index: 2;
  &:hover { background: rgba(0,0,0,0.8); }
`;

const UploadProgress = styled.div`
  font-size: 0.78rem;
  color: rgba(124,77,255,0.9);
  margin-top: 0.4rem;
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
  margin-top: 0.5rem;
  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Success = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 10px;
  background: rgba(0,255,100,0.1);
  border: 1px solid rgba(0,255,100,0.3);
`;

const ErrorMsg = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 10px;
  background: rgba(255,80,80,0.1);
  border: 1px solid rgba(255,80,80,0.3);
  color: #ff9a9a;
  font-size: 0.85rem;
`;

const SectionTitle = styled.p`
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(160,120,255,0.7);
  margin: 1.5rem 0 0.75rem;
`;

// ─── Systèmes de jeu ──────────────────────────────────────────────────────────

const SYSTEMES = [
  "Donjons & Dragons 5e",
  "Pathfinder 2e",
  "Call of Cthulhu",
  "Warhammer Fantasy",
  "Savage Worlds",
  "Star Wars FFG",
  "Cyberpunk RED",
  "Vampire: La Mascarade",
  "L'Appel de Cthulhu",
  "Chroniques Oubliées",
  "Autre",
];

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ProposerEvenementPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setUid(user?.uid ?? null));
    return () => unsub();
  }, []);

  const [loading, setLoading]             = useState(false);
  const [success, setSuccess]             = useState(false);
  const [errorMsg, setErrorMsg]           = useState("");
  const [imageFile, setImageFile]         = useState<File | null>(null);
  const [imagePreview, setImagePreview]   = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState({
    titre:        "",
    description:  "",
    categorie:    "soirees-jdr",
    type:         "one-shot",   // ← nouveau
    systeme:      "",           // ← nouveau
    systemeAutre: "",           // ← si "Autre"
    date:         "",
    heure:        "",
    niveau:       "Débutant",
    places:       6,
    organisateur: "",
    email:        "",
  });

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Le fichier doit être une image."); return; }
    if (file.size > 15 * 1024 * 1024)   { alert("L'image ne doit pas dépasser 15 Mo."); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleRemoveImage(e: React.MouseEvent) {
    e.preventDefault();
    setImageFile(null);
    setImagePreview(null);
  }

  async function uploadToCloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );
    if (!res.ok) throw new Error("Échec de l'upload de l'image sur Cloudinary.");
    const data = await res.json();
    return data.secure_url as string;
  }

  async function handleSubmit() {
    setErrorMsg("");

    if (!form.titre || !form.description || !form.date || !form.heure || !form.organisateur) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (!form.systeme) {
      alert("Veuillez sélectionner un système de jeu.");
      return;
    }

    try {
      setLoading(true);
      let imageUrl = "";

      if (imageFile) {
        setUploadingImage(true);
        imageUrl = await uploadToCloudinary(imageFile);
        setUploadingImage(false);
      }

      const systemeLabel = form.systeme === "Autre" ? form.systemeAutre : form.systeme;

      await addDoc(collection(db, "propositions_evenements"), {
        titre:        form.titre,
        description:  form.description,
        categorie:    form.categorie,
        type:         form.type,         // ← "campagne" ou "one-shot"
        systeme:      systemeLabel,      // ← système de jeu
        date:         form.date,
        heure:        form.heure,
        niveau:       form.niveau,
        places:       Number(form.places),
        organisateur: form.organisateur,
        email:        form.email,
        image:        imageUrl,
        statut:       "en_attente",
        createdAt:    serverTimestamp(),
        mjId:         uid || null,
      });

      setSuccess(true);
      setTimeout(() => router.push(`/evenements/${form.categorie}`), 2000);

      setForm({
        titre: "", description: "", categorie: "soirees-jdr",
        type: "one-shot", systeme: "", systemeAutre: "",
        date: "", heure: "", niveau: "Débutant",
        places: 6, organisateur: "", email: "",
      });
      setImageFile(null);
      setImagePreview(null);

    } catch (error) {
      console.error(error);
      setErrorMsg("Erreur lors de l'envoi. Vérifiez votre connexion et réessayez.");
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  }

  return (
    <Page>
      <Navigation />
      <Container>
        <Title>➕ Proposer un événement</Title>
        <Subtitle>
          Propose une partie, un tournoi ou une animation. Un administrateur validera ensuite l'événement.
        </Subtitle>

        <Card>
          {/* Type */}
          <SectionTitle>Type de partie</SectionTitle>
          <TypeRow>
            <TypeBtn
              $active={form.type === "one-shot"}
              onClick={() => setForm({ ...form, type: "one-shot" })}
            >
              ⚡ One-Shot
            </TypeBtn>
            <TypeBtn
              $active={form.type === "campagne"}
              onClick={() => setForm({ ...form, type: "campagne" })}
            >
              📖 Campagne
            </TypeBtn>
          </TypeRow>

          {/* Infos générales */}
          <SectionTitle>Informations générales</SectionTitle>

          <Field>
            <Label>Titre *</Label>
            <Input value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} />
          </Field>

          <Field>
            <Label>Système de jeu *</Label>
            <Select value={form.systeme} onChange={e => setForm({ ...form, systeme: e.target.value })}>
              <option value="">— Choisir un système —</option>
              {SYSTEMES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>

          {form.systeme === "Autre" && (
            <Field>
              <Label>Précisez le système *</Label>
              <Input
                value={form.systemeAutre}
                onChange={e => setForm({ ...form, systemeAutre: e.target.value })}
                placeholder="Ex: Alien RPG, Blades in the Dark..."
              />
            </Field>
          )}

          <Field>
            <Label>Image de l'événement</Label>
            <FileDropZone>
              <input type="file" accept="image/*" onChange={handleImageChange} />
              {imagePreview ? (
                <>
                  <PreviewImg src={imagePreview} alt="Aperçu" />
                  <RemoveImgBtn onClick={handleRemoveImage}>✕ Retirer</RemoveImgBtn>
                </>
              ) : (
                <FileHint>📷 Cliquez pour choisir une image (JPG, PNG — 15 Mo max)</FileHint>
              )}
            </FileDropZone>
            {uploadingImage && <UploadProgress>⏳ Envoi de l'image en cours…</UploadProgress>}
          </Field>

          <Field>
            <Label>Description *</Label>
            <TextArea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </Field>

          <Field>
            <Label>Catégorie</Label>
            <Select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })}>
              <option value="soirees-jdr">Soirées JDR</option>
              <option value="tournois">Tournois</option>
              <option value="soirees-jeux">Soirées Jeux</option>
              <option value="initiations">Initiations</option>
            </Select>
          </Field>

          {/* Date & heure */}
          <SectionTitle>Date & lieu</SectionTitle>
          <Row>
            <Field style={{ margin: 0 }}>
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field style={{ margin: 0 }}>
              <Label>Heure *</Label>
              <Input type="time" value={form.heure} onChange={e => setForm({ ...form, heure: e.target.value })} />
            </Field>
          </Row>

          {/* Détails */}
          <SectionTitle>Détails</SectionTitle>
          <Row>
            <Field style={{ margin: 0 }}>
              <Label>Niveau</Label>
              <Select value={form.niveau} onChange={e => setForm({ ...form, niveau: e.target.value })}>
                <option>Débutant</option>
                <option>Intermédiaire</option>
                <option>Confirmé</option>
                <option>Tous niveaux</option>
              </Select>
            </Field>
            <Field style={{ margin: 0 }}>
              <Label>Nombre de places</Label>
              <Input
                type="number" min="1" value={form.places}
                onChange={e => setForm({ ...form, places: Number(e.target.value) })}
              />
            </Field>
          </Row>

          {/* Organisateur */}
          <SectionTitle>Organisateur</SectionTitle>
          <Field>
            <Label>Nom *</Label>
            <Input value={form.organisateur} onChange={e => setForm({ ...form, organisateur: e.target.value })} />
          </Field>
          <Field>
            <Label>Email de contact</Label>
            <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </Field>

          <Button onClick={handleSubmit} disabled={loading}>
            {loading
              ? uploadingImage ? "Envoi de l'image..." : "Envoi en cours..."
              : "Envoyer la proposition"}
          </Button>

          {errorMsg && <ErrorMsg>{errorMsg}</ErrorMsg>}
          {success && (
            <Success>
              ✅ Proposition envoyée avec succès. Un administrateur l'examinera prochainement.
            </Success>
          )}
        </Card>
      </Container>
    </Page>
  );
}