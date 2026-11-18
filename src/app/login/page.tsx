"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import type { FormEvent } from "react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  // Only follow in-site paths after login, never an outside URL.
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/profile";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong.");

      router.push(destination);
      router.refresh(); // update the header with the new login
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong.");
      setBusy(false);
    }
  }

  const signup = mode === "signup";

  return (
    <section className="auth-card">
      <p className="label">{signup ? "Join Research Daily" : "Welcome back"}</p>
      <h1>{signup ? "Create your account" : "Log in"}</h1>
      <p className="muted">
        Save favorite papers, build your own subject boards, and get new papers by email.
      </p>

      <form onSubmit={submit} className="form">
        {signup && (
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={80} />
          </label>
        )}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={signup ? "new-password" : "current-password"}
            minLength={signup ? 8 : undefined}
            required
          />
          {signup && <span className="muted">At least 8 characters.</span>}
        </label>

        {error && <p role="alert" className="form-error">{error}</p>}

        <button className="button button-red" type="submit" disabled={busy}>
          {busy ? "Please wait..." : signup ? "Create account" : "Log in"}
        </button>
      </form>

      <p className="switch">
        {signup ? "Already have an account?" : "New here?"}{" "}
        <button
          type="button"
          className="link-button"
          onClick={() => {
            setMode(signup ? "login" : "signup");
            setError("");
          }}
        >
          {signup ? "Log in" : "Create an account"}
        </button>
      </p>
    </section>
  );
}
