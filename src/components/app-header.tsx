"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Compass, MapPin } from "lucide-react";

type Notification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  trip: { id: string; name: string };
};

export function AppHeader() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []))
      .catch(() => {});
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-50 border-b border-brand-100/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-brand-800">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Compass className="h-5 w-5" />
          </span>
          <span className="text-lg tracking-tight">Waypoint</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="relative rounded-lg p-2 text-slate-600 hover:bg-brand-50"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="mb-2 flex items-center justify-between px-2 py-1">
                  <span className="text-sm font-semibold">Notifications</span>
                  <button
                    type="button"
                    className="text-xs text-brand-700 hover:underline"
                    onClick={async () => {
                      await fetch("/api/notifications", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ markAllRead: true }),
                      });
                      setNotifications((n) => n.map((item) => ({ ...item, read: true })));
                    }}
                  >
                    Mark all read
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="px-2 py-4 text-sm text-slate-500">No notifications yet</p>
                ) : (
                  <ul className="max-h-72 space-y-1 overflow-y-auto">
                    {notifications.map((n) => (
                      <li key={n.id}>
                        <Link
                          href={`/trips/${n.trip.id}`}
                          className="block rounded-lg px-2 py-2 hover:bg-brand-50"
                          onClick={() => setOpen(false)}
                        >
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-slate-500">{n.message}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <Link
            href="/"
            className="hidden items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50 sm:flex"
          >
            <MapPin className="h-4 w-4" />
            My trips
          </Link>
        </div>
      </div>
    </header>
  );
}
