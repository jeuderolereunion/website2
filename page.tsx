// src/app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/tables");
      router.refresh();
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-rune">⚔</div>
          <h1>Connexion</h1>
          <p>Rejoignez l&apos;aventure à La Réunion</p>
        </div>

        {error && (
          <div className="auth-error">
            <span>⚠</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.re"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" /> Connexion...
              </span>
            ) : (
              "Entrer dans la taverne"
            )}
          </button>
        </form>

        <div className="auth-footer">
          Pas encore de compte ?{" "}
          <Link href="/register">Créer un compte</Link>
        </div>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0f;
          background-image:
            radial-gradient(ellipse at 20% 50%, rgba(139, 92, 246, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, rgba(245, 158, 11, 0.06) 0%, transparent 50%);
          padding: 2rem;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .auth-card {
          background: rgba(15, 15, 25, 0.95);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 12px;
          padding: 2.5rem;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 0 40px rgba(139, 92, 246, 0.1), 0 20px 60px rgba(0,0,0,0.5);
        }
        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .auth-rune {
          font-size: 2.5rem;
          color: #f59e0b;
          margin-bottom: 0.75rem;
          display: block;
          filter: drop-shadow(0 0 12px rgba(245, 158, 11, 0.6));
        }
        .auth-header h1 {
          color: #f1f0ee;
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0 0 0.4rem;
          letter-spacing: 0.02em;
        }
        .auth-header p {
          color: #9ca3af;
          font-size: 0.9rem;
          margin: 0;
        }
        .auth-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .form-group label {
          color: #d1d5db;
          font-size: 0.85rem;
          font-weight: 500;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
        .form-group input {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 8px;
          color: #f1f0ee;
          font-size: 0.95rem;
          padding: 0.75rem 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }
        .form-group input:focus {
          border-color: rgba(139, 92, 246, 0.7);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }
        .form-group input::placeholder { color: #4b5563; }
        .btn-primary {
          background: linear-gradient(135deg, #7c3aed, #8b5cf6);
          border: none;
          border-radius: 8px;
          color: #fff;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 600;
          padding: 0.85rem;
          margin-top: 0.5rem;
          transition: opacity 0.2s, transform 0.1s, box-shadow 0.2s;
          letter-spacing: 0.02em;
        }
        .btn-primary:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
        }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .auth-footer {
          text-align: center;
          margin-top: 1.5rem;
          color: #6b7280;
          font-size: 0.875rem;
        }
        .auth-footer a {
          color: #a78bfa;
          text-decoration: none;
          font-weight: 500;
        }
        .auth-footer a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
