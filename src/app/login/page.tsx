import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main>
      <h1>Connexion</h1>

      <AuthForm
        mode="login"
        redirectTo="/"
      />
    </main>
  );
}