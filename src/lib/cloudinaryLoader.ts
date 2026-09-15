import type { ImageLoaderProps } from "next/image";

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

if (!CLOUDINARY_CLOUD_NAME) {
  // Erreur explicite en dev plutôt qu'une image cassée silencieuse.
  console.warn(
    "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME n'est pas défini — les images Cloudinary ne se chargeront pas."
  );
}

// ─── Upload ─────────────────────────────────────────────────────────────────

// ⚠️ FIX : on lit le corps de la réponse d'erreur Cloudinary
// (res.json().error.message) au lieu de jeter un message générique.
// Cloudinary renvoie des messages très précis : "Upload preset not found",
// "Invalid cloud_name", "Upload preset must be whitelisted for unsigned uploads", etc.
export async function uploadToCloudinary(file: File): Promise<string> {
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

// ─── Loader next/image ──────────────────────────────────────────────────────

type CloudinaryLoaderOptions = {
  /** Recadrage carré (utile pour des vignettes). Sinon, largeur seule est envoyée à Cloudinary. */
  square?: boolean;
};

/**
 * Construit un loader next/image pour une public_id Cloudinary donnée.
 * `src` doit être la public_id Cloudinary (ex: "jdr-reunion/events/3-brasseurs"),
 * pas une URL complète.
 *
 * ⚠️ uploadToCloudinary() ci-dessus renvoie secure_url (URL complète), pas le
 * public_id. Tant que seule l'URL est stockée côté Firestore, ce loader ne
 * peut pas être branché directement dessus (Cloudinary recevrait une URL en
 * guise de src et produirait une image cassée). Utiliser extractPublicId()
 * ci-dessous pour combler l'écart, ou stocker le public_id à l'upload.
 */
export function makeCloudinaryLoader({ square = false }: CloudinaryLoaderOptions = {}) {
  return function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
    const transformations = [
      "f_auto",
      `q_${quality ?? "auto"}`,
      "c_fill",
      "g_auto",
      `w_${width}`,
      ...(square ? [`h_${width}`, "ar_1:1"] : []),
    ].join(",");

    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformations}/${src}`;
  };
}

/**
 * Extrait le public_id à partir d'une secure_url Cloudinary stockée
 * (ex: "https://res.cloudinary.com/demo/image/upload/v1234/jdr-reunion/events/3-brasseurs.jpg"
 * → "jdr-reunion/events/3-brasseurs").
 * Pont temporaire pour les documents qui n'ont que `image` (URL) et pas
 * encore de `publicId` dédié. Retourne null si le format est inattendu.
 */
export function extractPublicId(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
  return match ? match[1] : null;
}