import { Building2, Shield, Users } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentOrganization } from "@/lib/actions/org-actions";
import { auth } from "@/lib/auth";

const settingsLinks = [
  {
    href: "/settings/organization",
    icon: Building2,
    title: "Organisasjon",
    description: "Rediger organisasjonsnavn og detaljer",
  },
  {
    href: "/settings/team",
    icon: Users,
    title: "Teammedlemmer",
    description: "Administrer medlemmer og invitasjoner",
  },
];

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const orgData = await getCurrentOrganization();
  if (!orgData) {
    redirect("/setup");
  }

  const isOwnerOrAdmin =
    orgData.membership.role === "owner" || orgData.membership.role === "admin";

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="px-4 lg:px-6 py-6 border-b border-white/5">
        <h1 className="text-2xl font-bold text-white">Innstillinger</h1>
        <p className="text-slate-400 mt-1">{orgData.organization.name}</p>
      </header>

      {/* Settings grid */}
      <main className="px-4 lg:px-6 py-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {settingsLinks.map((link) => {
            const Icon = link.icon;

            // Only show team settings to owners/admins
            if (link.href === "/settings/team" && !isOwnerOrAdmin) {
              return null;
            }

            return (
              <Link key={link.href} href={link.href}>
                <Card className="h-full border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer group">
                  <CardHeader>
                    <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 flex items-center justify-center mb-2 group-hover:from-blue-500/30 group-hover:to-indigo-500/20 transition-colors">
                      <Icon className="size-6 text-blue-400" />
                    </div>
                    <CardTitle className="text-lg text-white">
                      {link.title}
                    </CardTitle>
                    <CardDescription>{link.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Role info */}
        <div className="mt-8 p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-3">
            <Shield className="size-5 text-slate-400" />
            <div>
              <p className="text-sm text-white">Din rolle</p>
              <p className="text-xs text-slate-400">
                {orgData.membership.role === "owner" &&
                  "Eier – Full tilgang til alle innstillinger"}
                {orgData.membership.role === "admin" &&
                  "Administrator – Kan administrere team"}
                {orgData.membership.role === "technician" &&
                  "Tekniker – Begrenset tilgang"}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
