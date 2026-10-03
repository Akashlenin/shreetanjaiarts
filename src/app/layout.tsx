import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thanjai Gild · Handcrafted Tanjavur Art Frames",
  description: "Discover handcrafted Tanjavur art frames made with gold foil relief, rich pigments and heirloom detailing.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
