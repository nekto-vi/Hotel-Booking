"use client";

import Link from "next/link";
import {
  Bath,
  BedDouble,
  CheckCircle2,
  Coffee,
  CookingPot,
  Fan,
  Flower2,
  LampDesk,
  LockKeyhole,
  Sparkles,
  Tv,
  Utensils,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, type FormEvent, type MouseEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiPost } from "@/lib/api";
import { notifyHotelDataChanged } from "@/lib/data-events";

interface RoomAmenity {
  id: number;
  name: string;
  icon: string | null;
}

export interface BookingRoom {
  id: number;
  roomNumber: string;
  capacity: number;
  pricePerNight: number | string;
  category: { name: string };
  amenities: Array<{ amenity: RoomAmenity }>;
}

interface BookingModalProps {
  room: BookingRoom;
  checkIn: string;
  checkOut: string;
  onClose: () => void;
}

interface BookingResponse {
  id: number;
  totalPrice: number | string;
}

type MealPlan =
  "NO_MEALS" | "BREAKFAST_BUFFET" | "BREAKFAST_AND_DINNER" | "ALL_INCLUSIVE";

const mealOptions: Array<{
  id: MealPlan;
  title: string;
  description: string;
  rate: number;
  icon: LucideIcon;
}> = [
  {
    id: "NO_MEALS",
    title: "Без питания",
    description: "+0 BYN к суткам",
    rate: 0,
    icon: BedDouble,
  },
  {
    id: "BREAKFAST_BUFFET",
    title: "Завтрак шведский стол",
    description: "+25 BYN в сутки за человека",
    rate: 25,
    icon: Coffee,
  },
  {
    id: "BREAKFAST_AND_DINNER",
    title: "Завтрак и ужин",
    description: "+50 BYN в сутки за человека",
    rate: 50,
    icon: Utensils,
  },
  {
    id: "ALL_INCLUSIVE",
    title: "Все включено",
    description: "+80 BYN в сутки за человека",
    rate: 80,
    icon: CookingPot,
  },
];

const amenityIcons: Record<string, LucideIcon> = {
  wifi: Wifi,
  "smart-tv": Tv,
  tv: Tv,
  "air-conditioning": Fan,
  "hair-dryer": Sparkles,
  bath: Bath,
  iron: LampDesk,
  kettle: Coffee,
  balcony: Flower2,
};

const currency = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "BYN",
  maximumFractionDigits: 2,
});

function formatAmount(value: number) {
  return `${value.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} BYN`;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

function getNights(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  return (end.getTime() - start.getTime()) / 86_400_000;
}

function pluralizeNights(count: number) {
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return "ночей";
  if (count % 10 === 1) return "ночь";
  if (count % 10 >= 2 && count % 10 <= 4) return "ночи";
  return "ночей";
}

function pluralizeGuests(count: number) {
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return "гостей";
  if (count % 10 === 1) return "гость";
  if (count % 10 >= 2 && count % 10 <= 4) return "гостя";
  return "гостей";
}

export default function BookingModal({
  room,
  checkIn: initialCheckIn,
  checkOut: initialCheckOut,
  onClose,
}: BookingModalProps) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const today = formatLocalDate(new Date());
  const [checkIn, setCheckIn] = useState(initialCheckIn || today);
  const [checkOut, setCheckOut] = useState(
    initialCheckOut || addDays(initialCheckIn || today, 1),
  );
  const [mealPlan, setMealPlan] = useState<MealPlan>("NO_MEALS");
  const [mealGuests, setMealGuests] = useState(1);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<BookingResponse | null>(null);

  const nights = getNights(checkIn, checkOut);
  const validDates = Number.isInteger(nights) && nights > 0;
  const pricePerNight = Number(room.pricePerNight);
  const selectedMeal = mealOptions.find((option) => option.id === mealPlan)!;
  const mealRatePerNight = selectedMeal.rate * mealGuests;
  const roomTotal = validDates ? pricePerNight * nights : 0;
  const mealTotal = validDates ? mealRatePerNight * nights : 0;
  const totalPrice = roomTotal + mealTotal;
  const minCheckOut = checkIn ? addDays(checkIn, 1) : addDays(today, 1);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!user) {
      setError("Войдите в аккаунт, чтобы оформить бронирование.");
      return;
    }

    if (!validDates) {
      setError("Дата выезда должна быть позже даты заезда.");
      return;
    }

    if (checkIn < today) {
      setError("Дата заезда не может быть раньше сегодняшнего дня.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiPost<BookingResponse>("/bookings", {
        roomId: room.id,
        checkIn,
        checkOut,
        mealPlan,
        mealGuests,
        totalPrice,
        comment: comment.trim() || undefined,
      });
      setBooking(result);
      notifyHotelDataChanged();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Не удалось создать бронирование. Попробуйте ещё раз.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function stopPropagation(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        className="my-auto w-full max-w-2xl overflow-hidden rounded-[1.75rem] bg-white shadow-2xl"
        onMouseDown={stopPropagation}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] text-amber-700">
              HOTEL
            </p>
            <h2
              id="booking-modal-title"
              className="mt-1 font-serif text-2xl font-semibold text-slate-950"
            >
              {booking ? "Бронирование готово" : "Ваше бронирование"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(100vh-5rem)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {booking ? (
            <div className="py-4 text-center">
              <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={34} />
              </span>
              <h3 className="mt-5 font-serif text-2xl font-semibold text-slate-950">
                Номер за вами
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Бронирование №{booking.id} подтверждено. Детали поездки доступны
                в разделе «Мои бронирования».
              </p>
              <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-slate-500">
                    Номер {room.roomNumber}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {currency.format(Number(booking.totalPrice))}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 h-12 w-full rounded-xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Отлично
              </button>
            </div>
          ) : isAuthLoading ? (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="size-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
              <p className="mt-4 text-sm text-slate-500">
                Проверяем авторизацию…
              </p>
            </div>
          ) : !user ? (
            <div className="py-5 text-center">
              <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <LockKeyhole size={28} />
              </span>
              <h3 className="mt-5 font-serif text-2xl font-semibold text-slate-950">
                Войдите, чтобы продолжить
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Войдите в аккаунт или зарегистрируйтесь, чтобы сохранить
                бронирование на ваше имя.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link
                  href="/login"
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Войти
                </Link>
                <Link
                  href="/register"
                  className="flex h-12 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Создать аккаунт
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-2xl bg-slate-950 p-4 text-white sm:p-5">
                <p className="text-xs font-medium tracking-wide text-amber-300">
                  {room.category.name}
                </p>
                <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                  <p className="font-serif text-2xl font-semibold">
                    Номер {room.roomNumber}
                  </p>
                  <p className="text-sm text-slate-300">
                    {currency.format(pricePerNight)}{" "}
                    <span className="text-slate-400">за ночь</span>
                  </p>
                </div>
              </div>

              <section>
                <h3 className="text-sm font-semibold text-slate-900">
                  Информация о номере
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {room.amenities.length ? (
                    room.amenities.map(({ amenity }) => {
                      const iconKey =
                        amenity.icon?.toLocaleLowerCase("ru-RU") ?? "";
                      const nameKey = amenity.name.toLocaleLowerCase("ru-RU");
                      const Icon =
                        amenityIcons[iconKey] ??
                        amenityIcons[nameKey] ??
                        Sparkles;
                      return (
                        <span
                          key={amenity.id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                        >
                          <Icon size={14} className="text-amber-700" />
                          {amenity.name}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-400">
                      Дополнительные удобства не указаны
                    </span>
                  )}
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_0.7fr]">
                <DateField
                  label="Заезд"
                  value={checkIn}
                  min={today}
                  onChange={(value) => {
                    setCheckIn(value);
                    setError("");
                  }}
                />
                <DateField
                  label="Выезд"
                  value={checkOut}
                  min={minCheckOut}
                  onChange={(value) => {
                    setCheckOut(value);
                    setError("");
                  }}
                />
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-slate-600">
                    Гостей
                  </span>
                  <select
                    value={mealGuests}
                    onChange={(event) =>
                      setMealGuests(Number(event.target.value))
                    }
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                  >
                    {Array.from(
                      { length: Math.max(1, room.capacity) },
                      (_, index) => index + 1,
                    ).map((count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {checkIn && checkOut && !validDates && (
                <p
                  role="alert"
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                >
                  Дата выезда должна быть позже даты заезда.
                </p>
              )}
              {checkIn && checkIn < today && (
                <p
                  role="alert"
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                >
                  Дата заезда не может быть раньше сегодняшнего дня.
                </p>
              )}

              <section>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Питание
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Выберите подходящий план проживания
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {mealGuests} {pluralizeGuests(mealGuests)}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {mealOptions.map((option) => {
                    const Icon = option.icon;
                    const selected = mealPlan === option.id;
                    return (
                      <label
                        key={option.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                          selected
                            ? "border-amber-400 bg-amber-50/70 ring-2 ring-amber-500/10"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="mealPlan"
                          value={option.id}
                          checked={selected}
                          onChange={() => setMealPlan(option.id)}
                          className="mt-1 size-4 accent-amber-600"
                        />
                        <span
                          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                            selected
                              ? "bg-white text-amber-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <Icon size={16} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-slate-900">
                            {option.title}
                          </span>
                          <span className="mt-1 block text-[11px] text-slate-500">
                            {option.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Расчет стоимости
                </h3>
                <div className="mt-3 space-y-2.5 text-sm">
                  <div className="flex items-start justify-between gap-3 text-slate-600">
                    <span>
                      Номер: {currency.format(pricePerNight)} ×{" "}
                      {validDates ? nights : 0}{" "}
                      {pluralizeNights(validDates ? nights : 0)}
                    </span>
                    <span className="whitespace-nowrap font-medium text-slate-800">
                      {currency.format(roomTotal)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-slate-600">
                    <span className="leading-5">
                      {selectedMeal.title}: {formatAmount(selectedMeal.rate)} ×{" "}
                      {mealGuests} {pluralizeGuests(mealGuests)} ×{" "}
                      {validDates ? nights : 0}{" "}
                      {pluralizeNights(validDates ? nights : 0)} =
                    </span>
                    <span className="whitespace-nowrap font-medium text-slate-800">
                      {currency.format(mealTotal)}
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-3 border-t border-slate-200 pt-3">
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Итого
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {validDates
                          ? `${nights} ${pluralizeNights(nights)} · ${mealGuests} ${pluralizeGuests(mealGuests)}`
                          : "Укажите корректные даты"}
                      </span>
                    </div>
                    <span className="font-serif text-2xl font-bold text-slate-950">
                      {currency.format(totalPrice)}
                    </span>
                  </div>
                </div>
              </section>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  Пожелания к заезду
                </span>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="Например, поздний заезд или детская кроватка"
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                />
                <span className="mt-1 block text-right text-xs text-slate-400">
                  {comment.length}/1000
                </span>
              </label>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-700"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !validDates || checkIn < today}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Оформляем…" : "Подтвердить бронирование"}
                {!isSubmitting && <CheckCircle2 size={17} />}
              </button>
              <p className="text-center text-[11px] text-slate-400">
                Итоговая стоимость будет подтверждена сервером при оформлении.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: string;
  min: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-slate-600">
        {label}
      </span>
      <input
        type="date"
        required
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
      />
    </label>
  );
}
