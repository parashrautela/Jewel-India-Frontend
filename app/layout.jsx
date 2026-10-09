import { Bodoni_Moda, Jost, Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../components/auth/AuthProvider";
import { getAuthUser } from "../lib/supabase/queries";
import { headers } from "next/headers";
import Script from "next/script";

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope-var",
  subsets: ["latin"],
});

export async function generateMetadata() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const isAdmin = host.includes("app.jewelindia.shop") || host.includes("admin");

  if (isAdmin) {
    return {
      title: "Jewel India Admin",
      description: "Retailer dashboard for managing your Jewel India store",
      manifest: "/manifest.webmanifest",
      appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Jewel India Admin",
      },
      icons: {
        apple: [
          { url: "/icons/admin-icon-72x72.png", sizes: "72x72" },
          { url: "/icons/admin-icon-96x96.png", sizes: "96x96" },
          { url: "/icons/admin-icon-128x128.png", sizes: "128x128" },
          { url: "/icons/admin-icon-152x152.png", sizes: "152x152" },
          { url: "/icons/admin-icon-192x192.png", sizes: "192x192" },
        ],
      },
    };
  }

  // Storefront
  return {
    title: "Celestique | Timeless Jewelry",
    description: "A celestial touch for timeless moments.",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Jewel India",
    },
    icons: {
      apple: [
        { url: "/icons/icon-72x72.png", sizes: "72x72" },
        { url: "/icons/icon-96x96.png", sizes: "96x96" },
        { url: "/icons/icon-128x128.png", sizes: "128x128" },
        { url: "/icons/icon-152x152.png", sizes: "152x152" },
        { url: "/icons/icon-192x192.png", sizes: "192x192" },
      ],
    },
  };
}

export default async function RootLayout({ children }) {
  // Fetched once here — React.cache() deduplicates any subsequent getAuthUser()
  // calls made by nested server components in the same render pass.
  const initialUser = await getAuthUser();

  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script src="https://mcp.figma.com/mcp/html-to-design/capture.js" strategy="afterInteractive" />
        )}
        {/* <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css" integrity="sha512-2SwdPD6INVrV/lHTZbO2nodKhrnDdJK9/kg2XD1r9uGqPo1cUbujc+IYdlYdEErWNu69gVcYgdxlmVmzTWnetw==" crossorigin="anonymous" referrerpolicy="no-referrer" /> */}
        <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css" rel="stylesheet" />
      </head>
      <body
        suppressHydrationWarning
        className={`${bodoni.variable} ${jost.variable} ${manrope.variable} font-sans antialiased text-celestique-dark`}
      >
        <AuthProvider initialUser={initialUser}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
