"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/auth/AuthProvider";
import { getCsrfToken } from "@/auth/csrf";
import styles from "../auth.module.css";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const csrfToken = getCsrfToken();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        newPassword: form.get("newPassword"),
      }),
    }).catch(() => null);

    if (!response?.ok) {
      setError("Unable to change the password. Check the current password and requirements.");
      setIsSubmitting(false);
      return;
    }

    await refreshSession();
    router.replace("/");
    router.refresh();
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="password-title">
        <p className={styles.eyebrow}>Account security</p>
        <h1 id="password-title" className={styles.title}>Change password</h1>
        <p className={styles.description}>
          Replace your temporary password before continuing.
        </p>
        <form className={styles.form} onSubmit={submit}>
          <div className={styles.field}>
            <label htmlFor="currentPassword">Temporary password</label>
            <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="newPassword">New password</label>
            <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={12} required />
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button className={`a-button a-button--primary ${styles.submit}`} disabled={isSubmitting} type="submit">
            {isSubmitting ? "Updating..." : "Change password"}
          </button>
        </form>
      </section>
    </main>
  );
}