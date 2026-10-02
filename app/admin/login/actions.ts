"use server";

import { redirect } from "next/navigation";
import { login, logout } from "@/lib/auth";

export type LoginState = { error?: string; lockedOut?: boolean };

/**
 * Login action.
 *
 * The password is read from the form but is never echoed back or logged, and
 * the comparison happens inside `login()` using a constant-time primitive.
 */
export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = formData.get("password");

  if (typeof password !== "string" || password.length === 0) {
    return { error: "Enter your password." };
  }

  // Bound the length before hashing. scrypt cost scales with input, and a
  // multi-megabyte password is a cheap way to burn CPU on the function.
  const result = await login(password.slice(0, 512));

  if (!result.ok) {
    return { error: result.error, lockedOut: result.lockedOut };
  }

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/admin/login");
}