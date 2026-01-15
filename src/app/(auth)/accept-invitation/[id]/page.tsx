import { headers } from "next/headers";
import { getInvitation } from "@/lib/actions/org-actions";
import { auth } from "@/lib/auth";
import { AcceptInvitationClient } from "./client";

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const result = await getInvitation(id);

  if (!result.success || !result.invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-2">
            Ugyldig invitasjon
          </h1>
          <p className="text-slate-400">
            {result.error || "Fant ikke invitasjonen."}
          </p>
        </div>
      </div>
    );
  }

  // If session exists but email doesn't match invite, show warning
  // Note: Better Auth handles this check on accept, but UI guidance is good
  const emailMismatch = session?.user?.email !== result.invitation.email;

  return (
    <AcceptInvitationClient
      invitation={result.invitation}
      currentUser={session?.user}
      emailMismatch={emailMismatch && !!session}
    />
  );
}
