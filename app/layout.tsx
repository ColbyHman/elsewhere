import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { ThemeProvider } from "@/components/theme";
import { MemoryProvider } from "@/lib/store";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeBoot = `(function(){try{var t=localStorage.getItem("taskboard:theme");var dark=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",dark);}catch(e){}})();`;

export const metadata = {
  title: {
    default: "Elsewhere — a lightweight life dashboard",
    template: "%s · Elsewhere",
  },
  description:
    "One screen to capture anything and find it again. A calmer place to put what you don't want to have to remember.",
  appleWebApp: {
    capable: true,
    title: "Elsewhere",
    statusBarStyle: "default",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#1C1917" },
    { media: "(prefers-color-scheme: light)", color: "#FAF8F5" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="min-h-full bg-background font-sans text-foreground">
        <ThemeProvider>
          <MemoryProvider>
            <div className="flex min-h-dvh flex-col">{children}</div>
          </MemoryProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
