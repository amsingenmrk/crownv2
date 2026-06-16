import localFont from "next/font/local"
import type { Metadata } from "next"

import "./globals.css"
import { ToastProvider } from "@/components/app-toast"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { buildThemeBootScript } from "@/lib/theme-mode"

/** Self-hosted Inter — avoids build-time fetches to fonts.gstatic.com (often blocked or TLS-broken on corp networks). */
const inter = localFont({
  src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "100 900",
  preload: true,
  adjustFontFallback: "Arial",
})

function metadataBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, "")
  if (process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`
  return "http://localhost:3001"
}

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl()),
  title: { default: "Glassbox", template: "%s · Glassbox" },
  description:
    "Portfolio, scenarios, search, and building-level stacking, modifications, and forecasts for Meridian Capital demo assets.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <script
          id="theme-boot"
          dangerouslySetInnerHTML={{ __html: buildThemeBootScript() }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <TooltipProvider>
            <ToastProvider>{children}</ToastProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
