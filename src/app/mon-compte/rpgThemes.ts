import type { CSSProperties } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// POLICES
// ─────────────────────────────────────────────────────────────────────────────

export const FONT_IMPORT_URL =
  "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap";

// ─────────────────────────────────────────────────────────────────────────────
// IMAGES UNSPLASH
// ─────────────────────────────────────────────────────────────────────────────

const U = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;

export const IMGS = {
  // Fonds des univers
  bgFantasy: U("photo-1713993646583-584a29476476", 1400, 900),
  bgCyberpunk: U("photo-1601042879364-f3947d3f9c16", 1400, 900),
  bgScifi: U("photo-1464802686167-b939a6910659", 1400, 900),
  bgHorror: U("photo-1494376877685-d3d2559d4f82", 1400, 900),

  // Événements
  evDnd: U("photo-1650024520226-b63a33baff60", 600, 200),
  evCyber: U("photo-1519608487953-e999c86e7455", 600, 200),
  evHorror: U("photo-1641667838410-b257ca266e38", 600, 200),
  evScifi: U("photo-1462331940025-496dfbfc7564", 600, 200),

  // Tables
  tblPathfinder: U("photo-1549056572-75914d5d5fd4", 700, 220),
  tblStarfinder: U("photo-1462332420958-a05d1e002413", 700, 220),

  // Portraits
  portraitElf: U(
    "flagged/photo-1575655184325-69a10ea6a3b9",
    400,
    500
  ),

  portraitRobot: U(
    "photo-1737644467636-6b0053476bb2",
    400,
    500
  ),

  // Dés
  dice: U("photo-1651677584025-6c844f0bd65c", 300, 300),
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ThemeId =
  | "fantasy"
  | "cyberpunk"
  | "scifi"
  | "horror";

export const THEME_ORDER: ThemeId[] = [
  "fantasy",
  "cyberpunk",
  "scifi",
  "horror",
];

export type NiveauChoice =
  | "debutant"
  | "confirme"
  | "expert";

export type Poste =
  | "president"
  | "tresorier"
  | "secretaire";

// ─────────────────────────────────────────────────────────────────────────────
// VOCABULAIRE
// ─────────────────────────────────────────────────────────────────────────────

export type ThemeVocab = {
  eyebrow: string;

  loading: string;
  logout: string;

  tabApercu: string;
  tabInscriptions: string;
  tabEvenements: string;
  tabMessages: string;
  tabProfil: string;

  sectionInscriptions: string;
  sectionEvenements: string;
  sectionProfil: string;

  emptyInscriptions: string;
  emptyEvenements: string;
  browseCta: string;

  cancelLabel: string;
  removeLabel: string;

  classLabel: string;
  classMJ: string;
  classJoueur: string;

  niveauLabel: string;
  posteLabel: string;

  roleIconMJ: string;
  roleIconJoueur: string;

  niveauValues: Record<NiveauChoice, string>;
  posteValues: Record<Poste, string>;
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPE D'UN THÈME
// ─────────────────────────────────────────────────────────────────────────────

export type RPGTheme = {
  label: string;
  seal: string;
  bgImg: string;
  scanlines?: boolean;

  vars: Record<string, string>;

  vocab: ThemeVocab;
};

// ─────────────────────────────────────────────────────────────────────────────
// VOCABULAIRE COMMUN
// ─────────────────────────────────────────────────────────────────────────────

const COMMON_VOCAB: ThemeVocab = {
  eyebrow: "FICHE D'AVENTURIER",

  loading: "Chargement de votre fiche…",
  logout: "Déconnexion",

  tabApercu: "Aperçu",
  tabInscriptions: "Mes inscriptions",
  tabEvenements: "Mes événements",
  tabMessages: "Messages",
  tabProfil: "Profil",

  sectionInscriptions: "Mes inscriptions",
  sectionEvenements: "Mes événements",
  sectionProfil: "Mon profil",

  emptyInscriptions:
    "Vous n'avez aucune inscription en cours.",

  emptyEvenements:
    "Vous n'avez encore créé aucun événement.",

  browseCta: "Découvrir les événements →",

  cancelLabel: "Annuler",
  removeLabel: "Retirer",

  classLabel: "CLASSE",
  classMJ: "Maître du Jeu",
  classJoueur: "Joueur",

  niveauLabel: "NIVEAU",
  posteLabel: "POSTE",

  roleIconMJ: "🎲",
  roleIconJoueur: "⚔️",

  niveauValues: {
    debutant: "Débutant",
    confirme: "Confirmé",
    expert: "Expert",
  },

  posteValues: {
    president: "Président",
    tresorier: "Trésorier",
    secretaire: "Secrétaire",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// THÈMES
// ─────────────────────────────────────────────────────────────────────────────

export const RPG_THEMES: Record<ThemeId, RPGTheme> = {
  // ───────────────────────────────────────────────────────────────────────────
  // FANTASY
  // ───────────────────────────────────────────────────────────────────────────

  fantasy: {
    label: "Heroic Fantasy",
    seal: "🔮",
    bgImg: IMGS.bgFantasy,

    vars: {
      "--bg": "#181208",
"--surface": "#2a2112",
"--surface2": "#352916",

      "--edge": "#3d3018",
      "--line": "#2a2010",

      "--ink": "#f5ead7",
"--ink-f": "#c9b88d",
      "--ink-p": "#60503a",

      "--accent": "#d9b957",  // Or
"--accent2": "#e05a1f", // Orange/rouge lumineux
      "--good": "#4a7c59",
      "--gold": "#c9a84c",

      "--r": "2px",

      "--font-d": "'Cinzel', serif",
      "--font-b": "'Crimson Pro', serif",
      "--font-l": "'JetBrains Mono', monospace",
    },

    vocab: {
      ...COMMON_VOCAB,
      eyebrow: "FICHE D'AVENTURIER",
      classMJ: "Maître du Jeu",
      classJoueur: "Aventurier",
      roleIconMJ: "🎲",
      roleIconJoueur: "⚔️",
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // CYBERPUNK
  // ───────────────────────────────────────────────────────────────────────────

  cyberpunk: {
    label: "Cyberpunk 2088",
    seal: "⚡",
    bgImg: IMGS.bgCyberpunk,
    scanlines: true,

    vars: {
      "--bg": "#02040a",
      "--surface": "#060c18",
      "--surface2": "#0a1424",

      "--edge": "#0f2844",
      "--line": "#081a30",

      "--ink": "#b8e0ff",
      "--ink-f": "#5890b8",
      "--ink-p": "#2a5070",

      "--accent": "#00d4ff",
      "--accent2": "#ff1a6e",
      "--good": "#00ff88",
      "--gold": "#ff8c00",

      "--r": "0px",

      "--font-d": "'JetBrains Mono', monospace",
      "--font-b": "'JetBrains Mono', monospace",
      "--font-l": "'JetBrains Mono', monospace",
    },

    vocab: {
      ...COMMON_VOCAB,
      eyebrow: "IDENTITÉ // DOSSIER PERSONNEL",
      classMJ: "Opérateur",
      classJoueur: "Runner",
      roleIconMJ: "⚡",
      roleIconJoueur: "💾",
      cancelLabel: "Annuler",
      removeLabel: "Exclure",
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // SCIENCE-FICTION
  // ───────────────────────────────────────────────────────────────────────────

  scifi: {
    label: "Science-Fiction",
    seal: "🚀",
    bgImg: IMGS.bgScifi,

    vars: {
      "--bg": "#02040e",
      "--surface": "#060c1c",
      "--surface2": "#0a1228",

      "--edge": "#142240",
      "--line": "#0c1830",

      "--ink": "#cce4ff",
      "--ink-f": "#6a9ec8",
      "--ink-p": "#3a6088",

      "--accent": "#3a8eff",
      "--accent2": "#00e5cc",
      "--good": "#00ff99",
      "--gold": "#ffd060",

      "--r": "6px",

      "--font-d": "'Cinzel', serif",
      "--font-b": "'Crimson Pro', serif",
      "--font-l": "'JetBrains Mono', monospace",
    },

    vocab: {
      ...COMMON_VOCAB,
      eyebrow: "DOSSIER D'EXPLORATEUR",
      classMJ: "Commandant",
      classJoueur: "Explorateur",
      roleIconMJ: "🛰️",
      roleIconJoueur: "🚀",
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // HORREUR
  // ───────────────────────────────────────────────────────────────────────────

  horror: {
    label: "Horreur Lovecraftienne",
    seal: "👁️",
    bgImg: IMGS.bgHorror,

    vars: {
      "--bg": "#04020a",
      "--surface": "#0e080c",
      "--surface2": "#140a10",

      "--edge": "#2a1428",
      "--line": "#1a0c18",

      "--ink": "#d4c0d4",
      "--ink-f": "#806080",
      "--ink-p": "#402840",

      "--accent": "#8b0028",
      "--accent2": "#5a0080",
      "--good": "#2a6a2a",
      "--gold": "#7a6a00",

      "--r": "1px",

      "--font-d": "'Cinzel', serif",
      "--font-b": "'Crimson Pro', serif",
      "--font-l": "'JetBrains Mono', monospace",
    },

    vocab: {
      ...COMMON_VOCAB,
      eyebrow: "DOSSIER DU SUJET",
      classMJ: "Gardien des Secrets",
      classJoueur: "Investigateur",
      roleIconMJ: "☠️",
      roleIconJoueur: "👁️",
      cancelLabel: "Abandonner",
      removeLabel: "Écarter",
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL STORAGE
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "ficheTheme";

export function loadStoredTheme(): ThemeId {
  if (typeof window === "undefined") {
    return "fantasy";
  }

  const stored = localStorage.getItem(STORAGE_KEY);

  if (
    stored === "fantasy" ||
    stored === "cyberpunk" ||
    stored === "scifi" ||
    stored === "horror"
  ) {
    return stored;
  }

  return "fantasy";
}

export function storeTheme(themeId: ThemeId) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, themeId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITAIRES CSS
// ─────────────────────────────────────────────────────────────────────────────

export function getThemeVars(
  themeId: ThemeId
): CSSProperties {
  return RPG_THEMES[themeId].vars as CSSProperties;
}

export function tv(name: string): string {
  return `var(${name})`;
}