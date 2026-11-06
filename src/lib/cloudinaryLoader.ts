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

// Lit le corps de l'erreur Cloudinary (error.message) au lieu d'un message
// générique, et expose la progression via un callback optionnel (0 à 100).
// XMLHttpRequest est utilisé car fetch ne mesure pas la progression d'un envoi.
export function uploadToCloudinary(
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    return Promise.reject(
      new Error("Configuration Cloudinary manquante (variables d'environnement non définies).")
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      let body: any = null;
      try { body = JSON.parse(xhr.responseText); } catch { /* corps non JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && body?.secure_url) {
        resolve(body.secure_url as string);
      } else {
        const detail = body?.error?.message || `HTTP ${xhr.status}`;
        console.error("❌ Échec upload Cloudinary :", detail);
        reject(new Error(`Échec de l'upload de l'image : ${detail}`));
      }
    };

    xhr.onerror = () => reject(new Error("Échec de l'upload de l'image : erreur réseau"));
    xhr.send(formData);
  });
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
 * ⚠️ uploadToCloudinary() renvoie secure_url (URL complète), pas le public_id.
 * Tant que seule l'URL est stockée côté Firestore, ce loader ne peut pas être
 * branché directement dessus. Utiliser extractPublicId() ci-dessous pour
 * combler l'écart, ou stocker le public_id à l'upload.
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
 * Extrait le public_id à partir d'une secure_url Cloudinary stockée.
 * Retourne null si le format est inattendu.
 */
export function extractPublicId(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
  return match ? match[1] : null;
}