import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "S-Coach — chat with your money",
  description:
    "A conversational AI personal economic trainer. Junction 2026 S-Bank challenge, frontend demo with synthetic data.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "S-Coach" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0b7a4b",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* phone frame: full-bleed on mobile, centered 430px column on desktop */}
        <div className="mx-auto flex min-h-dvh w-full max-w-phone flex-col bg-[#f4f6f4] shadow-2xl">
          {children}
        </div>
        <RegisterSW />
      </body>
    </html>
  );
}
