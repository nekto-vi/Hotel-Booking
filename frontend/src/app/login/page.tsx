"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Sparkles,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login({ email, password });
      router.push("/");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Не удалось войти. Проверьте данные и попробуйте снова.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-[#f7f6f2] px-4 py-12 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.28)] lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white lg:flex">
          <div className="absolute -right-32 -top-20 size-96 rounded-full border border-amber-300/15" />
          <div className="absolute -right-16 -top-4 size-64 rounded-full border border-amber-300/20" />
          <div className="absolute -bottom-40 -left-20 size-96 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium tracking-wide text-amber-200">
              <Sparkles size={14} />
              ВАШЕ МЕСТО ДЛЯ ОТДЫХА
            </span>
          </div>
          <div className="relative max-w-sm">
            <p className="mb-5 text-xs font-semibold tracking-[0.28em] text-amber-300">
              HOTEL
            </p>
            <h1 className="font-serif text-5xl leading-[1.12]">
              Хорошо, что вы <span className="text-amber-300">вернулись.</span>
            </h1>
            <p className="mt-6 text-base leading-7 text-slate-300">
              Войдите в аккаунт, чтобы управлять поездками и продолжить
              планировать следующий отдых.
            </p>
          </div>
          <p className="relative text-xs tracking-wide text-slate-400">
            Продуманный отдых начинается с деталей.
          </p>
        </aside>

        <section className="flex items-center px-6 py-12 sm:px-12 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-9">
              <p className="mb-3 text-xs font-bold tracking-[0.24em] text-amber-700 lg:hidden">
                HOTEL
              </p>
              <p className="text-sm font-semibold text-amber-700">
                С возвращением
              </p>
              <h2 className="mt-2 font-serif text-4xl font-medium tracking-tight text-slate-950">
                Войти в аккаунт
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Введите данные, указанные при регистрации.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Электронная почта
                </span>
                <span className="relative block">
                  <Mail
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-13 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Пароль
                </span>
                <span className="relative block">
                  <LockKeyhole
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Введите пароль"
                    className="h-13 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((show) => !show)}
                    aria-label={
                      showPassword ? "Скрыть пароль" : "Показать пароль"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Выполняем вход…" : "Войти"}
                {!isSubmitting && <ArrowRight size={17} />}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-500">
              Впервые у нас?{" "}
              <Link
                href="/register"
                className="font-semibold text-slate-950 underline decoration-amber-500 decoration-2 underline-offset-4 hover:text-amber-800"
              >
                Создать аккаунт
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
