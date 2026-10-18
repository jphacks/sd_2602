import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "./GoogleIcon";
import { base44 } from "@/api/base44Client";
import { returnToSearch } from "@/lib/authReturnTo";

// Small pieces the auth pages share.

export function AuthError({ children }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
    >
      {children}
    </div>
  );
}

export function SubmitButton({ busy, busyLabel, children, ...props }) {
  return (
    <Button
      type="submit"
      className="h-12 w-full font-medium"
      disabled={busy}
      {...props}
    >
      {busy ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          {busyLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export function GoogleButton({ returnTo }) {
  const [message, setMessage] = useState(""),
    [error, setError] = useState("");
  function login() {
    setError("");
    setMessage(
      "Googleのログイン画面を開きます。別ウィンドウが開かない場合は、ブラウザのポップアップ許可を確認してください。",
    );
    try {
      base44.auth.loginWithProvider("google", returnTo);
    } catch {
      setMessage("");
      setError("Googleログインを開始できませんでした。再試行してください。");
    }
  }
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="mb-3 h-12 w-full text-sm font-medium"
        onClick={login}
      >
        <GoogleIcon className="mr-2 h-5 w-5" />
        Googleでログイン
      </Button>
      {message && (
        <p role="status" className="mb-3 text-sm text-muted-foreground">
          {message} キャンセルした場合は再度このボタンから開始できます。
        </p>
      )}
      <AuthError>{error}</AuthError>
    </>
  );
}

export function OrDivider() {
  return (
    <div className="relative mb-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-3 text-muted-foreground">or</span>
      </div>
    </div>
  );
}

// A link between auth screens that carries the way back (?returnTo=) along.
export function AuthLink({
  to,
  returnTo,
  className = "font-medium text-primary hover:underline",
  children,
}) {
  return (
    <Link to={to} search={returnToSearch(returnTo)} className={className}>
      {children}
    </Link>
  );
}
