import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import { publicAuthConfig } from "@/lib/public-auth-config";
import "./globals.css";

export const metadata: Metadata = { title: "Upay Financial Coach", description: "Track recorded finances, save toward goals, and get financial coaching." };
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><AuthProvider config={publicAuthConfig()}>{children}</AuthProvider></body></html>;
}
