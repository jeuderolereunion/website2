"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadToCloudinary } from "@/lib/cloudinaryLoader";

const MAX_FILE_MB = 6;

type Item = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  badge: string;
  order: number;
  active: boolean;
  startAt: Timestamp | null;
  endAt: Timestamp | null;
};

type FormState = {
  title: string;
  subtitle: string;
  link: string;
  badge: string;
  image: string;
  startAt: string; // format <input type="datetime-local">
  endAt: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  title: "",
  subtitle: "",
  link: "",
  badge: "",
  image: "",
  startAt: "",
  endAt: "",
  active: true,
};

// ── Utilitaires ─────────────────────────────────────────────────────────
function toLocalInput(ts: Timestamp | null): string {
  if (!ts) return "";
  const d = ts.toDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): Timestamp | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
}

type Status = "active" | "scheduled" | "expired" | "off";

function getStatus(item: Item, now = Date.now()): Status {
  if (!item.active) return "off";
  if (item.startAt && item.startAt.toMillis() > now) return "scheduled";
  if (item.endAt && item.endAt.toMillis() < now) return "expired";
  return "active";
}

const STATUS_LABEL: Record<Status, string> = {
  active: "En ligne",
  scheduled: "Programmée",
  expired: "Expirée",
  off: "Désactivée",
};

const STATUS_COLOR: Record<Status, string> = {
  active: "#3fb950",
  scheduled: "#58a6ff",
  expired: "#8b949e",
  off: "#8b949e",
};

// f_auto,q_auto : format et qualité optimisés ; w_1600 : jamais plus lourd que nécessaire.
// Sans effet si l'URL est déjà transformée ou n'est pas une URL Cloudinary.
function optimiserUrl(url: string): string {
  if (!url.includes("/upload/") || /\/upload\/[a-z]_/.test(url)) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto,w_1600/");
}

function readRatio(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
    img.onerror = reject;
    img.src = url;
  });
}

// ── Styles ──────────────────────────────────────────────────────────────
const Wrap = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 2rem;
  color: white;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.section`
  background: #11111a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 1.25rem;
`;

const PanelTitle = styled.h3`
  margin: 0 0 1rem;
  font-size: 1.1rem;
`;

const Field = styled.label`
  display: block;
  margin-bottom: 0.9rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.75);

  input[type="text"],
  input[type="datetime-local"] {
    display: block;
    width: 100%;
    margin-top: 0.3rem;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: #08080c;
    color: white;
    font-size: 0.95rem;
  }

  small {
    display: block;
    margin-top: 0.25rem;
    color: rgba(255, 255, 255, 0.5);
  }
`;

const Row = styled.div`
  display: flex;
  gap: 0.75rem;

  & > * {
    flex: 1;
    min-width: 0;
  }

  @media (max-width: 500px) {
    flex-direction: column;
  }
`;

const Preview = styled.div<{ $image: string }>`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  margin-bottom: 1rem;
  border-radius: 10px;
  overflow: hidden;
  background-color: #08080c;
  background-image: ${(p) => (p.$image ? `url(${p.$image})` : "none")};
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  border: 1px dashed rgba(255, 255, 255, 0.2);

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.75));
  }
`;

const PreviewText = styled.div`
  position: absolute;
  left: 5%;
  right: 5%;
  bottom: 8%;
  z-index: 2;

  h4 {
    margin: 0 0 0.25rem;
    font-size: clamp(1rem, 2.6vw, 1.6rem);
    line-height: 1.15;
  }

  p {
    margin: 0;
    font-size: clamp(0.7rem, 1.4vw, 0.9rem);
    color: rgba(255, 255, 255, 0.85);
  }
`;

const PreviewBadge = styled.span`
  display: inline-block;
  margin-bottom: 0.4rem;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--theme-color-gold, #d4af37);
  color: black;
  font-size: 0.7rem;
  font-weight: 700;
`;

const Btn = styled.button<{ $primary?: boolean; $danger?: boolean }>`
  padding: 9px 16px;
  border-radius: 10px;
  border: 1px solid
    ${(p) =>
      p.$danger ? "#f85149" : p.$primary ? "transparent" : "rgba(255,255,255,0.2)"};
  background: ${(p) =>
    p.$primary ? "var(--theme-color-gold, #d4af37)" : "transparent"};
  color: ${(p) => (p.$primary ? "black" : p.$danger ? "#f85149" : "white")};
  font-weight: ${(p) => (p.$primary ? 700 : 500)};
  font-size: 0.85rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1rem;
`;

const Msg = styled.p<{ $error?: boolean }>`
  margin: 0.6rem 0 0;
  font-size: 0.85rem;
  color: ${(p) => (p.$error ? "#f85149" : "#d29922")};
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ListItem = styled.li<{ $editing: boolean }>`
  display: flex;
  gap: 0.9rem;
  align-items: center;
  padding: 0.6rem;
  border-radius: 10px;
  border: 1px solid
    ${(p) => (p.$editing ? "var(--theme-color-gold, #d4af37)" : "rgba(255,255,255,0.08)")};
  background: #0c0c13;
`;

const Thumb = styled.div<{ $image: string }>`
  flex: 0 0 96px;
  height: 54px;
  border-radius: 6px;
  background: #08080c url(${(p) => p.$image}) center / contain no-repeat;
`;

const ItemInfo = styled.div`
  flex: 1;
  min-width: 0;

  strong {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.95rem;
  }
`;

const StatusTag = styled.span<{ $color: string }>`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${(p) => p.$color};
`;

const ItemActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  justify-content: flex-end;

  button {
    padding: 5px 9px;
    font-size: 0.78rem;
  }
`;

// ── Composant ───────────────────────────────────────────────────────────
// À monter UNIQUEMENT dans une zone déjà protégée (ton AdminPage).
export default function AdminCarousel() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  // Toutes les slides (même inactives), dans l'ordre d'affichage
  useEffect(() => {
    const q = query(collection(db, "carousel"), orderBy("order"));
    return onSnapshot(
      q,
      (snap) =>
        setItems(
          snap.docs.map((d) => {
            const x = d.data();
            return {
              id: d.id,
              title: x.title ?? "",
              subtitle: x.subtitle ?? "",
              image: x.image ?? "",
              link: x.link ?? "",
              badge: x.badge ?? "",
              order: x.order ?? 0,
              active: x.active ?? false,
              startAt: x.startAt ?? null,
              endAt: x.endAt ?? null,
            } as Item;
          })
        ),
      (err) => setError("Lecture impossible : " + err.message)
    );
  }, []);

  const nextOrder = useMemo(
    () => (items.length ? Math.max(...items.map((i) => i.order)) + 1 : 1),
    [items]
  );

  function patch(p: Partial<FormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
    setWarning("");
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      subtitle: item.subtitle,
      link: item.link,
      badge: item.badge,
      image: item.image,
      startAt: toLocalInput(item.startAt),
      endAt: toLocalInput(item.endAt),
      active: item.active,
    });
    setError("");
    setWarning("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de re-sélectionner le même fichier
    if (!file) return;

    setError("");
    setWarning("");

    if (!file.type.startsWith("image/")) {
      setError("Le fichier doit être une image.");
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Image trop lourde (max ${MAX_FILE_MB} Mo).`);
      return;
    }

    setUploading(true);
    try {
      setUploadPct(0);
      const url = optimiserUrl(await uploadToCloudinary(file, setUploadPct));
      patch({ image: url });
      const ratio = await readRatio(url);
      if (Math.abs(ratio - 16 / 9) > 0.1) {
        setWarning(
          "Cette image n'est pas en 16/9 : elle aura des bandes noires dans le carrousel. Idéal : 1600×900."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setError("");

    const title = form.title.trim();
    const link = form.link.trim();

    if (!title) return setError("Le titre est obligatoire.");
    if (!form.image) return setError("Ajoute une image.");
    if (!link.startsWith("/") && !/^https?:\/\//.test(link)) {
      return setError('Le lien doit commencer par "/" (page du site) ou "https://".');
    }

    const startAt = fromLocalInput(form.startAt);
    const endAt = fromLocalInput(form.endAt);
    if (startAt && endAt && endAt.toMillis() <= startAt.toMillis()) {
      return setError("La date de fin doit être après la date de début.");
    }

    // Firestore refuse `undefined` : on envoie des valeurs vides explicites.
    const payload = {
      title,
      subtitle: form.subtitle.trim(),
      link,
      badge: form.badge.trim(),
      image: form.image,
      active: form.active,
      startAt,
      endAt,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "carousel", editingId), payload);
      } else {
        await addDoc(collection(db, "carousel"), {
          ...payload,
          order: nextOrder,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: Item) {
    try {
      await updateDoc(doc(db, "carousel", item.id), { active: !item.active });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible.");
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const a = items[index];
    const b = items[index + dir];
    if (!a || !b) return;
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "carousel", a.id), { order: b.order });
      batch.update(doc(db, "carousel", b.id), { order: a.order });
      await batch.commit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Déplacement impossible.");
    }
  }

  async function remove(item: Item) {
    if (!window.confirm(`Supprimer définitivement « ${item.title} » ?\n(Pour la garder en réserve, désactive-la plutôt.)`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "carousel", item.id));
      if (editingId === item.id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  return (
    <Wrap>
      {/* ── Formulaire + aperçu ── */}
      <Panel>
        <PanelTitle>
          {editingId ? "Modifier la slide" : "Nouvelle slide"}
        </PanelTitle>

        <Preview $image={form.image}>
          <PreviewText>
            {form.badge.trim() && <PreviewBadge>{form.badge.trim()}</PreviewBadge>}
            <h4>{form.title || "Titre de la slide"}</h4>
            <p>{form.subtitle || "Sous-titre"}</p>
          </PreviewText>
        </Preview>

        <Field>
          Image
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            disabled={uploading}
            style={{ display: "block", marginTop: "0.3rem" }}
          />
          <small>
            {uploading
              ? `Envoi en cours… ${uploadPct}%`
              : "Format conseillé : 16/9, 1600×900, 6 Mo max."}
          </small>
        </Field>

        <Field>
          Titre
          <input
            type="text"
            value={form.title}
            maxLength={80}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </Field>

        <Field>
          Sous-titre
          <input
            type="text"
            value={form.subtitle}
            maxLength={140}
            onChange={(e) => patch({ subtitle: e.target.value })}
          />
        </Field>

        <Row>
          <Field>
            Lien du bouton
            <input
              type="text"
              value={form.link}
              placeholder="/evenements/soirees-jdr"
              onChange={(e) => patch({ link: e.target.value })}
            />
          </Field>
          <Field>
            Pastille (optionnel)
            <input
              type="text"
              value={form.badge}
              maxLength={24}
              placeholder="Nouveau"
              onChange={(e) => patch({ badge: e.target.value })}
            />
          </Field>
        </Row>

        <Row>
          <Field>
            Visible à partir du
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => patch({ startAt: e.target.value })}
            />
          </Field>
          <Field>
            Visible jusqu'au
            <input
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => patch({ endAt: e.target.value })}
            />
          </Field>
        </Row>

        <Field as="div">
          <label style={{ cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => patch({ active: e.target.checked })}
              style={{ marginRight: "0.5rem" }}
            />
            Activée (affichée dès que les dates le permettent)
          </label>
        </Field>

        {warning && <Msg>{warning}</Msg>}
        {error && <Msg $error>{error}</Msg>}

        <Actions>
          <Btn $primary onClick={handleSave} disabled={saving || uploading}>
            {saving ? "Enregistrement…" : editingId ? "Enregistrer" : "Ajouter au carrousel"}
          </Btn>
          {editingId && <Btn onClick={resetForm}>Annuler</Btn>}
        </Actions>
      </Panel>

      {/* ── Liste ordonnable ── */}
      <Panel>
        <PanelTitle>Slides du carrousel ({items.length})</PanelTitle>

        {items.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.6)", margin: 0 }}>
            Aucune slide pour l'instant. Tant que la liste est vide, la page
            d'accueil affiche les 3 slides de secours.
          </p>
        ) : (
          <List>
            {items.map((item, index) => {
              const status = getStatus(item);
              return (
                <ListItem key={item.id} $editing={editingId === item.id}>
                  <Thumb $image={item.image} />
                  <ItemInfo>
                    <strong>{item.title}</strong>
                    <StatusTag $color={STATUS_COLOR[status]}>
                      {STATUS_LABEL[status]}
                    </StatusTag>
                  </ItemInfo>
                  <ItemActions>
                    <Btn onClick={() => move(index, -1)} disabled={index === 0} aria-label="Monter">
                      ↑
                    </Btn>
                    <Btn
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                      aria-label="Descendre"
                    >
                      ↓
                    </Btn>
                    <Btn onClick={() => toggleActive(item)}>
                      {item.active ? "Désactiver" : "Activer"}
                    </Btn>
                    <Btn onClick={() => startEdit(item)}>Modifier</Btn>
                    <Btn $danger onClick={() => remove(item)}>
                      Supprimer
                    </Btn>
                  </ItemActions>
                </ListItem>
              );
            })}
          </List>
        )}
      </Panel>
    </Wrap>
  );
}