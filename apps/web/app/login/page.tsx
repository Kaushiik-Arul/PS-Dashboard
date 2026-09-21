"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/auth/AuthProvider";
import { BoschLogo } from "@/components/BoschLogo";
import styles from "../auth.module.css";

function safeReturnPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    }).catch(() => null);

    if (!response?.ok) {
      setError("Invalid email or password.");
      setIsSubmitting(false);
      return;
    }

    const user = await refreshSession();
    router.replace(
      user?.mustChangePassword
        ? "/change-password"
        : safeReturnPath(new URL(window.location.href).searchParams.get("returnTo")),
    );
    router.refresh();
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="login-title">
        <div className={styles.brand} aria-label="Bosch">
          <BoschLogo />
        </div>
        <p className={styles.eyebrow}>Power Solutions</p>
        <h1 id="login-title" className={styles.title}>Employee sign in</h1>
        <p className={styles.description}>
          Use your registered Bosch email and password.
        </p>
        <form className={styles.form} onSubmit={submit}>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button className={`a-button a-button--primary ${styles.submit}`} disabled={isSubmitting} type="submit">
            <span className="a-button__label">
              {isSubmitting ? "Signing in..." : "Sign in to Power Solutions"}
            </span>
          </button>
        </form>
      </section>
    </main>
  );
}