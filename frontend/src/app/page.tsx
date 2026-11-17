"use client";

import {
  ArrowDown,
  ArrowRight,
  Bath,
  BedDouble,
  CalendarDays,
  CarFront,
  ChevronDown,
  Coffee,
  Dumbbell,
  MapPin,
  ParkingCircle,
  Search,
  Sparkles,
  Tv,
  Utensils,
  Waves,
  Wifi,
  Wind,
  WashingMachine,
  UsersRound,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import BookingModal, { type BookingRoom } from "@/components/BookingModal";
import { apiGet } from "@/lib/api";
import { subscribeToHotelDataChanges } from "@/lib/data-events";

interface Amenity {
  id: number;
  name: string;
  icon: string | null;
}

interface Room extends BookingRoom {
  capacity: number;
  isAvailable: boolean;
  isBookedForDates: boolean;
  images: string | null;
  category: { id: number; name: string };
  amenities: Array<{ amenity: Amenity }>;
}

interface CategoryOption {
  id: number;
  name: string;
}

interface RoomFilters {
  checkIn?: string;
  checkOut?: string;
  capacity?: string;
  categoryId?: string;
}

const amenityIcons: Record<string, typeof Wifi> = {
  wifi: Wifi,
  internet: Wifi,
  кондиционер: Wind,
  airconditioning: Wind,
  "air-conditioning": Wind,
  "smart-tv": Tv,
  "hair-dryer": Wind,
  iron: Sparkles,
  kettle: Coffee,
  coffee: Coffee,
  кофемашина: Coffee,
  телевизор: Tv,
  tv: Tv,
  парковка: ParkingCircle,
  parking: ParkingCircle,
  бассейн: Waves,
  pool: Waves,
  спортзал: Dumbbell,
  gym: Dumbbell,
  ванна: Bath,
  bath: Bath,
  ресторан: Utensils,
  ресторанный: Utensils,
  прачечная: WashingMachine,
  laundry: WashingMachine,
  автомобиль: CarFront,
};

function getLocalDateOffset(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateAfter(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "BYN",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function getImageUrl(images: string | null) {
  if (!images) return null;
  const firstImage = (
    images.startsWith("data:image/") ? images : images.split(",")[0]
  )?.trim();
  if (!firstImage) return null;
  if (/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(firstImage)) {
    return firstImage;
  }

  try {
    const url = new URL(firstImage, "http://localhost");
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.origin === "http://localhost" ? url.pathname : url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

function RoomCard({
  room,
  onBook,
  dateFilterApplied,
}: {
  room: Room;
  onBook: (room: Room) => void;
  dateFilterApplied: boolean;
}) {
  const imageUrl = getImageUrl(room.images);
  const isBookedForDates = dateFilterApplied && room.isBookedForDates;
  const isUnavailable = !room.isAvailable || isBookedForDates;

  return (
    <article
      className={`group overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_8px_30px_-20px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_-24px_rgba(15,23,42,0.35)] ${
        isBookedForDates ? "opacity-75" : ""
      }`}
    >
      <div
        className="relative h-56 overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-amber-900"
        style={
          imageUrl
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.02), rgba(15,23,42,0.36)), url("${imageUrl}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {isBookedForDates && (
          <div className="absolute inset-0 z-[1] bg-slate-950/60" />
        )}
        {!imageUrl && (
          <>
            <div className="absolute -right-14 -top-20 size-64 rounded-full border border-white/15" />
            <div className="absolute -right-2 -top-10 size-44 rounded-full border border-white/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <BedDouble
                size={76}
                strokeWidth={0.9}
                className="text-amber-100/80 transition duration-500 group-hover:scale-105"
              />
            </div>
          </>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <span className="rounded-full border border-white/20 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-800 backdrop-blur">
            {room.category.name}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-slate-950/65 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
            <UsersRound size={14} />
            До {room.capacity} гостей
          </span>
        </div>
        {isBookedForDates ? (
          <span className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-rose-200 bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
            Занят на эти даты
          </span>
        ) : !dateFilterApplied && room.isAvailable ? (
          <span className="absolute bottom-4 right-4 z-10 rounded-full border border-white/20 bg-slate-950/65 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
            Укажите даты для проверки
          </span>
        ) : !room.isAvailable ? (
          <span className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-slate-950/80 px-4 py-2 text-sm font-semibold text-white">
            Временно недоступен
          </span>
        ) : null}
        <span className="absolute bottom-4 left-4 rounded-lg bg-slate-950/65 px-3 py-1.5 text-xs font-medium tracking-wide text-white backdrop-blur">
          НОМЕР {room.roomNumber}
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
              {room.category.name}
            </p>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-slate-950">
              Номер {room.roomNumber}
            </h2>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-serif text-xl font-bold text-slate-950">
              {formatCurrency(room.pricePerNight)}
            </p>
            <p className="text-xs text-slate-500">за ночь</p>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Удобства
          </p>
          {room.amenities.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {room.amenities.slice(0, 5).map(({ amenity }) => {
                const Icon =
                  amenityIcons[
                    amenity.icon?.toLocaleLowerCase("ru-RU") ?? ""
                  ] ??
                  amenityIcons[amenity.name.toLocaleLowerCase("ru-RU")] ??
                  Sparkles;
                return (
                  <span
                    key={amenity.id}
                    title={amenity.name}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
                  >
                    <Icon size={14} className="text-amber-700" />
                    {amenity.name}
                  </span>
                );
              })}
              {room.amenities.length > 5 && (
                <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                  +{room.amenities.length - 5}
                </span>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">Удобства уточняются</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onBook(room)}
          disabled={isUnavailable}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-950/15 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:hover:bg-slate-300"
        >
          {isUnavailable ? "Недоступен" : "Забронировать"}
          {!isUnavailable && <ArrowRight size={16} />}
        </button>
      </div>
    </article>
  );
}

function RoomSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
      <div className="h-56 animate-pulse bg-slate-200" />
      <div className="space-y-5 p-6">
        <div className="flex justify-between">
          <div className="space-y-2">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
            <div className="h-6 w-36 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="h-6 w-24 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-20 animate-pulse rounded-full bg-slate-100" />
          <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100" />
          <div className="h-7 w-16 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="h-12 animate-pulse rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}

export default function Home() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [today, setToday] = useState("");
  const [capacity, setCapacity] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingDates, setBookingDates] = useState({
    checkIn: "",
    checkOut: "",
  });
  const [dateFilterApplied, setDateFilterApplied] = useState(false);
  const activeFiltersRef = useRef<RoomFilters>({});
  const roomsRequestRef = useRef(0);

  const loadRooms = useCallback(async (filters?: RoomFilters) => {
    const requestId = ++roomsRequestRef.current;
    setIsLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (filters?.checkIn) params.set("checkIn", filters.checkIn);
    if (filters?.checkOut) params.set("checkOut", filters.checkOut);
    if (filters?.capacity) params.set("capacity", filters.capacity);
    if (filters?.categoryId) params.set("categoryId", filters.categoryId);

    try {
      const query = params.size ? `?${params.toString()}` : "";
      const result = await apiGet<Room[]>(`/rooms${query}`, {
        authenticated: false,
      });
      if (requestId !== roomsRequestRef.current) return;
      setRooms(result);
      setDateFilterApplied(Boolean(filters?.checkIn && filters?.checkOut));
      const availableCategories = new Map<number, string>();
      result.forEach((room) =>
        availableCategories.set(room.category.id, room.category.name),
      );
      if (availableCategories.size) {
        setCategories((current) => {
          const merged = new Map(current.map((item) => [item.id, item.name]));
          availableCategories.forEach((name, id) => merged.set(id, name));
          return Array.from(merged, ([id, name]) => ({ id, name }));
        });
      }
    } catch (requestError) {
      if (requestId !== roomsRequestRef.current) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось загрузить каталог. Попробуйте ещё раз.",
      );
    } finally {
      if (requestId === roomsRequestRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) {
        setToday(getLocalDateOffset(0));
        void loadRooms();
      }
    });

    return () => {
      isMounted = false;
    };
  }, [loadRooms]);

  useEffect(
    () =>
      subscribeToHotelDataChanges(() => {
        void loadRooms(activeFiltersRef.current);
      }),
    [loadRooms],
  );

  const availableCount = useMemo(
    () =>
      rooms.filter(
        (room) =>
          room.isAvailable && !(dateFilterApplied && room.isBookedForDates),
      ).length,
    [dateFilterApplied, rooms],
  );

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (Boolean(checkIn) !== Boolean(checkOut)) {
      setError("Укажите обе даты поездки или оставьте даты пустыми.");
      return;
    }
    if (checkIn && checkOut && checkOut <= checkIn) {
      setError("Дата выезда должна быть позже даты заезда.");
      return;
    }
    const filters = { checkIn, checkOut, capacity, categoryId };
    activeFiltersRef.current = filters;
    void loadRooms(filters);
  }

  function resetFilters() {
    setCheckIn("");
    setCheckOut("");
    setCapacity("");
    setCategoryId("");
    setError("");
    activeFiltersRef.current = {};
    void loadRooms();
  }

  function openBooking(room: Room) {
    const start = checkIn || getLocalDateOffset(1);
    const end = checkOut || getDateAfter(start, 1);
    setBookingDates({ checkIn: start, checkOut: end });
    setSelectedRoom(room);
  }

  return (
    <main className="flex-1 bg-[#f7f6f2]">
      <section className="relative isolate overflow-hidden bg-slate-950">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_5%,rgba(180,120,54,0.24),transparent_38%),linear-gradient(115deg,#0f172a_15%,#182333_65%,#26323a)]" />
        <div className="absolute -right-36 -top-56 -z-10 size-[34rem] rounded-full border border-white/10" />
        <div className="absolute -right-14 -top-36 -z-10 size-[25rem] rounded-full border border-white/10" />

        <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-amber-200">
              <MapPin size={14} />
              ВАШ ОТЕЛЬ В ЦЕНТРЕ ВПЕЧАТЛЕНИЙ
            </span>
            <h1 className="mt-7 font-serif text-5xl font-medium leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Пространство для
              <br />
              <span className="text-amber-300">вашего отдыха.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Продуманные номера, внимательный сервис и ощущение дома — где бы
              ни начинался ваш путь.
            </p>
            <a
              href="#rooms"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-amber-200"
            >
              Найти свой номер
              <ArrowDown size={16} />
            </a>
          </div>
        </div>
      </section>

      <section
        id="rooms"
        className="relative z-10 mx-auto -mt-7 max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <form
          onSubmit={handleSearch}
          className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.3)] sm:grid-cols-2 sm:p-5 lg:grid-cols-[1.15fr_1.15fr_0.8fr_1fr_auto_auto] lg:items-end lg:gap-4"
        >
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <CalendarDays size={15} className="text-amber-700" />
              Заезд
            </span>
            <input
              type="date"
              min={today}
              value={checkIn}
              onChange={(event) => setCheckIn(event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
            />
          </label>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <CalendarDays size={15} className="text-amber-700" />
              Выезд
            </span>
            <input
              type="date"
              min={
                checkIn
                  ? getDateAfter(checkIn, 1)
                  : today
                    ? getDateAfter(today, 1)
                    : ""
              }
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
            />
          </label>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <UsersRound size={15} className="text-amber-700" />
              Гости
            </span>
            <div className="relative">
              <select
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
              >
                <option value="">Не выбрано</option>
                {[1, 2, 3, 4, 5, 6].map((number) => (
                  <option key={number} value={number}>
                    {number}{" "}
                    {number === 1 ? "гость" : number < 5 ? "гостя" : "гостей"}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <Sparkles size={15} className="text-amber-700" />
              Категория
            </span>
            <div className="relative">
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
              >
                <option value="">Все категории</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </div>
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-wait disabled:opacity-70 sm:col-span-1"
          >
            <Search size={17} />
            Поиск
          </button>
          <button
            type="button"
            onClick={resetFilters}
            disabled={isLoading}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70 sm:col-span-1"
          >
            Сбросить фильтры
          </button>
        </form>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {error}
          </p>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 sm:pt-16 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-amber-700">
              ВЫБЕРИТЕ СВОЙ НОМЕР
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Номера и апартаменты
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Комфорт, которому хочется сказать «ещё одну ночь».
            </p>
          </div>
          {!isLoading && rooms.length > 0 && (
            <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200">
              {availableCount}{" "}
              {availableCount === 1
                ? "номер"
                : availableCount > 1 && availableCount < 5
                  ? "номера"
                  : "номеров"}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <RoomSkeleton key={index} />
            ))}
          </div>
        ) : rooms.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onBook={openBooking}
                dateFilterApplied={dateFilterApplied}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <BedDouble size={30} />
            </span>
            <h3 className="mt-5 font-serif text-2xl font-semibold text-slate-950">
              Пока нет подходящих номеров
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Попробуйте изменить даты поездки или параметры поиска — возможно,
              идеальный вариант уже ждёт вас.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Сбросить фильтры
            </button>
          </div>
        )}
      </section>

      {selectedRoom && (
        <BookingModal
          room={selectedRoom}
          checkIn={bookingDates.checkIn}
          checkOut={bookingDates.checkOut}
          onClose={() => setSelectedRoom(null)}
        />
      )}
    </main>
  );
}
