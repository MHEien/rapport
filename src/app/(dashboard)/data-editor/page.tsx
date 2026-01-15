import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getProductTypes,
  getServicePoints,
} from "@/lib/actions/service-points-actions";
import { auth } from "@/lib/auth";
import { DataEditorClient } from "./client";

export default async function DataEditorPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/signin");
  }

  const [data, productTypes] = await Promise.all([
    getServicePoints(),
    getProductTypes(),
  ]);

  return <DataEditorClient initialData={data} productTypes={productTypes} />;
}
