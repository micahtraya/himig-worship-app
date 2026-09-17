
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MobileNavDrawer from "@/components/MobileNavDrawer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HIMIG — KCCC Psalmist",
  description: "HIMIG Worship Songbook for KCCC Psalmist.",
  applicationName: "HIMIG",

  icons: {
    icon: [
      {
        url: "/himig-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/himig-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/himig-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },

  appleWebApp: {
    capable: true,
    title: "HIMIG",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#090909",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}

        <MobileNavDrawer />
      </body>
    </html>
  );
}