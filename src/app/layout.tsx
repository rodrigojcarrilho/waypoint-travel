import type { Metadata } from "next";
import "./globals.css";
import "./leaflet.css";
import { AppHeader } from "@/components/app-header";

export const metadata: Metadata = {
  title: "Waypoint — Group Travel Planner",
  description: "Plan and track trips with friends and family",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppHeader />
        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
