import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewReportClient } from "./client";

export default async function NewReportPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/signin");
  }

  // Get distinct product types from service points
  const productTypes = await prisma.servicePoint.findMany({
    distinct: ["productType"],
    select: { productType: true },
  });

  return (
    <NewReportClient
      userId={session.user.id}
      productTypes={productTypes.map((p) => p.productType)}
    />
  );
}
