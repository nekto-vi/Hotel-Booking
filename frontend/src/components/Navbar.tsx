"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BedDouble,
  CalendarDays,
  ChevronDown,
  Hotel,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Shield,
  UserRound,
  X,
} from "lucide-react";
import { useState, type MouseEvent as ReactMouseEvent } from "react";
import { useAuth, type SavedAccount } from "@/context/AuthContext";

const navLinkClass =
  "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-amber-50 hover:text-slate-950";

export default function Navbar() {
  const {
    user,
    token,
    accounts,
    isAdmin,
    isLoading,
    logout,
    switchAccount,
    removeAccount,
  } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountError, setAccountError] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  function signOut() {
    logout();
    setMenuOpen(false);
    setAccountMenuOpen(false);
    router.push("/");
  }

  async function selectAccount(account: SavedAccount) {
    if (account.token === token) {
      setAccountMenuOpen(false);
      return;
    }

    setAccountError("");
    try {
      await switchAccount(account);
      setAccountMenuOpen(false);
      setMenuOpen(false);
      if (pathname.startsWith("/admin") && account.user.role !== "ADMIN") {
        router.replace("/");
      } else {
        router.refresh();
      }
    } catch (error) {
      setAccountError(
        error instanceof Error
          ? error.message
          : "Не удалось переключить аккаунт.",
      );
    }
  }

  async function forgetAccount(
    event: ReactMouseEvent<HTMLButtonElement>,
    accountToken: string,
  ) {
    event.stopPropagation();
    setAccountError("");
    const fallbackAccount =
      accountToken === token
        ? accounts.find((account) => account.token !== accountToken)
        : undefined;

    if (fallbackAccount) {
      try {
        await switchAccount(fallbackAccount);
      } catch (error) {
        setAccountError(
          error instanceof Error
            ? error.message
            : "Не удалось переключить аккаунт.",
        );
        return;
      }
    }

    removeAccount(accountToken);
    if (accountToken === token) {
      setAccountMenuOpen(false);
      setMenuOpen(false);
      if (!fallbackAccount) router.replace("/");
    }
  }

  const accountList = (
    <div className="space-y-1">
      {accounts.map((account) => {
        const isCurrent = account.token === token;
        return (
          <div
            key={account.user.sub}
            className={`flex items-center gap-2 rounded-xl px-2 py-2 ${
              isCurrent ? "bg-amber-50" : "hover:bg-slate-50"
            }`}
          >
            <button
              type="button"
              onClick={() => void selectAccount(account)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                {(
                  account.user.firstName?.[0] ?? account.user.email[0]
                ).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-800">
                  {account.user.firstName} {account.user.lastName}
                  {isCurrent ? " · Сейчас" : ""}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {account.user.email}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={(event) => void forgetAccount(event, account.token)}
              aria-label={`Удалить сохраненный аккаунт ${account.user.email}`}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
      {accountError && (
        <p role="alert" className="px-2 py-1 text-xs text-rose-700">
          {accountError}
        </p>
      )}
      <div className="border-t border-slate-100 pt-2">
        <Link
          href="/login"
          onClick={() => {
            setAccountMenuOpen(false);
            setMenuOpen(false);
          }}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus size={16} />
          Добавить аккаунт
        </Link>
        <Link
          href="/profile"
          onClick={() => {
            setAccountMenuOpen(false);
            setMenuOpen(false);
          }}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <UserRound size={16} />
          Мой профиль
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-50"
        >
          <LogOut size={16} />
          Выйти
        </button>
      </div>
    </div>
  );

  const links = (
    <>
      <Link
        href="/"
        className={`${navLinkClass} ${pathname === "/" ? "bg-amber-50 text-slate-950" : ""}`}
        onClick={() => setMenuOpen(false)}
      >
        <BedDouble size={17} />
        Каталог
      </Link>
      <Link
        href="/my-bookings"
        className={`${navLinkClass} ${pathname.startsWith("/my-bookings") ? "bg-amber-50 text-slate-950" : ""}`}
        onClick={() => setMenuOpen(false)}
      >
        <CalendarDays size={17} />
        Мои бронирования
      </Link>
      {isAdmin && (
        <Link
          href="/admin"
          className={`${navLinkClass} ${pathname.startsWith("/admin") ? "bg-amber-50 text-slate-950" : ""}`}
          onClick={() => setMenuOpen(false)}
        >
          <Shield size={17} />
          Админ-панель
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3"
          aria-label="HOTEL — главная"
        >
          <span className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-amber-300 shadow-sm transition group-hover:bg-slate-800">
            <Hotel size={22} strokeWidth={1.7} />
          </span>
          <span className="leading-tight">
            <span className="block font-serif text-xl font-semibold tracking-wide text-slate-950">
              HOTEL
            </span>
            <span className="block text-[9px] font-semibold tracking-[0.3em] text-slate-500">
              HOTEL & STAY
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">{links}</nav>

        <div className="hidden items-center gap-3 lg:flex">
          {!isLoading &&
            (user ? (
              <>
                <div className="relative">
                  <button
                    type="button"
                    aria-expanded={accountMenuOpen}
                    aria-haspopup="menu"
                    onClick={() => setAccountMenuOpen((open) => !open)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 transition hover:bg-slate-50"
                  >
                    <span className="flex size-8 items-center justify-center rounded-full bg-amber-100 text-amber-950">
                      <UserRound size={17} />
                    </span>
                    <span className="max-w-44 truncate text-sm font-semibold text-slate-700">
                      {user.firstName} {user.lastName}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition ${accountMenuOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {accountMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"
                    >
                      {accountList}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <LogIn size={16} />
                Войти
              </Link>
            ))}
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex size-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 lg:hidden"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-100 bg-white px-4 pb-5 pt-3 lg:hidden">
          <nav className="flex flex-col gap-1">{links}</nav>
          {!isLoading && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              {user ? (
                <div className="px-3">
                  <button
                    type="button"
                    aria-expanded={accountMenuOpen}
                    onClick={() => setAccountMenuOpen((open) => !open)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50"
                  >
                    <span className="flex size-9 items-center justify-center rounded-full bg-amber-100 text-amber-950">
                      <UserRound size={17} />
                    </span>
                    <span className="flex-1 truncate text-sm font-semibold text-slate-700">
                      {user.firstName} {user.lastName}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition ${accountMenuOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {accountMenuOpen && (
                    <div className="mt-2 rounded-2xl border border-slate-200 p-2">
                      {accountList}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
                >
                  <LogIn size={16} />
                  Войти
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
