import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: 'שבצ"ק מילואים',
  description: 'הגשת אילוצים וצפייה בשמירות',
  openGraph: {
    title: 'שבצ"ק מילואים — הגשת אילוצים',
    description: 'לחץ כדי להזדהות, להגיש אילוצים ולראות את השמירות שלך',
    locale: 'he_IL',
    type: 'website',
    siteName: 'שבצ"ק מילואים',
  },
  twitter: {
    card: 'summary',
    title: 'שבצ"ק מילואים — הגשת אילוצים',
    description: 'לחץ כדי להזדהות, להגיש אילוצים ולראות את השמירות שלך',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
