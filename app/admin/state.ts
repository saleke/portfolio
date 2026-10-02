/**
 * Shared form-state types for the admin control plane.
 *
 * Deliberately not a `"use server"` module. A server-actions file may only
 * export async functions, because Next.js turns each export into an RPC
 * endpoint — a plain object or a type-only export there is a build error.
 *
 * Keeping the state shape here means every action and every form can share one
 * definition without the actions module having to export anything but
 * functions.
 */

export type ActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  /** Field-level messages keyed by form field name. */
  fieldErrors?: Record<string, string>;
};

/** The state every form starts in. */
export const IDLE_STATE: ActionState = { status: "idle" };