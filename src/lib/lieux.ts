export const LIEUX: Record<string, { label: string; venue: string; ville: string; adresse: string; schedule: string; image?: string }> = {
  "3brasseurs": {
    label: "3 Brasseurs (Saint-Paul)",
    venue: "3 Brasseurs",
    ville: "Saint-Paul",
    adresse: "Front de mer, Saint-Paul",
    schedule: "Tous les dimanches",
    image: "/images/3-brasseurs.jpeg",
  },
  "la-kour": {
    label: "La Kour (Saint-Leu)",
    venue: "La Kour",
    ville: "Saint-Leu",
    adresse: "La Kour, Saint-Leu",
    schedule: "Tous les mercredis soirs",
    image: "/images/laKourcaferoliste.png",
  },
  "qg-tampon": {
    label: "QG association (Le Tampon)",
    venue: "Local JDR Réunion",
    ville: "Le Tampon",
    adresse: "Le Tampon",
    schedule: "Permanence hebdomadaire",
    image: "/images/qg-tampon.png",
  },
};

export function estUnLieu(id: string): boolean {
  return id in LIEUX;
}