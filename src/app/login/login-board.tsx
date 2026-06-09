"use client";

import { FormEvent, useState } from "react";
import {
  ArrowRightIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup";

const authModes: Array<{ value: AuthMode; label: string }> = [
  { value: "signin", label: "Sign in" },
  { value: "signup", label: "Create account" },
];

export function LoginBoard() {
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <section className="w-full max-w-[420px]">
        <Card className="rounded-lg shadow-none">
          <CardHeader className="border-b p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Welcome to Goaltree</CardTitle>
                <CardDescription className="mt-1.5">
                  Sign in with email to continue.
                </CardDescription>
              </div>
              <div className="rounded-full border bg-secondary p-2 text-secondary-foreground">
                <ShieldCheckIcon className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4">
            <div className="mb-2.5 inline-flex w-full rounded-md border bg-muted/50 p-1">
              {authModes.map((mode) => (
                <button
                  className={cn(
                    "flex-1 rounded px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
                    authMode === mode.value && "bg-background text-foreground shadow-sm",
                  )}
                  key={mode.value}
                  onClick={() => {
                    setAuthMode(mode.value);
                    setSubmitted(false);
                  }}
                  type="button"
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-sm font-medium">Email</span>
                <span className="mt-1.5 flex items-center gap-2 rounded-md border bg-background px-3 py-2 shadow-sm focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/30">
                  <EnvelopeIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter email"
                    type="email"
                    value={email}
                  />
                </span>
              </label>

              <label className="block">
                <span className="text-sm font-medium">Password</span>
                <span className="mt-1.5 flex items-center gap-2 rounded-md border bg-background px-3 py-2 shadow-sm focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/30">
                  <LockClosedIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <EyeIcon className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </span>
              </label>

              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    className="h-4 w-4 rounded border-input accent-primary"
                    type="checkbox"
                  />
                  Remember me
                </label>
                <button
                  className="text-sm font-medium text-primary hover:underline"
                  type="button"
                >
                  Reset password
                </button>
              </div>

              <Button className="w-full" type="submit">
                {authMode === "signin" ? "Sign in" : "Create account"}
                <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </Button>
            </form>

            {submitted ? (
              <div className="mt-4 rounded-md border bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
                {authMode === "signin" ? "Sign in" : "Create account"} flow is ready for
                Supabase Auth wiring.
              </div>
            ) : null}

          </CardContent>
        </Card>
      </section>
    </main>
  );
}
