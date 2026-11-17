"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await register({ firstName, lastName, email, phone, password });
      router.push("/");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Не удалось создать аккаунт. Попробуйте снова.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-[#f7f6f2] px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.28)] lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="relative hidden min-h-[700px] flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white lg:flex">
          <div className="absolute -right-32 -top-20 size-96 rounded-full border border-amber-300/15" />
          <div className="absolute -right-16 -top-4 size-64 rounded-full border border-amber-300/20" />
          <div className="absolute -bottom-40 -left-20 size-96 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium tracking-wide text-amber-200">
              <Sparkles size={14} />
              ОТКРОЙТЕ ДЛЯ СЕБЯ HOTEL
            </span>
          </div>
          <div className="relative max-w-sm">
            <p className="mb-5 text-xs font-semibold tracking-[0.28em] text-amber-300">
              HOTEL
            </p>
            <h1 className="font-serif text-5xl leading-[1.12]">
              Ваш следующий отдых <span className="text-amber-300">ближе.</span>
            </h1>
            <p className="mt-6 text-base leading-7 text-slate-300">
              Создайте аккаунт, чтобы бронировать номера и хранить все детали
              поездок в одном месте.
            </p>
            <ul className="mt-8 space-y-4 text-sm text-slate-200">
              <li className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-amber-300/15 text-amber-300">
                  <Check size={14} />
                </span>
                Удобное управление бронированиями
              </li>
              <li className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-amber-300/15 text-amber-300">
                  <Check size={14} />
                </span>
                Все поездки — в личном кабинете
              </li>
            </ul>
          </div>
          <p className="relative text-xs tracking-wide text-slate-400">
            Продуманный отдых начинается с деталей.
          </p>
        </aside>

        <section className="flex items-center px-6 py-10 sm:px-12 lg:px-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-7">
              <p className="mb-3 text-xs font-bold tracking-[0.24em] text-amber-700 lg:hidden">
                HOTEL
              </p>
              <p className="text-sm font-semibold text-amber-700">
                Присоединяйтесь к нам
              </p>
              <h2 className="mt-2 font-serif text-4xl font-medium tracking-tight text-slate-950">
                Создать аккаунт
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Заполните данные — и можно планировать поездку.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Имя
                  </span>
                  <span className="relative block">
                    <UserRound
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      autoComplete="given-name"
                      required
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="Анна"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                    />
                  </span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Фамилия
                  </span>
                  <input
                    type="text"
                    autoComplete="family-name"
                    required
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Иванова"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Электронная почта
                </span>
                <span className="relative block">
                  <Mail
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Телефон
                </span>
                <span className="relative block">
                  <Phone
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="tel"
                    autoComplete="tel"
                    required
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+375 29 123-45-67"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Пароль
                </span>
                <span className="relative block">
                  <LockKeyhole
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Не менее 8 символов"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((show) => !show)}
                    aria-label={
                      showPassword ? "Скрыть пароль" : "Показать пароль"
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Создаём аккаунт…" : "Создать аккаунт"}
                {!isSubmitting && <ArrowRight size={17} />}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Уже есть аккаунт?{" "}
              <Link
                href="/login"
                className="font-semibold text-slate-950 underline decoration-amber-500 decoration-2 underline-offset-4 hover:text-amber-800"
              >
                Войти
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
