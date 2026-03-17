/**
 * ============================================
 * FEEL ME - Layout Principal
 * Wrapper global avec CartProvider pour le panier
 * Police : Playfair Display (premium serif)
 * ============================================
 */

import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart";

/* --- Police principale : Playfair Display (titres premium) --- */
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/* --- Police secondaire : Inter (corps de texte) --- */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Feel Me - Les senteurs du paradis",
  description: "Découvrez Feel Me, marque premium de musc tahara original. Les senteurs du paradis à portée de main.",
  keywords: "musc, tahara, parfum, feel me, senteurs, paradis, musc tahara original",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${playfair.variable} ${inter.variable} antialiased bg-[#fafafa]`}
      >
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
