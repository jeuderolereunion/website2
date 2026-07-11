import type { ImageLoaderProps } from "next/image";

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

if (!CLOUDINARY_CLOUD_NAME) {
  // Erreur explicite en dev plutôt qu'une image cassée silencieuse.
  console.warn(
    "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME n'est pas défini — les images Cloudinary ne se chargeront pas."
  );
}

type CloudinaryLoaderOptions = {
  /** Recadrage carré (utile pour des vignettes). Sinon, largeur seule est envoyée à Cloudinary. */
  square?: boolean;
};

/**
 * Construit un loader next/image pour une public_id Cloudinary donnée.
 * `src` doit être la public_id Cloudinary (ex: "jdr-reunion/events/3-brasseurs"),
 * pas une URL complète.
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