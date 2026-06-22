import AuthForm from "@/components/AuthForm";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";


export default function AdminLoginPage() {
  return (
    <main>
      <h1>Connexion Admin</h1>

      <AuthForm
        mode="login"
        redirectTo="/admin"
      />
    </main>
  );
}