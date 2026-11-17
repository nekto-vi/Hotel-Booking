"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth, type AuthUser } from "@/context/AuthContext";
import { apiDelete, apiPatch } from "@/lib/api";
import { notifyHotelDataChanged } from "@/lib/data-events";

interface ProfileForm {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/login");
  }, [isLoading, router, user]);

  if (isLoading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#f7f6f2]">
        <span
          aria-label="Загрузка"
          className="size-9 animate-spin rounded-full border-2 border-amber-600 border-t-transparent"
        />
      </main>
    );
  }

  return <ProfileEditor key={user.sub} user={user} />;
}

function ProfileEditor({ user }: { user: AuthUser }) {
  const { refreshUser, clearAccounts } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<ProfileForm>(() => ({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email,
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      await apiPatch("/auth/profile", {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      });
      await refreshUser();
      notifyHotelDataChanged();
      setSuccess("Данные профиля сохранены.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Не удалось сохранить профиль. Попробуйте ещё раз.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteAccount() {
    if (
      !window.confirm(
        "Удалить аккаунт? Все ваши бронирования также будут удалены. Это действие нельзя отменить.",
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");
    setIsSaving(true);
    try {
      await apiDelete("/users/me");
      clearAccounts();
      router.push("/");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Не удалось удалить аккаунт. Попробуйте ещё раз.",
      );
      setIsSaving(false);
    }
  }

  return (
    <main className="flex-1 bg-[#f7f6f2] px-4 py-10 sm:px-6 sm:py-16">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)]">
        <div className="bg-slate-950 px-6 py-8 text-white sm:px-9">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-amber-300 text-slate-950">
            <UserRound size={23} />
          </span>
          <p className="mt-5 text-xs font-bold tracking-[0.2em] text-amber-300">
            ЛИЧНЫЙ КАБИНЕТ
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold">
            Личные данные
          </h1>
          <p className="mt-2 text-sm text-slate-300">{user.email}</p>
        </div>

        <form onSubmit={saveProfile} className="space-y-5 p-6 sm:p-9">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Имя
              </span>
              <input
                required
                maxLength={100}
                value={form.firstName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    firstName: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Фамилия
              </span>
              <input
                required
                maxLength={100}
                value={form.lastName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    lastName: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Контактный телефон
            </span>
            <input
              required
              type="tel"
              maxLength={30}
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  phone: event.target.value,
                }))
              }
              className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </span>
            <input
              required
              type="email"
              maxLength={254}
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              {error}
            </p>
          )}
          {success && (
            <p
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            >
              {success}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/my-bookings"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Мои бронирования
            </Link>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void deleteAccount()}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60"
              >
                Удалить аккаунт
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
              >
                <Save size={16} />
                {isSaving ? "Сохраняем…" : "Сохранить"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
