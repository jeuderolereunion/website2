"use client";

import styled, { keyframes } from "styled-components";
import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  mode: "login" | "register";
  redirectTo?: string;
};

type RoleChoice = "joueur" | "mj";

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// ─── Styled components ────────────────────────────────────────────────────────

const Wrapper = styled.div`
  min-height: 100vh;
  background: #0d0d14;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5rem 1rem 2rem;
`;

const Card = styled.div`
  width: 100%;
  max-width: 420px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 20px;
  padding: 2.5rem 2rem;
  animation: ${fadeIn} 0.35s ease;

  @media (max-width: 480px) {
    padding: 2rem 1.25rem;
    border-radius: 16px;
  }
`;

const Logo = styled.div`
  text-align: center;
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

const CardTitle = styled.h1`
  text-align: center;
  font-size: 1.5rem;
  font-weight: 800;
  color: white;
  margin-bottom: 0.35rem;
`;

const CardSubtitle = styled.p`
  text-align: center;
  font-size: 0.88rem;
  color: rgba(255,255,255,0.4);
  margin-bottom: 2rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Row = styled.div`
  display: flex;
  gap: 0.75rem;

  @media (max-width: 480px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
`;

const Label = styled.label`
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(255,255,255,0.45);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.7rem 1rem;
  padding-right: 2.5rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.06);
  color: white;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.15s, background 0.15s;
  box-sizing: border-box;

  &::placeholder { color: rgba(255,255,255,0.2); }

  &:focus {
    border-color: rgba(160,120,255,0.6);
    background: rgba(255,255,255,0.08);
  }
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;

  &:hover {
    color: rgba(255,255,255,0.6);
  }

  &:active {
    color: rgba(160,120,255,0.8);
  }
`;

const RoleGroup = styled.div`
  display: flex;
  gap: 0.75rem;

  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

const RoleCard = styled.label<{ $active: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid ${p => p.$active ? "rgba(160,120,255,0.7)" : "rgba(255,255,255,0.1)"};
  background: ${p => p.$active ? "rgba(120,80,255,0.15)" : "rgba(255,255,255,0.04)"};
  transition: border-color 0.15s, background 0.15s;

  input {
    display: none;
  }

  strong {
    font-size: 0.9rem;
    color: white;
  }

  span {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.45);
    line-height: 1.3;
  }
`;

const SubmitBtn = styled.button`
  width: 100%;
  padding: 0.8rem;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.95rem;
  margin-top: 0.5rem;
  background: linear-gradient(135deg, rgba(120,80,255,0.8), rgba(80,40,200,0.9));
  color: white;
  transition: opacity 0.15s, transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const GoogleBtn = styled.button`
  width: 100%;
  padding: 0.8rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.08);
  color: white;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;

  &:hover:not(:disabled) {
    background: rgba(255,255,255,0.12);
    border-color: rgba(255,255,255,0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const Spinner = styled.span`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  display: inline-block;
  animation: ${spin} 0.7s linear infinite;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.5rem 0;

  &::before, &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.08);
  }

  span {
    font-size: 0.78rem;
    color: rgba(255,255,255,0.3);
  }
`;

const SwitchLink = styled.p`
  text-align: center;
  font-size: 0.88rem;
  color: rgba(255,255,255,0.4);
  margin-top: 0.25rem;

  a {
    color: rgba(180,150,255,1);
    text-decoration: none;
    font-weight: 600;
    cursor: pointer;

    &:hover { text-decoration: underline; }
  }
`;

const SuccessBox = styled.div`
  margin-top: 1rem;
  padding: 1.25rem;
  border-radius: 12px;
  background: rgba(34,197,94,0.1);
  border: 1px solid rgba(34,197,94,0.3);
  color: #86efac;
  animation: ${fadeIn} 0.3s ease;

  h3 {
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  p {
    font-size: 0.85rem;
    line-height: 1.5;
    opacity: 0.85;
    margin-top: 0.25rem;
  }
`;

const ErrorBox = styled.div`
  margin-top: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: rgba(255,80,80,0.1);
  border: 1px solid rgba(255,80,80,0.25);
  color: #ff9a9a;
  font-size: 0.85rem;
  animation: ${fadeIn} 0.2s ease;
`;

// ─── Modale de choix de rôle (nouveaux comptes Google) ─────────────────────

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
`;

const ModalCard = styled.div`
  width: 100%;
  max-width: 380px;
  background: #16161f;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 18px;
  padding: 1.75rem;
  animation: ${fadeIn} 0.25s ease;
`;

const ModalTitle = styled.h2`
  font-size: 1.15rem;
  font-weight: 800;
  color: white;
  margin-bottom: 0.35rem;
  text-align: center;
`;

const ModalSubtitle = styled.p`
  font-size: 0.85rem;
  color: rgba(255,255,255,0.45);
  text-align: center;
  margin-bottom: 1.5rem;
`;

// ─── Composant ────────────────────────────────────────────────────────────────

export default function AuthForm({ mode, redirectTo = "/" }: Props) {
  const router = useRouter();

  // ─── États du formulaire ───────────────────────────────────────────────

  const [prenom, setPrenom]                   = useState("");
  const [nom, setNom]                         = useState("");
  const [role, setRole]                       = useState<RoleChoice>("joueur");
  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError]                     = useState("");
  const [success, setSuccess]                 = useState("");
  const [loading, setLoading]                 = useState(false);

  // ─── État pour la finalisation d'un compte Google (choix du rôle) ───────
  // Un nouvel utilisateur Google n'a pas passé par le RoleGroup du formulaire
  // register (surtout s'il vient de la page login) : on lui demande donc son
  // rôle explicitement avant de créer le document Firestore, au lieu de le
  // forcer silencieusement à "joueur".
  const [pendingGoogleUser, setPendingGoogleUser] = useState<any>(null);
  const [googleRole, setGoogleRole]               = useState<RoleChoice>("joueur");

  // ─── Fonction pour traduire les erreurs Firebase ────────────────────────

  function translateError(err: any): string {
    const code = err?.code as string | undefined;

    if (code === "auth/email-already-in-use") return "Cet email est déjà utilisé.";
    if (code === "auth/invalid-email") return "Adresse email invalide.";
    if (code === "auth/weak-password") return "Le mot de passe est trop faible.";
    if (code === "auth/wrong-password" || code === "auth/invalid-credential") return "Email ou mot de passe incorrect.";
    if (code === "auth/user-not-found") return "Aucun compte associé à cet email.";
    if (code === "auth/too-many-requests") return "Trop de tentatives. Réessayez plus tard.";
    if (code === "auth/popup-closed-by-user") return "Connexion Google annulée.";
    if (code === "auth/popup-blocked") return "La fenêtre Google a été bloquée par le navigateur. Autorisez les popups et réessayez.";
    if (code === "auth/unauthorized-domain") return "Ce domaine n'est pas autorisé pour la connexion Google. Contactez le support.";
    if (code === "permission-denied" || err?.message?.includes("permissions")) {
      return "Impossible de finaliser cette action pour le moment. Contactez le support si le problème persiste.";
    }

    return err?.message || "Une erreur est survenue. Veuillez réessayer.";
  }

  // ─── Crée le profil Firestore pour un utilisateur Google + redirige ─────

  async function finalizeGoogleProfile(user: any, chosenRole: RoleChoice) {
    const [prenom, ...nomParts] = (user.displayName || "").split(" ");
    const userNom = nomParts.join(" ") || "Utilisateur";

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      prenom: prenom || "",
      nom: userNom,
      pseudo: user.displayName || "",
      email: user.email || "",
      role: chosenRole,
      isMJ: chosenRole === "mj",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      avatar: user.photoURL || "",
      bio: "",
      emailVerified: user.emailVerified,
      status: "pending", // En attente de validation admin
    });

    // Compte fraîchement créé et en attente : on informe l'utilisateur puis
    // on le déconnecte, cohérent avec le flux email/mot de passe.
    await signOut(auth);
    setPendingGoogleUser(null);
    setSuccess("ok");
    setTimeout(() => router.push("/login"), 6000);
  }

  // ─── Fonction pour gérer la connexion Google ──────────────────────────────

  async function handleGoogleSignIn() {
    try {
      setError("");
      setLoading(true);

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Vérifier si l'utilisateur existe déjà en Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        // ─── Nouveau compte via Google ───────────────────────────────
        if (mode === "register") {
          // Le rôle a déjà été choisi dans le RoleGroup du formulaire
          // register : on l'utilise directement, pas besoin de re-demander.
          await finalizeGoogleProfile(user, role);
        } else {
          // Depuis la page login on n'a pas de RoleGroup affiché : on
          // demande explicitement le rôle avant d'écrire quoi que ce soit
          // en Firestore. Le compte Auth existe déjà mais reste sans
          // profil tant que la modale n'est pas validée.
          setPendingGoogleUser(user);
          setLoading(false);
        }
        return;
      }

      // ─── Compte existant : vérifier son statut ───────────────────────
      const userData = userDoc.data();

      if (userData?.status === "pending") {
        await signOut(auth);
        throw new Error(
          "Votre compte est en attente de validation par un administrateur. Vous recevrez un accès dès qu'il sera validé."
        );
      }

      if (userData?.status === "suspended") {
        await signOut(auth);
        throw new Error("Votre compte a été suspendu. Contactez un administrateur.");
      }

      router.push(redirectTo);
    } catch (err: any) {
      setError(translateError(err));
    } finally {
      setLoading(false);
    }
  }

  // ─── Validation de la modale de choix de rôle (nouveau compte Google) ───

  async function handleConfirmGoogleRole() {
    if (!pendingGoogleUser) return;
    try {
      setError("");
      setLoading(true);
      await finalizeGoogleProfile(pendingGoogleUser, googleRole);
    } catch (err: any) {
      setError(translateError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelGoogleRole() {
    // L'utilisateur ferme la modale sans choisir : on annule proprement,
    // aucun document Firestore n'a été créé, on déconnecte le compte Auth.
    await signOut(auth).catch(() => {});
    setPendingGoogleUser(null);
  }

  // ─── Fonction pour gérer l'inscription/connexion ────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      if (mode === "register") {
        // ─── Validation des champs ─────────────────────────────────────
        if (!prenom.trim()) throw new Error("Le prénom est obligatoire.");
        if (!nom.trim()) throw new Error("Le nom est obligatoire.");
        if (password.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
        if (password !== confirmPassword) throw new Error("Les mots de passe ne correspondent pas.");

        // ─── Créer le compte utilisateur ───────────────────────────────
        const credential = await createUserWithEmailAndPassword(auth, email, password);

        try {
          // Email de vérification natif Firebase
          await sendEmailVerification(credential.user);

          // Email de bienvenue custom (optionnel, via votre API)
          try {
            await fetch("/api/register-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, prenom, nom, role }),
            });
          } catch (emailError) {
            console.warn("Erreur lors de l'envoi de l'email de bienvenue:", emailError);
          }

          // Créer le document utilisateur en Firestore
          await setDoc(doc(db, "users", credential.user.uid), {
            uid: credential.user.uid,
            prenom,
            nom,
            pseudo: `${prenom} ${nom}`,
            email: email.toLowerCase(),
            role,
            isMJ: role === "mj",
            // Le compte doit être validé par un admin avant de devenir "active"
            status: "pending",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            avatar: "",
            bio: "",
            emailVerified: false,
          });
        } catch (innerErr) {
          // Rollback : si une étape échoue après la création du compte Auth,
          // on supprime ce compte fantôme pour libérer l'email pour un nouvel essai.
          await credential.user.delete().catch(() => {});
          throw innerErr;
        }

        setSuccess("ok");
        await signOut(auth);
        setTimeout(() => router.push("/login"), 6000);

      } else {
        // ─── Mode Login ────────────────────────────────────────────────
        const credential = await signInWithEmailAndPassword(auth, email, password);

        const userSnap = await getDoc(doc(db, "users", credential.user.uid));

        if (userSnap.exists() && userSnap.data().status === "pending") {
          await signOut(auth);
          throw new Error(
            "Votre compte est en attente de validation par un administrateur. Vous recevrez un accès dès qu'il sera validé."
          );
        }

        if (userSnap.exists() && userSnap.data().status === "suspended") {
          await signOut(auth);
          throw new Error("Votre compte a été suspendu. Contactez un administrateur.");
        }

        router.push(redirectTo);
      }

    } catch (err: any) {
      setError(translateError(err));
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <Wrapper>
      <Card>
        <Logo>⚔️</Logo>
        <CardTitle>{isLogin ? "Bon retour !" : "Rejoignez l'aventure"}</CardTitle>
        <CardSubtitle>
          {isLogin
            ? "Connectez-vous à votre compte JDR Réunion"
            : "Créez votre compte pour rejoindre la communauté"}
        </CardSubtitle>

        {success ? (
          <SuccessBox>
            <h3>🎲 Bienvenue sur JDR Réunion !</h3>
            <p>Votre compte a été créé avec succès.</p>
            <p>Un administrateur doit valider votre inscription avant que vous puissiez vous connecter.</p>
            <p>Un email de vérification vous a aussi été envoyé.</p>
            <p>Redirection vers la connexion dans quelques secondes…</p>
          </SuccessBox>
        ) : (
          <Form onSubmit={handleSubmit}>

            {!isLogin && (
              <>
                <Row>
                  <Field>
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input
                      id="prenom"
                      type="text"
                      placeholder="Votre prénom"
                      value={prenom}
                      onChange={e => setPrenom(e.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="nom">Nom</Label>
                    <Input
                      id="nom"
                      type="text"
                      placeholder="Votre nom"
                      value={nom}
                      onChange={e => setNom(e.target.value)}
                      required
                    />
                  </Field>
                </Row>

                <Field>
                  <Label>Je m'inscris en tant que</Label>
                  <RoleGroup>
                    <RoleCard $active={role === "joueur"}>
                      <input
                        type="radio"
                        name="role"
                        value="joueur"
                        checked={role === "joueur"}
                        onChange={() => setRole("joueur")}
                      />
                      <strong>🎲 Joueur</strong>
                      <span>Rejoindre des parties organisées par d'autres</span>
                    </RoleCard>
                    <RoleCard $active={role === "mj"}>
                      <input
                        type="radio"
                        name="role"
                        value="mj"
                        checked={role === "mj"}
                        onChange={() => setRole("mj")}
                      />
                      <strong>🧙 MJ &amp; Joueur</strong>
                      <span>Créer des événements de parties et aussi y participer</span>
                    </RoleCard>
                  </RoleGroup>
                </Field>
              </>
            )}

            <Field>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </Field>

            <Field>
              <Label htmlFor="password">Mot de passe</Label>
              <InputWrapper>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isLogin ? "••••••••" : "8 caractères minimum"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <PasswordToggle
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Masquer" : "Afficher"}
                  tabIndex={-1}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </PasswordToggle>
              </InputWrapper>
            </Field>

            {!isLogin && (
              <Field>
                <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                <InputWrapper>
                  <Input
                    id="confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                  <PasswordToggle
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title={showConfirmPassword ? "Masquer" : "Afficher"}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                  </PasswordToggle>
                </InputWrapper>
              </Field>
            )}

            {error && <ErrorBox>{error}</ErrorBox>}

            <SubmitBtn type="submit" disabled={loading}>
              {loading
                ? <><Spinner /> Chargement…</>
                : isLogin ? "Se connecter" : "Créer mon compte"}
            </SubmitBtn>

            <Divider><span>ou</span></Divider>

            <GoogleBtn
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuer avec Google
            </GoogleBtn>

            <SwitchLink>
              {isLogin ? (
                <>Pas encore de compte ? <a onClick={() => router.push("/register")}>S'inscrire</a></>
              ) : (
                <>Déjà un compte ? <a onClick={() => router.push("/login")}>Se connecter</a></>
              )}
            </SwitchLink>

          </Form>
        )}
      </Card>

      {pendingGoogleUser && (
        <ModalOverlay>
          <ModalCard>
            <ModalTitle>Dernière étape 🎲</ModalTitle>
            <ModalSubtitle>
              Comment souhaitez-vous rejoindre JDR Réunion&nbsp;?
            </ModalSubtitle>

            <RoleGroup>
              <RoleCard $active={googleRole === "joueur"}>
                <input
                  type="radio"
                  name="googleRole"
                  value="joueur"
                  checked={googleRole === "joueur"}
                  onChange={() => setGoogleRole("joueur")}
                />
                <strong>🎲 Joueur</strong>
                <span>Rejoindre des parties organisées par d'autres</span>
              </RoleCard>
              <RoleCard $active={googleRole === "mj"}>
                <input
                  type="radio"
                  name="googleRole"
                  value="mj"
                  checked={googleRole === "mj"}
                  onChange={() => setGoogleRole("mj")}
                />
                <strong>🧙 MJ &amp; Joueur</strong>
                <span>Créer des événements de parties et aussi y participer</span>
              </RoleCard>
            </RoleGroup>

            {error && <ErrorBox>{error}</ErrorBox>}

            <SubmitBtn
              type="button"
              disabled={loading}
              onClick={handleConfirmGoogleRole}
              style={{ marginTop: "1.25rem" }}
            >
              {loading ? <><Spinner /> Création…</> : "Confirmer"}
            </SubmitBtn>

            <SwitchLink>
              <a onClick={handleCancelGoogleRole}>Annuler</a>
            </SwitchLink>
          </ModalCard>
        </ModalOverlay>
      )}
    </Wrapper>
  );
}