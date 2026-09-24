export const LIEUX: Record<string, { label: string; venue: string; ville: string; adresse: string; schedule: string; image?: string }> = {
  "3brasseurs": {
    label: "3 Brasseurs (Saint-Paul)",
    venue: "3 Brasseurs",
    ville: "Saint-Paul",
    adresse: "Front de mer, Saint-Paul",
    schedule: "Premier dimanche du mois ",
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
  "destruction-room": {
    label: "Destruction Room (Saint-Pierre)",
    venue: "Destruction Room",
    ville: "Saint-Pierre",
    adresse: "38 Rue Désiré Barquisseau, Saint-Pierre 97410",
    schedule: "Une fois par mois",
    image: "/images/destruction-room.jpeg",
  },
};

export function estUnLieu(id: string): boolean {
  return id in LIEUX;
}