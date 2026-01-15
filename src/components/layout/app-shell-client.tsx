"use client";

import { useBreakpoint } from "@/hooks/use-breakpoint";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";

interface AppShellClientProps {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  organization?: {
    id: string;
    name: string;
    slug: string | null;
  };
  membership?: {
    id: string;
    role: string;
    createdAt: Date;
  };
  children: React.ReactNode;
}

export function AppShellClient({
  user,
  organization,
  membership,
  children,
}: AppShellClientProps) {
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint === "desktop";
  const isTablet = breakpoint === "tablet";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Desktop/Tablet: Sidebar */}
      <Sidebar
        user={user}
        organization={organization}
        membership={membership}
        collapsed={isTablet}
      />

      {/* Main content */}
      <main
        className={`
          min-h-screen transition-all duration-300
          ${isDesktop ? "ml-64" : isTablet ? "ml-[72px]" : "ml-0"}
          pb-24 lg:pb-0
        `}
      >
        {children}
      </main>

      {/* Mobile: Bottom navigation */}
      <BottomNav />
    </div>
  );
}
