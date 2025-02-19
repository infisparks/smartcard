'use client';


import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { firebaseApp } from "../firebaseconfig";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



// This component will check if the user is authenticated on any /dashboard route
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth(firebaseApp);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // If we're on a dashboard page and there's no user, redirect to /login
      if (pathname.startsWith("/dashboard") && !user) {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [pathname, router]);

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ProtectedRoute>{children}</ProtectedRoute>
      </body>
    </html>
  );
}
