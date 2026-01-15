import { redirect } from "next/navigation";
import { getSession } from "@/lib/server";
import { Signup } from "./client";

export default async function Page() {
  const session = await getSession();

  if (session?.session.id) {
    redirect("/");
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <Signup />
    </div>
  );
}
