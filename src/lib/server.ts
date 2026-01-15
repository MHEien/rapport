"use server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function signIn({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const session = await auth.api.signInEmail({
    headers: await headers(),
    body: {
      email,
      password,
    },
  });
  return session;
}

export async function signUp({
  email,
  rememberMe,
  name,
  password,
}: {
  email: string;
  rememberMe: boolean;
  name: string;
  password: string;
}) {
  const session = await auth.api.signUpEmail({
    headers: await headers(),
    body: {
      email,
      password,
      name,
      rememberMe,
    },
  });
  return session;
}
