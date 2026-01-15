"use client";

import { Database, FileText, Home, PlusCircle, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Hjem", icon: Home },
  { href: "/reports", label: "Rapporter", icon: FileText },
  { href: "/report/new", label: "Ny", icon: PlusCircle, primary: true },
  { href: "/data-editor", label: "Data", icon: Database },
  { href: "/profile", label: "Profil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl border-t border-white/10" />

      {/* Safe area spacer for notched devices */}
      <div className="relative flex items-center justify-around px-2 pt-2 pb-safe">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.primary) {
            // Primary action (New Report) - floating button style
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative -mt-6 flex flex-col items-center justify-center",
                  "size-14 rounded-full",
                  "bg-gradient-to-br from-blue-500 to-indigo-600",
                  "shadow-lg shadow-blue-500/30",
                  "active:scale-95 transition-transform",
                )}
              >
                <Icon className="size-6 text-white" strokeWidth={2} />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-4",
                "transition-colors",
                isActive ? "text-blue-400" : "text-slate-500",
              )}
            >
              <div className="relative">
                <Icon className="size-5" strokeWidth={isActive ? 2.5 : 2} />
                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-blue-400" />
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
