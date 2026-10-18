import { Lock, LogIn, Mail } from "lucide-react";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import {
  AuthError,
  AuthLink,
  GoogleButton,
  OrDivider,
  SubmitButton,
} from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeReturnTo } from "@/lib/authReturnTo";

// The /login page. ?returnTo= (or the platform's ?from_url=) is where the visitor
// goes after signing in — the login gate and the MCP consent page send people here with it.
export function LoginPage() {
  const destination = safeReturnTo();
  const returnTo = destination === "/" ? "/account" : destination;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      // A hard redirect: the app re-initializes with the new session.
      window.location.href = returnTo;
    } catch (err) {
      setError(
        err.message ||
          "ログインできませんでした。メールアドレスとパスワードを確認してください。",
      );
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      icon={LogIn}
      title="りすけにログイン"
      subtitle="Googleでログインすると、連携と予定の取得まで自動で進みます"
    >
      <GoogleButton returnTo={returnTo} />
      <OrDivider />
      <AuthError>{error}</AuthError>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <div className="relative">
            <Mail
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 pl-10"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            <AuthLink
              to="/forgot-password"
              returnTo={returnTo}
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </AuthLink>
          </div>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 pl-10"
              required
            />
          </div>
        </div>
        <SubmitButton busy={busy} busyLabel="ログイン中…">
          ログイン
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        アカウントをお持ちでない場合{" "}
        <AuthLink to="/register" returnTo={returnTo}>
          新規登録
        </AuthLink>
      </p>
    </AuthLayout>
  );
}