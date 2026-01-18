"use client";

import { AlertTriangle, Building2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { acceptInvitation } from "@/lib/actions/org-actions";
import { authClient } from "@/lib/auth-client";

interface Invitation {
  id: string;
  email: string;
  role: string;
  organization: {
    name: string;
  };
  inviter: {
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface User {
  id: string;
  email: string;
  name?: string | null;
}

interface AcceptInvitationClientProps {
  invitation: Invitation;
  currentUser?: User;
  emailMismatch: boolean;
}

export function AcceptInvitationClient({
  invitation,
  currentUser,
  emailMismatch,
}: AcceptInvitationClientProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const result = await acceptInvitation(invitation.id);
      if (result.success) {
        toast.success("Velkommen til teamet!");
        router.push("/");
      } else {
        toast.error(result.error);
        setIsAccepting(false);
      }
    } catch (_error) {
      toast.error("Noe gikk galt");
      setIsAccepting(false);
    }
  };

  const handleSignOutputAndRedirect = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          // Redirect to signin with callback to this invitation page
          router.push(`/auth/signin?callbackUrl=/accept-invitation/${invitation.id}`);
        },
      },
    });
  };

  // Determine avatar text securely
  const inviterInitial =
    invitation.inviter.name?.[0] || invitation.inviter.email[0] || "?";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/[0.02] border-white/5 backdrop-blur-xl">
        <CardHeader className="text-center">
          <div className="mx-auto size-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 flex items-center justify-center mb-4 border border-white/5">
            <Building2 className="size-8 text-blue-400" />
          </div>
          <CardTitle className="text-2xl text-white">Du er invitert!</CardTitle>
          <CardDescription className="text-slate-400 text-base mt-2">
            <span className="text-white font-medium">
              {invitation.inviter.name || invitation.inviter.email}
            </span>{" "}
            har invitert deg til å bli med i{" "}
            <span className="text-white font-medium">
              {invitation.organization.name}
            </span>{" "}
            på Rapport.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-4">
            <Avatar className="size-10 border border-white/10">
              <AvatarImage src={invitation.inviter.image || undefined} />
              <AvatarFallback className="bg-slate-800 text-slate-400">
                {invitation.inviter.name?.[0] || inviterInitial}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">
                Rolle:{" "}
                <span className="capitalize text-blue-400">
                  {invitation.role}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                Invitasjonen ble sendt til {invitation.email}
              </div>
            </div>
          </div>

          {emailMismatch && currentUser && (
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex gap-3 text-orange-200 text-sm">
              <AlertTriangle className="size-5 shrink-0 text-orange-400" />
              <div>
                Du er logget inn som <b>{currentUser.email}</b>, men
                invitasjonen ble sendt til <b>{invitation.email}</b>. Du må
                kanskje logge ut for å akseptere.
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {currentUser ? (
            !emailMismatch ? (
              <Button
                onClick={handleAccept}
                disabled={isAccepting}
                className="w-full h-12 text-base bg-blue-600 hover:bg-blue-500"
              >
                {isAccepting ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  "Bli med i organisasjonen"
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSignOutputAndRedirect}
                variant="outline"
                className="w-full h-12 border-slate-700 text-slate-300 hover:text-white"
              >
                Logg ut og bytt bruker
              </Button>
            )
          ) : (
            <>
              <Button
                asChild
                className="w-full h-12 text-base bg-blue-600 hover:bg-blue-500"
              >
                <Link
                  href={`/signup?email=${encodeURIComponent(invitation.email)}&callbackUrl=/accept-invitation/${invitation.id}`}
                >
                  Opprett bruker for å delta
                </Link>
              </Button>
              <div className="text-center text-sm text-slate-500">
                Har du allerede en bruker?{" "}
                <Link
                  href={`/login?email=${encodeURIComponent(invitation.email)}&callbackUrl=/accept-invitation/${invitation.id}`}
                  className="text-blue-400 hover:underline"
                >
                  Logg inn
                </Link>
              </div>
            </>
          )}
        </CardFooter>
      </Card>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>
    </div>
  );
}
