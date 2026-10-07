import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import { PresentationEffects } from "@/components/presentation-effects";
import { publicAuthConfig } from "@/lib/public-auth-config";
import "./globals.css";

export const metadata: Metadata = { title: "Upay Financial Coach", description: "Decision support for customers: plan savings goals and assess planned purchases using recorded financial activity, with optional multilingual AI guidance.", icons: { icon: "/upay-logo.png" } };
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><PresentationEffects /><AuthProvider config={publicAuthConfig()}>{children}</AuthProvider></body></html>;
}
