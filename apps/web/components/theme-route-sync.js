"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function ThemeRouteSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!pathname || !pathname.startsWith("/dashboard")) {
      document.documentElement.classList.remove("dark");
    } else {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme === "light") {
        document.documentElement.classList.remove("dark");
      } else {
        document.documentElement.classList.add("dark");
      }
    }
  }, [pathname]);

  return null;
}
