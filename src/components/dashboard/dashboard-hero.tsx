"use client";

import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DashboardHeroProps {
  userName?: string | null;
}

export function DashboardHero({ userName }: DashboardHeroProps) {
  const greeting = getGreeting();
  const firstName = userName?.split(" ")[0] ?? "Tekniker";

  return (
    <section className="relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-transparent" />

      {/* Animated gradient orbs */}
      <div className="absolute -top-24 -right-24 size-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-24 -left-24 size-72 bg-indigo-500/15 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative px-6 py-12 lg:py-16">
        <div className="max-w-4xl">
          {/* Greeting */}
          <p className="text-blue-400 font-medium mb-2">{greeting}</p>

          {/* Main heading */}
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
            Velkommen tilbake, {firstName}
          </h1>

          {/* Subtitle */}
          <p className="text-slate-400 text-lg mb-8 max-w-xl">
            Klar for en ny dag med feltservice? Start en ny rapport eller
            fortsett der du slapp.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4">
            <Button
              asChild
              size="lg"
              className="h-12 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/25 text-base"
            >
              <Link href="/report/new">
                <Plus className="size-5 mr-2" />
                Ny Rapport
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-6 border-white/10 bg-white/5 hover:bg-white/10 text-base"
            >
              <Link href="/reports">
                Se alle rapporter
                <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "God natt 🌙";
  if (hour < 12) return "God morgen ☀️";
  if (hour < 18) return "God ettermiddag 👋";
  return "God kveld 🌆";
}
