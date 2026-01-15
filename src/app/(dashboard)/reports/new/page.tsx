import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getProductTypes } from "@/lib/actions/service-points-actions";
import { auth } from "@/lib/auth";
import { NewReportClient } from "./client";

export default async function NewReportPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/signin");
  }

  // Get distinct product types from org's service points
  const productTypes = await getProductTypes();

  return <NewReportClient productTypes={productTypes} />;
}
