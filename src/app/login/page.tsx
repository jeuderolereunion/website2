"use client";

import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import Navigation from "@/components/Navigation";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/";

  return <AuthForm mode="login" redirectTo={redirectTo} />;
}

export default function LoginPage() {
  return (
    <>
      <Navigation />
      <Suspense fallback={null}>
        <LoginContent />
      </Suspense>
    </>
  );
}