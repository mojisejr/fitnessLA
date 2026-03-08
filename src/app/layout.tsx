import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AdapterProvider } from "@/features/adapters/adapter-provider";
import { MockSessionProvider } from "@/features/auth/mock-session-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "fitnessLA",
  description: "ระบบหน้าจอแบบ mock-first สำหรับการขาย, กะ, เงินสดย่อย และงานบัญชีพื้นฐาน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AdapterProvider>
          <MockSessionProvider>{children}</MockSessionProvider>
        </AdapterProvider>
      </body>
    </html>
  );
}
