const HOTEL_DATA_CHANGED = "hotel-data-changed";

export function notifyHotelDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(HOTEL_DATA_CHANGED));
  }
}

export function subscribeToHotelDataChanges(listener: () => void) {
  window.addEventListener(HOTEL_DATA_CHANGED, listener);
  return () => window.removeEventListener(HOTEL_DATA_CHANGED, listener);
}
