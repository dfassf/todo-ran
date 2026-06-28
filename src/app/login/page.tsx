"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { signInWithPassword, signUpWithPassword } from "@/hooks/useAuth";
import { translateAuthError, type AuthMode } from "@/lib/auth-errors";

type Mode = AuthMode;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading || !email || password.length < 6) return;
    setError(null);
    setLoading(true);
    try {
      const { error: authError } =
        mode === "login"
          ? await signInWithPassword(email, password)
          : await signUpWithPassword(email, password);
      if (authError) {
        setError(translateAuthError(authError, mode));
        return;
      }
      router.push("/");
    } catch (err) {
      setError(translateAuthError(err as { message?: string }, mode));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center px-5 pt-4">
        <Link
          href="/settings"
          className="flex h-9 w-9 -ml-2 items-center justify-center rounded-sm text-text-sub active:bg-surface-strong"
          aria-label="뒤로"
        >
          <ChevronLeft size={22} />
        </Link>
      </div>

      <div className="px-5 pt-8">
        <h1 className="text-display text-text">
          {mode === "login" ? "다시 오셨네요" : "환영해요"}
        </h1>
        <p className="mt-2 text-body text-muted">
          {mode === "login"
            ? "데이터를 다른 기기와 동기화해요."
            : "지금까지 만든 할 일이 서버로 옮겨져요."}
        </p>
      </div>

      <div className="mt-8 flex gap-1 rounded-md bg-surface-strong p-1 mx-5">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`flex-1 h-10 rounded-sm text-sub font-semibold transition-colors ${
            mode === "login" ? "bg-bg text-text shadow-sm" : "text-muted"
          }`}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
          className={`flex-1 h-10 rounded-sm text-sub font-semibold transition-colors ${
            mode === "signup" ? "bg-bg text-text shadow-sm" : "text-muted"
          }`}
        >
          회원가입
        </button>
      </div>

      <form onSubmit={submit}>
        <div className="space-y-3 px-5 pt-6">
          <Input
            type="email"
            label="이메일"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            type="password"
            label="비밀번호"
            placeholder="6자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            error={error}
          />
        </div>

        <div className="px-5 pt-6">
          <Button
            type="submit"
            fullWidth
            disabled={loading || !email || password.length < 6}
          >
            {loading ? "처리 중…" : mode === "login" ? "로그인" : "회원가입"}
          </Button>
        </div>
      </form>
    </div>
  );
}
