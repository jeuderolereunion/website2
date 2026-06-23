"use client";

import styled, { keyframes } from "styled-components";
import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import {
  doc,
  setDoc,
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

const Input = styled.input`
  width: 100%;
  padding: 0.7rem 1rem;
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

// ─── Composant ────────────────────────────────────────────────────────────────

export default function AuthForm({ mode, redirectTo = "/" }: Props) {
  const router = useRouter();

  const [prenom, setPrenom]                   = useState("");
  const [nom, setNom]                         = useState("");
  const [role, setRole]                       = useState<RoleChoice>("joueur");
  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError]                     = useState("");
  const [success, setSuccess]                 = useState("");
  const [loading, setLoading]                 = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      if (mode === "register") {
        if (!prenom.trim()) throw new Error("Le prénom est obligatoire.");
        if (!nom.trim()) throw new Error("Le nom est obligatoire.");
        if (password.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
        if (password !== confirmPassword) throw new Error("Les mots de passe ne correspondent pas.");

        const credential = await createUserWithEmailAndPassword(auth, email, password);

        // Email de vérification natif Firebase
        await sendEmailVerification(credential.user);

        // Email de bienvenue custom (optionnel, via votre API)
        await fetch("/api/register-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, prenom, nom }),
        });

        await setDoc(doc(db, "users", credential.user.uid), {
          uid: credential.user.uid,
          prenom,
          nom,
          pseudo: `${prenom} ${nom}`,
          email,
          // droits : "mj" peut créer des événements/parties ET s'inscrire
          // "joueur" peut uniquement s'inscrire aux parties
          role,
          isMJ: role === "mj",
          createdAt: serverTimestamp(),
          avatar: "",
          bio: "",
          emailVerified: false,
        });

        setSuccess("ok");
        await signOut(auth);
        setTimeout(() => router.push("/login"), 5000);

      } else {
        await signInWithEmailAndPassword(auth, email, password);
        router.push(redirectTo);
      }

    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
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
            <p>Un email de vérification vous a été envoyé, cliquez sur le lien pour confirmer votre adresse.</p>
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
              <Input
                id="password"
                type="password"
                placeholder={isLogin ? "••••••••" : "8 caractères minimum"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </Field>

            {!isLogin && (
              <Field>
                <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </Field>
            )}

            {error && <ErrorBox>{error}</ErrorBox>}

            <SubmitBtn type="submit" disabled={loading}>
              {loading
                ? <><Spinner /> Chargement…</>
                : isLogin ? "Se connecter" : "Créer mon compte"}
            </SubmitBtn>

            <Divider><span>ou</span></Divider>

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
    </Wrapper>
  );
}