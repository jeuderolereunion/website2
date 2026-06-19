# JDR Réunion — Système d'authentification & gestion des tables

Ce document explique comment intégrer les nouvelles fonctionnalités dans votre projet existant.

---

## 📋 Nouvelles fonctionnalités

- **Inscription** (email + mot de passe, choix rôle Joueur/MJ)
- **Connexion** sécurisée via NextAuth.js (JWT)
- **Liste des tables** publique avec filtres, jauge de places, bouton d'inscription
- **Création de tables** réservée aux MJ (titre, jeu, description, lieu, date, places, niveau)
- **Gestion des inscriptions** : joueurs s'inscrivent → MJ confirme ou refuse
- **Dashboard** : joueurs voient leurs inscriptions, MJ gèrent leurs tables

---

## 🛠️ Installation

### 1. Installer les nouvelles dépendances

```bash
npm install next-auth @prisma/client bcryptjs zod
npm install -D prisma @types/bcryptjs tsx
```

### 2. Configurer la base de données

Créez un fichier `.env.local` à la racine (copiez `.env.example`) :

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
NEXTAUTH_SECRET="votre-secret-32-chars-minimum"
NEXTAUTH_URL="http://localhost:3000"
```

> **Options gratuites pour la BDD PostgreSQL :**
> - [Supabase](https://supabase.com) — gratuit, hébergé en Europe
> - [Neon](https://neon.tech) — serverless PostgreSQL gratuit
> - Local avec Docker : `docker run -e POSTGRES_PASSWORD=pass -p 5432:5432 postgres`

### 3. Initialiser Prisma et créer les tables

```bash
# Générer le client Prisma
npx prisma generate

# Créer les tables en base (développement)
npx prisma db push

# OU créer une migration formelle (production)
npx prisma migrate dev --name init
```

### 4. Ajouter le SessionProvider dans votre layout racine

Dans `src/app/layout.tsx`, wrappez `{children}` avec le `SessionProvider` :

```tsx
import { SessionProvider } from "@/components/SessionProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

### 5. Lancer en développement

```bash
npm run dev
```

---

## 📁 Fichiers ajoutés

```
prisma/
  schema.prisma              ← Modèles BDD (User, Table, Inscription)

src/
  lib/
    auth.ts                  ← Configuration NextAuth
    db.ts                    ← Client Prisma singleton
  types/
    next-auth.d.ts           ← Types TypeScript pour la session
  components/
    SessionProvider.tsx      ← Wrapper client NextAuth

  app/
    api/
      auth/[...nextauth]/
        route.ts             ← Route NextAuth
      register/
        route.ts             ← POST : créer un compte
      tables/
        route.ts             ← GET : liste, POST : créer une table (MJ)
        [id]/inscriptions/
          route.ts           ← POST : s'inscrire, DELETE : se désinscrire, PATCH : gérer
      user/
        inscriptions/route.ts  ← GET : mes inscriptions
        tables/route.ts        ← GET : mes tables (MJ)

    (auth)/
      login/page.tsx         ← Page de connexion
      register/page.tsx      ← Page d'inscription

    tables/
      page.tsx               ← Liste publique des tables
      create/page.tsx        ← Créer une table (MJ)

    dashboard/
      page.tsx               ← Mon espace (inscriptions + gestion MJ)
```

---

## 🔗 Nouvelles routes

| URL | Description | Accès |
|-----|-------------|-------|
| `/login` | Connexion | Public |
| `/register` | Créer un compte | Public |
| `/tables` | Liste des tables | Public |
| `/tables/create` | Créer une table | MJ uniquement |
| `/dashboard` | Mon espace | Connecté |

---

## 🗂️ Modèle de données

```
User
  id, name, email, password (hashé bcrypt)
  role: JOUEUR | MJ | ADMIN

Table
  id, titre, jeu, description, lieu
  dateHeure, placesTotal, niveauRequis
  statut: OUVERTE | COMPLETE | ANNULEE
  mjId → User

Inscription
  id, statut: EN_ATTENTE | CONFIRMEE | REFUSEE
  userId → User
  tableId → Table
  [userId + tableId] unique
```

---

## ⚙️ CI/CD GitLab

Le script `build` exécute `prisma generate` avant `next build`. Assurez-vous que ces variables sont définies dans les CI/CD variables de votre projet GitLab :

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

---

## 📞 Contact

JDR Réunion — contact@jdr-reunion.re
