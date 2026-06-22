"use client";
import Navigation from "@/components/Navigation";
import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

type Props = {
  mode: "login" | "register";
  redirectTo?: string;
};

export default function AuthForm({
  mode,
  redirectTo = "/",
}: Props) {
  const router = useRouter();
  const [success, setSuccess] = useState("");

  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [error, setError] =
    useState("");
  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");

    try {
  setLoading(true);

  if (mode === "register") {
    if (!pseudo.trim()) {
      throw new Error(
        "Le pseudo est obligatoire."
      );
    }

    if (password.length < 8) {
      throw new Error(
        "Le mot de passe doit contenir au moins 8 caractères."
      );
    }

    if (password !== confirmPassword) {
      throw new Error(
        "Les mots de passe ne correspondent pas."
      );
    }

    const credential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    await fetch("/api/register-email", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email,
    pseudo,
  }),
});


    await setDoc(
      doc(
        db,
        "users",
        credential.user.uid
      ),
      {
        uid: credential.user.uid,
        pseudo,
        email,
        role: "membre",
        createdAt: serverTimestamp(),
        avatar: "",
        bio: "",
        emailVerified: false,
      }
    );
   
    

setSuccess(
  "✅ Compte créé avec succès."
);
 await signOut(auth);

setTimeout(() => {
  router.push("/login");
});

  } else {

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  }

  


} catch (err: any) {
      setError(
        err.message ||
          "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {mode === "register" && (
        <>
          <input
            type="text"
            placeholder="Pseudo"
            value={pseudo}
            onChange={(e) =>
              setPseudo(
                e.target.value
              )
            }
          />
          <br />
          <br />
        </>
      )}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) =>
          setEmail(
            e.target.value
          )
        }
      />

      <br />
      <br />

      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) =>
          setPassword(
            e.target.value
          )
        }
      />

      {mode === "register" && (
        <>
          <br />
          <br />

          <input
            type="password"
            placeholder="Confirmer le mot de passe"
            value={
              confirmPassword
            }
            onChange={(e) =>
              setConfirmPassword(
                e.target.value
              )
            }
          />
        </>
      )}

      <br />
      <br />

      <button
        type="submit"
        disabled={loading}
      >
        {loading
          ? "Chargement..."
          : mode === "login"
          ? "Se connecter"
          : "Créer un compte"}
      </button>
     {success && (
  <div
    style={{
      marginTop: "1rem",
      padding: "1rem",
      borderRadius: "12px",
      background: "rgba(34,197,94,0.15)",
      border: "1px solid rgba(34,197,94,0.4)",
      color: "#86efac",
    }}
  >
    <h3>🎲 Bienvenue sur JDR Réunion !</h3>
    <p>
      Votre compte a été créé avec succès.
    </p>
    <p>
      Vérifiez votre boîte mail pour consulter votre message de bienvenue.
    </p>
     <button
      type="button"
      onClick={() => router.push("/")}
      style={{
        marginTop: "1rem",
        padding: "0.75rem 1rem",
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
      }}
    >
      🏠 Retour à l'accueil
    </button>
  </div>
)}
      {error && (
        <p
          style={{
            color: "red",
            marginTop: "1rem",
          }}
        >
          {error}
        </p>
      )}
    </form>
  );
}