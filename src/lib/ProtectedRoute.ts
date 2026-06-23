// ─── FILE: lib/ProtectedRoute.tsx ─────────────────────────────────────────────

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type RoleType = "joueur" | "mj" | "admin";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: RoleType | RoleType[];
  requireEmailVerified?: boolean;
}

export default function ProtectedRoute({
  children,
  requiredRole,
  requireEmailVerified = false,
}: ProtectedRouteProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    try {
      // Vérifier l'authentification
      if (!auth.currentUser) {
        router.push("/login");
        return;
      }

      // Vérifier l'email vérifié
      if (requireEmailVerified && !auth.currentUser.emailVerified) {
        router.push("/verify-email");
        return;
      }

      // Récupérer le rôle depuis Firestore
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const userData = userDoc.data();

      if (!userData) {
        router.push("/login");
        return;
      }

      // Vérifier le statut
      if (userData.status === "suspended") {
        router.push("/suspended");
        return;
      }

      // Vérifier le rôle
      if (requiredRole) {
        const allowedRoles = Array.isArray(requiredRole)
          ? requiredRole
          : [requiredRole];

        if (!allowedRoles.includes(userData.role)) {
          router.push("/403");
          return;
        }
      }

      // Tout est bon !
      setAuthorized(true);
    } catch (error) {
      console.error("Erreur lors de la vérification d'accès:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#0d0d14",
        color: "#fff",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: "3rem",
            marginBottom: "1rem",
            animation: "spin 1s linear infinite",
          }}>
            ⏳
          </div>
          <p>Vérification des droits d'accès...</p>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null; // La redirection est faite ci-dessus
  }

  return <>{children}</>;
}

// ─── Hook pour utiliser les données utilisateur ──────────────────────────────

import { useCallback } from "react";

interface UseAuthCheckReturn {
  isAdmin: (role: RoleType) => boolean;
  isMJ: (role: RoleType) => boolean;
  isJoueur: (role: RoleType) => boolean;
  canManageUsers: (role: RoleType) => boolean;
  canCreateParty: (role: RoleType) => boolean;
}

export function useAuthCheck(): UseAuthCheckReturn {
  return {
    isAdmin: useCallback((role: RoleType) => role === "admin", []),
    isMJ: useCallback((role: RoleType) => role === "mj" || role === "admin", []),
    isJoueur: useCallback((role: RoleType) => ["joueur", "mj", "admin"].includes(role), []),
    canManageUsers: useCallback((role: RoleType) => role === "admin", []),
    canCreateParty: useCallback((role: RoleType) => role === "mj" || role === "admin", []),
  };
}