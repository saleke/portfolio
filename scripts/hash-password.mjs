#!/usr/bin/env node
/**
 * Generates the ADMIN_PASSWORD_HASH value for the admin area.
 *
 * Usage:
 *   node scripts/hash-password.mjs "your password"
 *   node scripts/hash-password.mjs            # prompts without echoing
 *
 * The password is never written to disk by this script and never printed.
 * Copy the output into `.env.local` as ADMIN_PASSWORD_HASH.
 *
 * scrypt is used because it is memory-hard and ships in Node's standard
 * library, so this adds no dependency to the project.
 */

import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const KEY_LENGTH = 64;

async function readPassword(argument) {
  if (argument) return argument;

  // Prompt with echo disabled so the password is not visible while typing.
  // readline has no built-in flag for this; suppressing output is the
  // standard approach, then restoring it to print the newline.
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  rl.output.write = () => {};
  const answer = await rl.question("Password: ");
  rl.output.write = stdout.write.bind(stdout);
  rl.output.write("\n");
  rl.close();
  return answer;
}

const provided = await readPassword(process.argv[2]);

if (!provided) {
  console.error("No password supplied.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(provided, salt, KEY_LENGTH);

console.log("\nAdd this to .env.local:\n");
console.log(`ADMIN_PASSWORD_HASH=scrypt$${salt.toString("hex")}$${hash.toString("hex")}`);
console.log("\nGenerate a session secret with:");
console.log('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))"');