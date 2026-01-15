"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 640;
const TABLET_BREAKPOINT = 1024;

type Breakpoint = "mobile" | "tablet" | "desktop";

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < MOBILE_BREAKPOINT) {
        setBreakpoint("mobile");
      } else if (width < TABLET_BREAKPOINT) {
        setBreakpoint("tablet");
      } else {
        setBreakpoint("desktop");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return breakpoint;
}

export function useIsMobile(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === "mobile";
}
