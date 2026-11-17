"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  DoorOpen,
  Edit3,
  Mail,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import {
  notifyHotelDataChanged,
  subscribeToHotelDataChanges,
} from "@/lib/data-events";

type TabId = "bookings" | "users" | "rooms";
type BookingStatus = "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
type EditableStatus = Exclude<BookingStatus, "CONFIRMED">;
type BedType = "DOUBLE_BED" | "TWO_SINGLE_BEDS" | "THREE_SINGLE_BEDS";
type MealPlan = "BREAKFAST_INCLUDED" | "NO_MEALS" | "ALL_INCLUSIVE";

interface Category {
  id: number;
  name: string;
  description: string | null;
}

interface Amenity {
  id: number;
  name: string;
  icon: string | null;
}

interface Room {
  id: number;
  roomNumber: string;
  categoryId: number;
  capacity: number;
  pricePerNight: number | string;
  isAvailable: boolean;
  isBookedForDates: boolean;
  images: string | null;
  bedType: BedType | null;
  mealPlan: MealPlan | null;
  category: Category;
  amenities: Array<{ amenity: Amenity }>;
}

interface Booking {
  id: number;
  checkIn: string;
  checkOut: string;
  totalPrice: number | string;
  status: BookingStatus;
  comment?: string | null;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  room: {
    roomNumber: string;
    category: Category;
  };
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "CLIENT" | "ADMIN";
  createdAt: string;
  bookings: Array<{
    id: number;
    checkIn: string;
    checkOut: string;
    totalPrice: number | string;
    status: BookingStatus;
    room: { roomNumber: string; category: Category };
  }>;
}

interface RoomFormValues {
  roomNumber: string;
  categoryId: string;
  capacity: string;
  pricePerNight: string;
  isAvailable: boolean;
  images: string;
  amenityIds: number[];
  bedType: BedType | "";
  mealPlan: MealPlan | "";
}

const initialRoomForm: RoomFormValues = {
  roomNumber: "",
  categoryId: "",
  capacity: "2",
  pricePerNight: "",
  isAvailable: true,
  images: "",
  amenityIds: [],
  bedType: "",
  mealPlan: "",
};

const amenityLabels = [
  "Wi-Fi",
  "Smart TV",
  "Кондиционер",
  "Балкон",
  "Фен",
  "Ванна",
  "Утюг",
  "Чайник",
];

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
    label: "Заселён",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
    dotClassName: "bg-blue-500",
  },
  CHECKED_OUT: {
    label: "Выселен",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
    dotClassName: "bg-slate-400",
  },
  CANCELLED: {
    label: "Отменено",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
    dotClassName: "bg-rose-500",
  },
};

const statusActions: Array<{ status: EditableStatus; label: string }> = [
  { status: "CHECKED_IN", label: "Заселить" },
  { status: "CHECKED_OUT", label: "Выселить" },
  { status: "CANCELLED", label: "Отменить" },
];

const tabs: Array<{ id: TabId; label: string; icon: typeof CalendarDays }> = [
  { id: "bookings", label: "Бронирования", icon: CalendarDays },
  { id: "users", label: "Пользователи", icon: UsersRound },
  { id: "rooms", label: "Номера", icon: BedDouble },
];

function isEditableStatus(value: string): value is EditableStatus {
  return (
    value === "CHECKED_IN" || value === "CHECKED_OUT" || value === "CANCELLED"
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
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

function getLocalDateOffset(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getUserFacingError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  if (
    message.toLowerCase() === "internal server error" ||
    message.toLowerCase() === "request failed with status 500"
  ) {
    return fallback;
  }
  return message || fallback;
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const details = statusDetails[status];
  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${details.className}`}
    >
      <span className={`size-1.5 rounded-full ${details.dotClassName}`} />
      {details.label}
    </span>
  );
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_28px_-22px_rgba(15,23,42,0.3)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div>
          <h2 className="font-serif text-xl font-semibold text-slate-950">
            {title}
          </h2>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 p-5 sm:p-6">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-xl bg-slate-100"
        />
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof CalendarDays;
  title: string;
  description: string;
}) {
  return (
    <div className="px-6 py-14 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-800">
        <Icon size={25} />
      </span>
      <h3 className="mt-4 font-serif text-xl font-semibold text-slate-950">
        {title}
      </h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default function AdminPage() {
  const { user, isAdmin, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState<TabId[]>([]);
  const [pageError, setPageError] = useState("");
  const [updatingBookingId, setUpdatingBookingId] = useState<number | null>(
    null,
  );
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState<RoomFormValues>(initialRoomForm);
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState<number | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<number | null>(null);

  const loadTab = useCallback(
    async (tab: TabId, force = false) => {
      if (!user || !isAdmin || (!force && loadedTabs.includes(tab))) return;
      setIsLoading(true);
      setPageError("");
      try {
        if (tab === "bookings") {
          setBookings(await apiGet<Booking[]>("/bookings/admin"));
        } else if (tab === "users") {
          setUsers(await apiGet<User[]>("/users"));
        } else {
          const today = getLocalDateOffset(0);
          const tomorrow = getLocalDateOffset(1);
          const [roomList, categoryList, amenityList] = await Promise.all([
            apiGet<Room[]>(`/rooms?checkIn=${today}&checkOut=${tomorrow}`, {
              authenticated: false,
            }),
            apiGet<Category[]>("/rooms/categories", { authenticated: false }),
            apiGet<Amenity[]>("/rooms/amenities", { authenticated: false }),
          ]);
          setRooms(roomList);
          setCategories(categoryList);
          setAmenities(amenityList);
        }
        setLoadedTabs((current) =>
          current.includes(tab) ? current : [...current, tab],
        );
      } catch (error) {
        setPageError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить данные. Попробуйте ещё раз.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isAdmin, loadedTabs, user],
  );

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) {
      router.replace("/");
      return;
    }

    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) void loadTab("bookings");
    });
    return () => {
      isMounted = false;
    };
  }, [isAdmin, isAuthLoading, loadTab, router, user]);

  useEffect(
    () =>
      subscribeToHotelDataChanges(() => {
        loadedTabs.forEach((tab) => void loadTab(tab, true));
      }),
    [loadTab, loadedTabs],
  );

  function chooseTab(tab: TabId) {
    setActiveTab(tab);
    void loadTab(tab);
  }

  async function updateBookingStatus(
    bookingId: number,
    status: EditableStatus,
  ) {
    setUpdatingBookingId(bookingId);
    setPageError("");
    try {
      await apiPatch(`/bookings/admin/${bookingId}/status`, { status });
      notifyHotelDataChanged();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Не удалось изменить статус бронирования.",
      );
    } finally {
      setUpdatingBookingId(null);
    }
  }

  async function updateUserRole(target: User) {
    if (target.id === user?.sub) return;

    const role = target.role === "CLIENT" ? "ADMIN" : "CLIENT";
    setUpdatingRoleId(target.id);
    setPageError("");
    try {
      await apiPatch(`/users/${target.id}/role`, { role });
      notifyHotelDataChanged();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Не удалось изменить роль пользователя.",
      );
    } finally {
      setUpdatingRoleId(null);
    }
  }

  function openCreateRoom() {
    setEditingRoom(null);
    setRoomForm({
      ...initialRoomForm,
      categoryId: categories[0] ? String(categories[0].id) : "",
    });
    setIsRoomModalOpen(true);
  }

  function openEditRoom(room: Room) {
    setEditingRoom(room);
    setRoomForm({
      roomNumber: room.roomNumber,
      categoryId: String(room.categoryId),
      capacity: String(room.capacity),
      pricePerNight: String(room.pricePerNight),
      isAvailable: room.isAvailable,
      images: room.images ?? "",
      amenityIds: room.amenities.map(({ amenity }) => amenity.id),
      bedType: room.bedType ?? "",
      mealPlan: room.mealPlan ?? "",
    });
    setIsRoomModalOpen(true);
  }

  async function saveRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPageError("");

    const payload = {
      roomNumber: roomForm.roomNumber.trim(),
      categoryId: Number(roomForm.categoryId),
      capacity: Number(roomForm.capacity),
      pricePerNight: Number(roomForm.pricePerNight),
      isAvailable: roomForm.isAvailable,
      images: roomForm.images || undefined,
      amenityIds: roomForm.amenityIds,
      bedType: roomForm.bedType || null,
      mealPlan: roomForm.mealPlan || null,
    };

    setIsSavingRoom(true);
    try {
      if (editingRoom) {
        await apiPatch(`/rooms/${editingRoom.id}`, payload);
      } else {
        await apiPost("/rooms", payload);
      }
      setIsRoomModalOpen(false);
      notifyHotelDataChanged();
      await loadTab("rooms", true);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Не удалось сохранить номер.",
      );
    } finally {
      setIsSavingRoom(false);
    }
  }

  async function deleteRoom(room: Room) {
    const confirmed = window.confirm(
      `Удалить номер ${room.roomNumber}? Это действие нельзя отменить.`,
    );
    if (!confirmed) return;

    setDeletingRoomId(room.id);
    setPageError("");
    try {
      await apiDelete(`/rooms/${room.id}`);
      setRooms((current) => current.filter((item) => item.id !== room.id));
      notifyHotelDataChanged();
    } catch (error) {
      setPageError(getUserFacingError(error, "Не удалось удалить номер."));
    } finally {
      setDeletingRoomId(null);
    }
  }

  if (isAuthLoading || !user || !isAdmin) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#f7f6f2]">
        <span
          aria-label="Проверка доступа"
          className="size-9 animate-spin rounded-full border-2 border-amber-600 border-t-transparent"
        />
      </main>
    );
  }

  const confirmedCount = bookings.filter(
    (booking) => booking.status === "CONFIRMED",
  ).length;
  const checkedInCount = bookings.filter(
    (booking) => booking.status === "CHECKED_IN",
  ).length;

  return (
    <main className="flex-1 bg-[#f7f6f2]">
      <section className="bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-13 lg:px-8">
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.22em] text-amber-300">
            <Shield size={15} />
            УПРАВЛЕНИЕ ОТЕЛЕМ
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="font-serif text-4xl font-semibold text-white sm:text-5xl">
                Панель администратора
              </h1>
              <p className="mt-3 text-sm text-slate-300 sm:text-base">
                Бронирования, гости и номерной фонд — в одном месте.
              </p>
            </div>
            {activeTab === "bookings" && loadedTabs.includes("bookings") && (
              <div className="flex gap-3">
                <Summary label="Всего броней" value={bookings.length} />
                <Summary label="Ожидают заезда" value={confirmedCount} />
                <Summary label="Проживают" value={checkedInCount} />
              </div>
            )}
            {activeTab === "users" && loadedTabs.includes("users") && (
              <Summary label="Пользователей" value={users.length} />
            )}
            {activeTab === "rooms" && loadedTabs.includes("rooms") && (
              <Summary label="Номеров" value={rooms.length} />
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <div
          role="tablist"
          aria-label="Разделы панели администратора"
          className="mb-6 flex w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 sm:w-fit"
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => chooseTab(id)}
              className={`inline-flex min-w-fit items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === id
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {pageError && (
          <div
            role="alert"
            className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700"
          >
            <span>{pageError}</span>
            <button
              type="button"
              onClick={() => void loadTab(activeTab, true)}
              aria-label="Повторить загрузку"
              className="shrink-0 rounded-lg p-1 transition hover:bg-rose-100"
            >
              <RefreshCw size={17} />
            </button>
          </div>
        )}

        {activeTab === "bookings" && (
          <Panel
            title="Все бронирования"
            description="Информация о гостях, заездах и статусах"
            action={
              <RefreshButton
                isLoading={isLoading}
                onClick={() => void loadTab("bookings", true)}
              />
            }
          >
            {isLoading ? (
              <LoadingRows />
            ) : bookings.length ? (
              <div className="divide-y divide-slate-100">
                {bookings.map((booking) => (
                  <article
                    key={booking.id}
                    className="grid items-center gap-4 px-5 py-5 transition hover:bg-slate-50/60 sm:px-6 md:grid-cols-6"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-400">
                        Бронь #{booking.id}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {booking.user.firstName} {booking.user.lastName}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <Mail size={12} />
                        {booking.user.email}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {booking.user.phone}
                      </p>
                      {booking.comment && (
                        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                          <span className="font-semibold">Пожелание: </span>
                          {booking.comment}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Номер
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                        <BedDouble size={15} className="text-amber-700" />
                        {booking.room.roomNumber} · {booking.room.category.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Даты проживания
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {formatDate(booking.checkIn)} —{" "}
                        {formatDate(booking.checkOut)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Сумма
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatMoney(booking.totalPrice)}
                      </p>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Статус
                      </p>
                      <StatusBadge status={booking.status} />
                    </div>
                    <BookingStatusSelect
                      booking={booking}
                      isUpdating={updatingBookingId === booking.id}
                      onChange={updateBookingStatus}
                    />
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="Бронирований пока нет"
                description="Новые бронирования появятся в этом разделе."
              />
            )}
          </Panel>
        )}

        {activeTab === "users" && (
          <Panel
            title="Пользователи"
            description="Гости отеля и история их бронирований"
            action={
              <RefreshButton
                isLoading={isLoading}
                onClick={() => void loadTab("users", true)}
              />
            }
          >
            {isLoading ? (
              <LoadingRows />
            ) : users.length ? (
              <div className="divide-y divide-slate-100">
                {users.map((guest) => (
                  <article
                    key={guest.id}
                    className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[0.85fr_1.15fr]"
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-800">
                          <UserRound size={18} />
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-950">
                            {guest.firstName} {guest.lastName}
                          </h3>
                          <p className="mt-1 break-all text-xs text-slate-500">
                            {guest.email}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">
                        {guest.phone}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            guest.role === "ADMIN"
                              ? "bg-violet-50 text-violet-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {guest.role === "ADMIN" ? "Администратор" : "Клиент"}
                        </span>
                        <span className="text-xs text-slate-400">
                          С нами с {formatDate(guest.createdAt)}
                        </span>
                        {guest.id !== user.sub && (
                          <button
                            type="button"
                            disabled={updatingRoleId === guest.id}
                            onClick={() => void updateUserRole(guest)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50"
                          >
                            {updatingRoleId === guest.id ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : guest.role === "CLIENT" ? (
                              <Shield size={13} />
                            ) : (
                              <UserRound size={13} />
                            )}
                            {guest.role === "CLIENT"
                              ? "Назначить администратором"
                              : "Сделать клиентом"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Бронирования · {guest.bookings.length}
                      </p>
                      {guest.bookings.length ? (
                        <div className="space-y-2">
                          {guest.bookings.map((booking) => (
                            <div
                              key={booking.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-3"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  №{booking.room.roomNumber} ·{" "}
                                  {booking.room.category.name}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {formatDate(booking.checkIn)} —{" "}
                                  {formatDate(booking.checkOut)}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-slate-800">
                                  {formatMoney(booking.totalPrice)}
                                </span>
                                <StatusBadge status={booking.status} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-sm text-slate-500">
                          У пользователя пока нет бронирований.
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={UsersRound}
                title="Пользователей пока нет"
                description="Зарегистрированные гости появятся в этом разделе."
              />
            )}
          </Panel>
        )}

        {activeTab === "rooms" && (
          <Panel
            title="Номерной фонд"
            description="Создание, редактирование и управление доступностью номеров"
            action={
              <div className="flex gap-2">
                <RefreshButton
                  isLoading={isLoading}
                  onClick={() => void loadTab("rooms", true)}
                />
                <button
                  type="button"
                  onClick={openCreateRoom}
                  disabled={!categories.length}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  title={
                    categories.length
                      ? "Добавить номер"
                      : "Сначала создайте категорию номера"
                  }
                >
                  <Plus size={16} />
                  Добавить номер
                </button>
              </div>
            }
          >
            {isLoading ? (
              <LoadingRows />
            ) : rooms.length ? (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[800px] border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        <th className="px-5 py-4">Номер</th>
                        <th className="px-5 py-4">Категория</th>
                        <th className="px-5 py-4">Вместимость</th>
                        <th className="px-5 py-4">Цена / ночь</th>
                        <th className="px-5 py-4">Доступность</th>
                        <th className="px-5 py-4">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rooms.map((room) => (
                        <tr
                          key={room.id}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4 font-semibold text-slate-900">
                            {room.roomNumber}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {room.category.name}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {room.capacity} гостей
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                            {formatMoney(room.pricePerNight)}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                !room.isAvailable
                                  ? "bg-amber-50 text-amber-700"
                                  : room.isBookedForDates
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {!room.isAvailable
                                ? "Недоступен"
                                : room.isBookedForDates
                                  ? "Занят сегодня"
                                  : "Свободен сегодня"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <RoomActions
                              room={room}
                              isDeleting={deletingRoomId === room.id}
                              onEdit={openEditRoom}
                              onDelete={deleteRoom}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-slate-100 md:hidden">
                  {rooms.map((room) => (
                    <article key={room.id} className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">
                            Номер {room.roomNumber}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {room.category.name} · {room.capacity} гостей
                          </p>
                          <p className="mt-2 font-semibold text-slate-900">
                            {formatMoney(room.pricePerNight)}{" "}
                            <span className="text-xs font-normal text-slate-500">
                              / ночь
                            </span>
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            !room.isAvailable
                              ? "bg-amber-50 text-amber-700"
                              : room.isBookedForDates
                                ? "bg-rose-50 text-rose-700"
                                : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {!room.isAvailable
                            ? "Недоступен"
                            : room.isBookedForDates
                              ? "Занят сегодня"
                              : "Свободен сегодня"}
                        </span>
                      </div>
                      <div className="mt-4">
                        <RoomActions
                          room={room}
                          isDeleting={deletingRoomId === room.id}
                          onEdit={openEditRoom}
                          onDelete={deleteRoom}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                icon={DoorOpen}
                title="Номеров пока нет"
                description="Добавьте первый номер, чтобы он появился в каталоге."
              />
            )}
          </Panel>
        )}
      </section>

      {isRoomModalOpen && (
        <RoomEditor
          categories={categories}
          amenities={amenities}
          editingRoom={editingRoom}
          values={roomForm}
          isSaving={isSavingRoom}
          onChange={setRoomForm}
          onClose={() => setIsRoomModalOpen(false)}
          onSubmit={saveRoom}
        />
      )}
    </main>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="whitespace-nowrap text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function RefreshButton({
  isLoading,
  onClick,
}: {
  isLoading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
    >
      <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
      <span className="hidden sm:inline">Обновить</span>
    </button>
  );
}

function BookingStatusSelect({
  booking,
  isUpdating,
  onChange,
}: {
  booking: Booking;
  isUpdating: boolean;
  onChange: (bookingId: number, status: EditableStatus) => void;
}) {
  const availableActions = statusActions.filter(
    (action) => action.status !== booking.status,
  );
  return (
    <div className="relative flex items-center lg:justify-start">
      <select
        aria-label={`Изменить статус брони ${booking.id}`}
        value=""
        disabled={isUpdating || !availableActions.length}
        onChange={(event) => {
          if (isEditableStatus(event.target.value)) {
            onChange(booking.id, event.target.value);
          }
        }}
        className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50 lg:w-36"
      >
        <option value="" disabled>
          {isUpdating
            ? "Сохраняем…"
            : availableActions.length
              ? "Сменить статус"
              : "Нет действий"}
        </option>
        {availableActions.map((action) => (
          <option key={action.status} value={action.status}>
            {action.label}
          </option>
        ))}
      </select>
      {isUpdating ? (
        <span className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
      ) : (
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      )}
    </div>
  );
}

function RoomActions({
  room,
  isDeleting,
  onEdit,
  onDelete,
}: {
  room: Room;
  isDeleting: boolean;
  onEdit: (room: Room) => void;
  onDelete: (room: Room) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onEdit(room)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <Edit3 size={14} />
        Изменить
      </button>
      <button
        type="button"
        onClick={() => void onDelete(room)}
        disabled={isDeleting}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
      >
        <Trash2 size={14} />
        {isDeleting ? "Удаляем…" : "Удалить"}
      </button>
    </div>
  );
}

function RoomEditor({
  categories,
  amenities,
  editingRoom,
  values,
  isSaving,
  onChange,
  onClose,
  onSubmit,
}: {
  categories: Category[];
  amenities: Amenity[];
  editingRoom: Room | null;
  values: RoomFormValues;
  isSaving: boolean;
  onChange: (values: RoomFormValues) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState("");

  function update<K extends keyof RoomFormValues>(
    key: K,
    value: RoomFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  function readImage(file: File | undefined) {
    if (!file) return;
    setImageError("");

    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        file.type,
      )
    ) {
      setImageError("Выберите изображение в формате JPG, PNG, WebP или GIF.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setImageError("Размер изображения не должен превышать 2 МБ.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setImageError("Не удалось прочитать изображение.");
        return;
      }
      update("images", reader.result);
    };
    reader.onerror = () => setImageError("Не удалось прочитать изображение.");
    reader.readAsDataURL(file);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    readImage(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    readImage(event.dataTransfer.files[0]);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-editor-title"
        className="my-auto w-full max-w-2xl rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-amber-700">
              НОМЕРНОЙ ФОНД
            </p>
            <h2
              id="room-editor-title"
              className="mt-1 font-serif text-2xl font-semibold text-slate-950"
            >
              {editingRoom ? "Редактировать номер" : "Добавить номер"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={19} />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="max-h-[calc(100vh-9rem)] space-y-5 overflow-y-auto px-6 py-6 sm:px-8"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Номер комнаты">
              <input
                required
                maxLength={50}
                value={values.roomNumber}
                onChange={(event) => update("roomNumber", event.target.value)}
                placeholder="Например, 204"
                className={inputClassName}
              />
            </FormField>
            <FormField label="Категория">
              <select
                required
                value={values.categoryId}
                onChange={(event) => update("categoryId", event.target.value)}
                className={inputClassName}
              >
                <option value="" disabled>
                  Выберите категорию
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Вместимость гостей">
              <input
                type="number"
                required
                min={1}
                step={1}
                value={values.capacity}
                onChange={(event) => update("capacity", event.target.value)}
                className={inputClassName}
              />
            </FormField>
            <FormField label="Цена за ночь (BYN)">
              <input
                type="number"
                required
                min={0}
                step="0.01"
                value={values.pricePerNight}
                onChange={(event) =>
                  update("pricePerNight", event.target.value)
                }
                className={inputClassName}
              />
            </FormField>
          </div>

          <div>
            <p className="mb-2 block text-xs font-semibold text-slate-600">
              Фото номера
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="sr-only"
              aria-label="Выбрать фото номера"
            />
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                if (
                  !(event.relatedTarget instanceof Node) ||
                  !event.currentTarget.contains(event.relatedTarget)
                ) {
                  setIsDragging(false);
                }
              }}
              onDrop={handleDrop}
              className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition ${
                isDragging
                  ? "border-amber-500 bg-amber-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              {values.images ? (
                <div className="relative h-48 sm:h-56">
                  <Image
                    src={values.images}
                    alt="Предпросмотр фото номера"
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, 600px"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => update("images", "")}
                    className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-white"
                  >
                    <X size={14} />
                    Удалить фото
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-3 right-3 rounded-lg bg-slate-950/85 px-3 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-slate-950"
                  >
                    Заменить фото
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-40 w-full flex-col items-center justify-center px-5 py-7 text-center"
                >
                  <span className="flex size-11 items-center justify-center rounded-full bg-white text-amber-700 shadow-sm">
                    <Upload size={19} />
                  </span>
                  <span className="mt-3 text-sm font-semibold text-slate-800">
                    Перетащите фото сюда
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    или нажмите, чтобы выбрать на устройстве · до 2 МБ
                  </span>
                </button>
              )}
            </div>
            {imageError && (
              <p role="alert" className="mt-2 text-xs text-rose-700">
                {imageError}
              </p>
            )}
          </div>

          <fieldset>
            <legend className="mb-3 text-xs font-semibold text-slate-600">
              Удобства
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {amenityLabels.map((label) => {
                const amenity = amenities.find(
                  (item) =>
                    item.name.toLocaleLowerCase("ru-RU") ===
                    label.toLocaleLowerCase("ru-RU"),
                );
                if (!amenity) return null;
                const checked = values.amenityIds.includes(amenity.id);

                return (
                  <label
                    key={amenity.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition ${
                      checked
                        ? "border-amber-300 bg-amber-50/70 text-slate-900"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        update(
                          "amenityIds",
                          event.target.checked
                            ? [...values.amenityIds, amenity.id]
                            : values.amenityIds.filter(
                                (id) => id !== amenity.id,
                              ),
                        )
                      }
                      className="size-4 rounded border-slate-300 accent-amber-600"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-slate-600">
              Тип кровати
            </legend>
            <select
              value={values.bedType}
              onChange={(event) =>
                update("bedType", event.target.value as BedType | "")
              }
              className={inputClassName}
            >
              <option value="">Не указан</option>
              <option value="DOUBLE_BED">Двуспальная кровать</option>
              <option value="TWO_SINGLE_BEDS">Две отдельные кровати</option>
              <option value="THREE_SINGLE_BEDS">Три односпальные</option>
            </select>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-slate-600">
              Питание
            </legend>
            <select
              value={values.mealPlan}
              onChange={(event) =>
                update("mealPlan", event.target.value as MealPlan | "")
              }
              className={inputClassName}
            >
              <option value="">Не указано</option>
              <option value="BREAKFAST_INCLUDED">Завтрак включен</option>
              <option value="NO_MEALS">Без питания</option>
              <option value="ALL_INCLUSIVE">Все включено</option>
            </select>
          </fieldset>

          <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={values.isAvailable}
              onChange={(event) => update("isAvailable", event.target.checked)}
              className="size-4 rounded border-slate-300 accent-amber-600"
            />
            Номер доступен для бронирования
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
            >
              {isSaving ? (
                "Сохраняем…"
              ) : (
                <>
                  <Check size={16} />
                  {editingRoom ? "Сохранить изменения" : "Создать номер"}
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

const inputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10";

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}
