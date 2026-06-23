"use client";

import AuthForm from "@/components/AuthForm";
import Navigation from "@/components/Navigation";

export default function RegisterPage() {
  return (
    <>
      <Navigation />
      <AuthForm mode="register" />
    </>
  );
}