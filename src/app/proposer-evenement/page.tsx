"use client";

import { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { collection, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
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

const AddressWrapper = styled.div`
  position: relative;
`;

const AddressSuggestions = styled.ul`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 10;
  margin: 0;
  padding: 0.3rem;
  list-style: none;
  background: #1a1a2e;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 8px;
  max-height: 220px;
  overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
`;

const AddressSuggestionItem = styled.li`
  padding: 0.55rem 0.6rem;
  font-size: 0.85rem;
  color: rgba(255,255,255,0.85);
  border-radius: 6px;
  cursor: pointer;
  &:hover {
    background: rgba(124,77,255,0.18);
  }
`;

const AddressLoading = styled.span`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  color: rgba(255,255,255,0.4);
`;

const UserInfoBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(120,80,255,0.1);
  border: 1px solid rgba(160,120,255,0.2);
  border-radius: 10px;
  margin-bottom: 0.5rem;
`;

const UserAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(120,80,255,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
`;

const UserDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserName = styled.p`
  font-size: 0.88rem;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserEmail = styled.p`
  font-size: 0.78rem;
  color: rgba(255,255,255,0.45);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const NotConnectedBox = styled.div`
  padding: 1rem;
  border-radius: 10px;
  background: rgba(255,180,60,0.1);
  border: 1px solid rgba(255,180,60,0.3);
  color: #ffcf8a;
  font-size: 0.85rem;
`;

// ⚠️ FIX : le <select> natif ne propage pas la couleur/fond aux <option>.
// Le navigateur applique son propre thème (souvent fond blanc + texte noir,
// ou texte blanc sur fond blanc imposé par l'OS) tant que les <option>
// ne sont pas stylisées explicitement.
const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  color: white;
  box-sizing: border-box;

  option {
    background: #1a1a2e;
    color: white;
  }
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

const AgeTag = styled.span<{ $level: "tous" | "16" | "18" }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  margin-left: 0.5rem;
  vertical-align: middle;
  background: ${p =>
    p.$level === "18" ? "rgba(255,80,80,0.15)"
    : p.$level === "16" ? "rgba(255,180,60,0.15)"
    : "rgba(120,255,160,0.12)"};
  color: ${p =>
    p.$level === "18" ? "#ff9a9a"
    : p.$level === "16" ? "#ffcf8a"
    : "#9affc0"};
  border: 1px solid ${p =>
    p.$level === "18" ? "rgba(255,80,80,0.35)"
    : p.$level === "16" ? "rgba(255,180,60,0.35)"
    : "rgba(120,255,160,0.3)"};
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

// ─── Géolocalisation (autocomplétion d'adresse) ──────────────────────────────

// Coordonnées approximatives du centre de La Réunion, utilisées pour biaiser
// l'autocomplétion d'adresse (API BAN - data.gouv.fr) vers les résultats
// locaux plutôt que les meilleurs matchs nationaux (souvent en Métropole).
const REUNION_LAT = -21.115141;
const REUNION_LON = 55.536384;

// ─── Composant ────────────────────────────────────────────────────────────────

type UserProfile = {
  pseudo: string;
  email: string;
};

export default function ProposerEvenementPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // ⚠️ On récupère désormais le pseudo + email du compte connecté, comme dans
  // EventPageClient.tsx, au lieu de demander à l'utilisateur de les ressaisir :
  // celui qui propose l'événement est forcément celui qui est connecté.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUid(firebaseUser?.uid ?? null);

      if (firebaseUser) {
        const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserProfile({
            pseudo: data.pseudo || "",
            email:  firebaseUser.email || "",
          });
        } else {
          setUserProfile({ pseudo: "", email: firebaseUser.email || "" });
        }
      } else {
        setUserProfile(null);
      }

      setProfileLoading(false);
    });
    return () => unsub();
  }, []);

  // ⚠️ Garde-fou : si les variables d'env Cloudinary sont absentes au build,
  // on le signale clairement en console dès le montage plutôt que de laisser
  // l'upload échouer silencieusement avec une URL du type ".../v1_1/undefined/...".
  useEffect(() => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      console.error(
        "❌ Configuration Cloudinary manquante. Vérifie que " +
        "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME et NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET " +
        "sont bien définies dans les variables d'environnement (et que le projet " +
        "a été rebuild/redéployé après leur ajout, car les variables NEXT_PUBLIC_* " +
        "sont injectées au moment du build)."
      );
    }
  }, []);

  const [loading, setLoading]             = useState(false);
  const [success, setSuccess]             = useState(false);
  const [errorMsg, setErrorMsg]           = useState("");
  const [imageFile, setImageFile]         = useState<File | null>(null);
  const [imagePreview, setImagePreview]   = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // ── Autocomplétion d'adresse (API Adresse data.gouv.fr) ──────────────────
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [addressLoading, setAddressLoading]         = useState(false);
  const [showSuggestions, setShowSuggestions]       = useState(false);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressAbortRef    = useRef<AbortController | null>(null);

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
    // ── Nouveaux champs ──────────────────────────────────────────────────
    lieuType:       "presentiel" as "presentiel" | "ligne", // ← présentiel ou en ligne
    lieuDetail:     "",          // ← adresse OU plateforme (Discord, Roll20, Foundry...)
    lieuComplement: "",          // ← bâtiment, étage, digicode, point de repère...
    duree:          "2-3h",      // ← durée estimée de la session
    personnages:    "pretires" as "pretires" | "creation",  // ← prétirés ou création à la table
    ageTag:         "tous" as "tous" | "16" | "18",          // ← tag âge/contenu sensible
  });

  // ⚠️ Appelle l'API Adresse gouv.fr avec un debounce de 300ms pour éviter
  // de spammer l'API à chaque frappe. N'interroge que si on est en mode
  // "Présentiel" et que le texte fait au moins 3 caractères.
  //
  // ⚠️ FIX : on passe lat/lon (centre de La Réunion) pour biaiser les
  // résultats géographiquement, et on trie ensuite les résultats en
  // priorisant ceux dont le code postal commence par 974 (La Réunion),
  // car l'API BAN peut malgré tout renvoyer des adresses métropolitaines
  // mieux "scorées" textuellement.
  function handleAddressChange(value: string) {
    setForm(f => ({ ...f, lieuDetail: value }));

    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    if (addressAbortRef.current) addressAbortRef.current.abort();

    if (form.lieuType !== "presentiel" || value.trim().length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    addressDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      addressAbortRef.current = controller;
      setAddressLoading(true);
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&lat=${REUNION_LAT}&lon=${REUNION_LON}&limit=8`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Échec de la recherche d'adresse.");
        const data = await res.json();
        const features: any[] = data.features || [];

        const isReunion = (f: any) =>
          String(f.properties.postcode || f.properties.citycode || "").startsWith("974");

        const sorted = [
          ...features.filter(isReunion),
          ...features.filter(f => !isReunion(f)),
        ].slice(0, 5);

        const labels: string[] = sorted.map((f: any) => f.properties.label as string);
        setAddressSuggestions(labels);
        setShowSuggestions(labels.length > 0);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("❌ Erreur autocomplétion adresse :", err);
        }
      } finally {
        setAddressLoading(false);
      }
    }, 300);
  }

  function handleSelectAddress(label: string) {
    setForm(f => ({ ...f, lieuDetail: label }));
    setAddressSuggestions([]);
    setShowSuggestions(false);
  }

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

  // ⚠️ FIX : on lit désormais le corps de la réponse d'erreur Cloudinary
  // (res.json().error.message) au lieu de jeter un message générique.
  // Cloudinary renvoie des messages très précis : "Upload preset not found",
  // "Invalid cloud_name", "Upload preset must be whitelisted for unsigned uploads", etc.
  async function uploadToCloudinary(file: File): Promise<string> {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      throw new Error(
        "Configuration Cloudinary manquante (variables d'environnement non définies)."
      );
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const errBody = await res.json();
        detail = errBody?.error?.message || detail;
      } catch {
        // le corps n'était pas du JSON exploitable, on garde le statut HTTP
      }
      console.error("❌ Échec upload Cloudinary :", detail);
      throw new Error(`Échec de l'upload de l'image : ${detail}`);
    }

    const data = await res.json();
    return data.secure_url as string;
  }

  async function handleSubmit() {
    setErrorMsg("");

    if (!uid || !userProfile) {
      setErrorMsg("Vous devez être connecté pour proposer un événement.");
      return;
    }

    if (!form.titre || !form.description || !form.date || !form.heure) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (!form.lieuDetail) {
      alert(
        form.lieuType === "presentiel"
          ? "Veuillez indiquer l'adresse de l'événement."
          : "Veuillez indiquer la plateforme utilisée pour la partie en ligne."
      );
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
        try {
          imageUrl = await uploadToCloudinary(imageFile);
        } finally {
          setUploadingImage(false);
        }
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
        // ⚠️ FIX : organisateur/email viennent désormais du compte connecté,
        // plus besoin de les redemander dans le formulaire.
        organisateur: userProfile.pseudo || userProfile.email,
        email:        userProfile.email,
        image:        imageUrl,
        statut:       "en_attente",
        createdAt:    serverTimestamp(),
        mjId:         uid,
        // ── Nouveaux champs ──────────────────────────────────────────────
        lieuType:       form.lieuType,       // ← "presentiel" ou "ligne"
        lieuDetail:     form.lieuDetail,     // ← adresse ou plateforme
        lieuComplement: form.lieuComplement, // ← bâtiment, étage, digicode...
        duree:          form.duree,          // ← durée estimée
        personnages:    form.personnages,    // ← "pretires" ou "creation"
        ageTag:         form.ageTag,         // ← "tous" / "16" / "18"
      });

      setSuccess(true);
      setTimeout(() => router.push(`/evenements/${form.categorie}`), 2000);

      setForm({
        titre: "", description: "", categorie: "soirees-jdr",
        type: "one-shot", systeme: "", systemeAutre: "",
        date: "", heure: "", niveau: "Débutant",
        places: 6,
        lieuType: "presentiel", lieuDetail: "", lieuComplement: "", duree: "2-3h",
        personnages: "pretires", ageTag: "tous",
      });
      setImageFile(null);
      setImagePreview(null);

    } catch (error: any) {
      // ⚠️ FIX : on affiche désormais le message d'erreur réel (Cloudinary ou
      // Firestore) à l'écran, au lieu d'un message générique qui masquait
      // la vraie cause.
      console.error(error);
      setErrorMsg(
        error?.message ||
        "Erreur lors de l'envoi. Vérifiez votre connexion et réessayez."
      );
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

          {/* Lieu */}
          <SectionTitle>Lieu</SectionTitle>
          <TypeRow>
            <TypeBtn
              $active={form.lieuType === "presentiel"}
              onClick={() => setForm({ ...form, lieuType: "presentiel" })}
            >
              📍 Présentiel
            </TypeBtn>
            <TypeBtn
              $active={form.lieuType === "ligne"}
              onClick={() => setForm({ ...form, lieuType: "ligne" })}
            >
              💻 En ligne
            </TypeBtn>
          </TypeRow>
          <Field>
            <Label>
              {form.lieuType === "presentiel" ? "Adresse *" : "Plateforme (Discord, Roll20, Foundry...) *"}
            </Label>
            {form.lieuType === "presentiel" ? (
              <AddressWrapper>
                <Input
                  value={form.lieuDetail}
                  onChange={e => handleAddressChange(e.target.value)}
                  onFocus={() => { if (addressSuggestions.length > 0) setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Commencez à taper une adresse... (Ex: 12 rue des Tavernes, Saint-Denis)"
                  autoComplete="off"
                />
                {addressLoading && <AddressLoading>⏳</AddressLoading>}
                {showSuggestions && addressSuggestions.length > 0 && (
                  <AddressSuggestions>
                    {addressSuggestions.map((label, i) => (
                      <AddressSuggestionItem
                        key={i}
                        onClick={() => handleSelectAddress(label)}
                      >
                        📍 {label}
                      </AddressSuggestionItem>
                    ))}
                  </AddressSuggestions>
                )}
              </AddressWrapper>
            ) : (
              <Input
                value={form.lieuDetail}
                onChange={e => setForm({ ...form, lieuDetail: e.target.value })}
                placeholder="Ex: Discord — lien envoyé après inscription"
              />
            )}
          </Field>

          {/* Complément d'adresse : uniquement pertinent en présentiel */}
          {form.lieuType === "presentiel" && (
            <Field>
              <Label>Complément d'adresse (optionnel)</Label>
              <Input
                value={form.lieuComplement}
                onChange={e => setForm({ ...form, lieuComplement: e.target.value })}
                placeholder="Ex: Bâtiment B, 2ème étage, digicode 1234, sonner à Dupont..."
              />
            </Field>
          )}

          {/* Date & heure */}
          <SectionTitle>Date & horaires</SectionTitle>
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
          <Field>
            <Label>Durée estimée</Label>
            <Select value={form.duree} onChange={e => setForm({ ...form, duree: e.target.value })}>
              <option value="1-2h">1h - 2h</option>
              <option value="2-3h">2h - 3h</option>
              <option value="3-4h">3h - 4h</option>
              <option value="4-6h">4h - 6h</option>
              <option value="journee">Journée complète</option>
            </Select>
          </Field>

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

          <Field>
            <Label>Personnages</Label>
            <TypeRow style={{ marginBottom: 0 }}>
              <TypeBtn
                $active={form.personnages === "pretires"}
                onClick={() => setForm({ ...form, personnages: "pretires" })}
              >
                🧾 Prétirés fournis
              </TypeBtn>
              <TypeBtn
                $active={form.personnages === "creation"}
                onClick={() => setForm({ ...form, personnages: "creation" })}
              >
                ✏️ Création à la table
              </TypeBtn>
            </TypeRow>
          </Field>

          <Field>
            <Label>
              Contenu / âge recommandé
              <AgeTag $level={form.ageTag}>
                {form.ageTag === "tous" ? "Tous publics" : form.ageTag === "16" ? "16+" : "18+"}
              </AgeTag>
            </Label>
            <Select
              value={form.ageTag}
              onChange={e => setForm({ ...form, ageTag: e.target.value as "tous" | "16" | "18" })}
            >
              <option value="tous">Tous publics</option>
              <option value="16">16+ (thèmes matures)</option>
              <option value="18">18+ (violence, horreur explicite...)</option>
            </Select>
          </Field>

          {/* Organisateur */}
          <SectionTitle>Organisateur</SectionTitle>
          {profileLoading ? (
            <Field>
              <FileHint>Chargement de votre profil…</FileHint>
            </Field>
          ) : userProfile ? (
            <Field>
              <UserInfoBox>
                <UserAvatar>🧙</UserAvatar>
                <UserDetails>
                  <UserName>{userProfile.pseudo || "Aventurier"}</UserName>
                  <UserEmail>{userProfile.email}</UserEmail>
                </UserDetails>
              </UserInfoBox>
              <FileHint>
                L'événement sera proposé avec ce compte. Vous serez identifié comme organisateur.
              </FileHint>
            </Field>
          ) : (
            <Field>
              <NotConnectedBox>
                🔒 Vous devez être connecté pour proposer un événement.
              </NotConnectedBox>
            </Field>
          )}

          <Button onClick={handleSubmit} disabled={loading || profileLoading || !userProfile}>
            {loading
              ? uploadingImage ? "Envoi de l'image..." : "Envoi en cours..."
              : !userProfile && !profileLoading
              ? "Connectez-vous pour proposer"
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