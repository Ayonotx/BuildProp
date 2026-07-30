import type { Metadata, Viewport } from "next"
import Script from "next/script"
import "./globals.css"

export const metadata: Metadata = {
  title: "BuildProp - Construction & Real Estate Management",
  description: "Comprehensive administrative management system for construction firms and real estate companies",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  other: {
    "msapplication-TileColor": "#0f172a",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
}

export const viewport: Viewport = {
  themeColor: "#f97316",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="msapplication-TileImage" content="/icon-192.png" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {})
            })
          }
        `}</Script>
      </body>
    </html>
  )
}
