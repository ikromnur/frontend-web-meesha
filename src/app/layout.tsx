import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/providers";
import NextTopLoader from "nextjs-toploader";
import "nprogress/nprogress.css";

export const metadata: Metadata = {
  title: {
    default: "Bouquet & Florist Kebumen",
    template: "%s | Bouquet & Florist Kebumen",
  },
  description: "Bouquet dan Florist Kebumen",
  icons: {
    icon: "#",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased font-poppins"
      >
        <NextTopLoader
          color="#E76F51"
          initialPosition={0.2}
          crawlSpeed={300}
          height={3}
          crawl
          showSpinner={false}
          easing="ease"
          speed={500}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
