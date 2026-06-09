"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
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
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup";
type Feedback = {
  tone: "success" | "error";
  message: string;
};

const authModes: Array<{ value: AuthMode; label: string }> = [
  { value: "signin", label: "Sign in" },
  { value: "signup", label: "Create account" },
];

export function LoginBoard() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const trimmedEmail = email.trim();

      const result =
        authMode === "signin"
          ? await supabase.auth.signInWithPassword({
              email: trimmedEmail,
              password,
            })
          : await supabase.auth.signUp({
              email: trimmedEmail,
              password,
            });

      if (result.error) {
        setFeedback({
          tone: "error",
          message: result.error.message,
        });
        return;
      }

      if (authMode === "signup" && !result.data.session) {
        setFeedback({
          tone: "success",
          message: "Check your email to complete account creation.",
        });
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Authentication request failed.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    setFeedback(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setFeedback({
        tone: "error",
        message: "Enter your email before requesting a password reset.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/login`,
      });

      setFeedback(
        error
          ? {
              tone: "error",
              message: error.message,
            }
          : {
              tone: "success",
              message: "Password reset email requested.",
            },
      );
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Password reset request failed.",
      });
    } finally {
      setIsSubmitting(false);
    }
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
                    setFeedback(null);
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
                    required
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
                    required
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
                  disabled={isSubmitting}
                  onClick={handlePasswordReset}
                  type="button"
                >
                  Reset password
                </button>
              </div>

              <Button className="w-full" disabled={isSubmitting} type="submit">
                {isSubmitting
                  ? authMode === "signin"
                    ? "Signing in"
                    : "Creating account"
                  : authMode === "signin"
                    ? "Sign in"
                    : "Create account"}
                <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </Button>
            </form>

            {feedback ? (
              <div
                aria-live="polite"
                className={cn(
                  "mt-4 rounded-md border px-3 py-2 text-sm",
                  feedback.tone === "success"
                    ? "border-primary/25 bg-primary/5 text-primary"
                    : "border-destructive/25 bg-destructive/5 text-destructive",
                )}
              >
                {feedback.message}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
