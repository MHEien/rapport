import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { prisma } from "./prisma"; // Ensure this path is correct

const statement = {
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
} as const;

const ac = createAccessControl(statement);

const owner = ac.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
});

const admin = ac.newRole({
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
});

const technician = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
});

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  plugins: [
    nextCookies(),
    // FIX: Remove 'organizationClient()' from here. It belongs in the client config.
    organization({
      ac,
      allowUserToCreateOrganization: true,
      roles: {
        owner,
        admin,
        technician,
      },
      creatorRole: "owner",
    }),
  ],
  experimental: {
    joins: true, // Only keep if you are actually using experimental joins
  },
});
