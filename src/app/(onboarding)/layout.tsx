import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Minimal header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Rapport</h1>
          <p className="text-slate-400 text-sm mt-1">
            Konfigurer din organisasjon
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
