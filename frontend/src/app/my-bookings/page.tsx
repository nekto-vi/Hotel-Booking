"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  Clock3,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPatch } from "@/lib/api";
import {
  notifyHotelDataChanged,
  subscribeToHotelDataChanges,
} from "@/lib/data-events";

type BookingStatus = "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";

interface MyBooking {
  id: number;
  checkIn: string;
  checkOut: string;
  totalPrice: number | string;
  status: BookingStatus;
  room: {
    roomNumber: string;
    category: { name: string };
  };
}

const statusDetails: Record<
  BookingStatus,
  { label: string; className: string; dotClassName: string }
> = {
  CONFIRMED: {
    label: "Подтверждено",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dotClassName: "bg-emerald-500",
  },
  CHECKED_IN: {
    label: "Гость заселён",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
    dotClassName: "bg-blue-500",
  },
  CHECKED_OUT: {
    label: "Завершено",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
    dotClassName: "bg-slate-400",
  },
  CANCELLED: {
    label: "Отменено",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
    dotClassName: "bg-rose-500",
  },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "BYN",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function hasCheckInStarted(value: string) {
  const checkInDate = value.slice(0, 10);
  const today = new Date();
  const todayDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  return checkInDate <= todayDate;
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="h-48 animate-pulse rounded-3xl border border-slate-200 bg-white"
        />
      ))}
    </div>
  );
}

export default function MyBookingsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const loadBookings = useCallback(async () => {
    setPageError("");
    try {
      const result = await apiGet<MyBooking[]>("/bookings/my");
      setBookings(result);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить бронирования.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) void loadBookings();
    });
    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, loadBookings, router, user]);

  useEffect(
    () => subscribeToHotelDataChanges(() => void loadBookings()),
    [loadBookings],
  );

  async function cancelBooking(bookingId: number) {
    setCancellingId(bookingId);
    setPageError("");
    try {
      await apiPatch(`/bookings/${bookingId}/cancel`);
      notifyHotelDataChanged();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Не удалось отменить бронирование.",
      );
    } finally {
      setCancellingId(null);
    }
  }

  if (isAuthLoading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#f7f6f2]">
        <span
          aria-label="Загрузка"
          className="size-9 animate-spin rounded-full border-2 border-amber-600 border-t-transparent"
        />
      </main>
    );
  }

  return (
    <main className="flex-1 bg-[#f7f6f2]">
      <section className="bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="text-xs font-bold tracking-[0.22em] text-amber-300">
            ЛИЧНЫЙ КАБИНЕТ
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold text-white sm:text-5xl">
            Мои бронирования
          </h1>
          <p className="mt-3 text-sm text-slate-300 sm:text-base">
            История поездок и детали вашего отдыха.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-9 sm:px-6 sm:py-12 lg:px-8">
        {pageError && (
          <div
            role="alert"
            className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700"
          >
            <span>{pageError}</span>
            <button
              type="button"
              onClick={() => void loadBookings()}
              aria-label="Повторить загрузку"
              className="shrink-0 rounded-lg p-1 text-rose-700 transition hover:bg-rose-100"
            >
              <RefreshCw size={17} />
            </button>
          </div>
        )}

        {isLoading ? (
          <LoadingState />
        ) : bookings.length ? (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const status = statusDetails[booking.status];
              const canCancel =
                booking.status === "CONFIRMED" &&
                !hasCheckInStarted(booking.checkIn);

              return (
                <article
                  key={booking.id}
                  className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_28px_-22px_rgba(15,23,42,0.3)] sm:p-7"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-800">
                        <BedDouble size={22} />
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                          {booking.room.category.name}
                        </p>
                        <h2 className="mt-1 font-serif text-2xl font-semibold text-slate-950">
                          Номер {booking.room.roomNumber}
                        </h2>
                        <p className="mt-1 text-xs text-slate-400">
                          Бронирование №{booking.id}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${status.className}`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${status.dotClassName}`}
                      />
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
                    <div>
                      <p className="flex items-center gap-2 text-xs font-medium text-slate-400">
                        <CalendarDays size={15} />
                        Заезд
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-slate-800">
                        {formatDate(booking.checkIn)}
                      </p>
                    </div>
                    <div>
                      <p className="flex items-center gap-2 text-xs font-medium text-slate-400">
                        <CalendarDays size={15} />
                        Выезд
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-slate-800">
                        {formatDate(booking.checkOut)}
                      </p>
                    </div>
                    <div>
                      <p className="flex items-center gap-2 text-xs font-medium text-slate-400">
                        <Clock3 size={15} />
                        Стоимость
                      </p>
                      <p className="mt-1 font-serif text-lg font-bold text-slate-950">
                        {formatMoney(booking.totalPrice)}
                      </p>
                    </div>
                  </div>

                  {canCancel && (
                    <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        disabled={cancellingId === booking.id}
                        onClick={() => void cancelBooking(booking.id)}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                      >
                        <XCircle size={16} />
                        {cancellingId === booking.id
                          ? "Отменяем…"
                          : "Отменить бронь"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-800">
              <CalendarDays size={28} />
            </span>
            <h2 className="mt-5 font-serif text-2xl font-semibold text-slate-950">
              Здесь появятся ваши поездки
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Вы ещё не бронировали номер. Выберите подходящий вариант в
              каталоге — и мы сохраним детали здесь.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Перейти в каталог
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
