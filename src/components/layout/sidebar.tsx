"use client";

import {
  Database,
  FileText,
  Home,
  LogOut,
  Menu,
  Package,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { Card } from "../ui/card";
import { SyncIndicator } from "./sync-indicator";

const navItems = [
  { href: "/", label: "Hjem", icon: Home },
  { href: "/reports", label: "Rapporter", icon: FileText },
  { href: "/customers", label: "Kunder", icon: Users },
  { href: "/inventory", label: "Varebeholdning", icon: Package },
  { href: "/data-editor", label: "Dataredigering", icon: Database },
  { href: "/settings", label: "Innstillinger", icon: Settings },
];

interface SidebarProps {
  user?: {
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
  collapsed?: boolean;
}

export function Sidebar({
  user,
  organization,
  membership,
  collapsed = false,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
        },
      },
    });
  };

  const _isOwnerOrAdmin =
    membership?.role === "owner" || membership?.role === "admin";

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <Card
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile hamburger */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-30 lg:hidden p-2 rounded-xl bg-card/80 backdrop-blur border shadow-lg"
      >
        <Menu className="size-5" />
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full flex flex-col",
          "bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950",
          "border-r border-white/5",
          "transition-all duration-300 ease-out",
          // Mobile: slide in/out
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          // Width
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-3 px-4 h-16 border-b border-white/5",
            collapsed && "justify-center px-2",
          )}
        >
          {/* Logo */}
          <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <FileText className="size-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-white truncate">
                {organization?.name ?? "Rapport"}
              </h1>
              <p className="text-xs text-slate-400 truncate">Feltservice</p>
            </div>
          )}
          {/* Mobile close */}
          <Button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/5 text-slate-400"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                  "text-slate-400 hover:text-white hover:bg-white/5",
                  isActive &&
                    "bg-gradient-to-r from-blue-500/20 to-indigo-500/10 text-white shadow-lg shadow-blue-500/5",
                  collapsed && "justify-center px-2",
                )}
              >
                <Icon
                  className={cn("size-5 shrink-0", isActive && "text-blue-400")}
                />
                {!collapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sync indicator */}
        <div className={cn("p-3 border-t border-white/5", collapsed && "px-2")}>
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2",
              collapsed && "justify-center px-0",
            )}
          >
            <SyncIndicator />
          </div>
        </div>

        {/* User section */}
        {user && (
          <div
            className={cn("p-3 border-t border-white/5", collapsed && "px-2")}
          >
            <div
              className={cn(
                "flex items-center gap-3 p-2 rounded-xl mb-2",
                "bg-white/5",
                collapsed && "justify-center p-2",
              )}
            >
              <Avatar className="size-9">
                <AvatarImage src={user.image ?? undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm">
                  {user.name?.[0] ?? user.email?.[0] ?? "U"}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.name ?? "Bruker"}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {user.email}
                  </p>
                </div>
              )}
            </div>
            
            <Button
              variant="ghost" 
              onClick={handleSignOut}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10",
                collapsed ? "justify-center px-2" : "justify-start px-3"
              )}
            >
              <LogOut className="size-5 shrink-0" />
              {!collapsed && <span>Logg ut</span>}
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}
