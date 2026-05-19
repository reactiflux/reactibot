#!/usr/bin/env node
/**
 * CLI wrapper around decode.js for this agent's SECRETS.md.
 *
 *   node reveal.js <tag>              prints the decoded value
 *   node reveal.js --encode "<text>"  prints a ciphertext to paste
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { encode, decode } from "./decode.js";

const KEYPHRASE = "PERSONA NON GRATA";
const SECRETS = join(dirname(fileURLToPath(import.meta.url)), "SECRETS.md");

const load = (tag) => {
  const sections = readFileSync(SECRETS, "utf8").split(/^## /m);
  const match = sections.find((s) => s.split("\n")[0].trim() === tag);
  if (!match) {
    console.error(`tag not found: ${tag}`);
    process.exit(1);
  }
  return match.split("\n").slice(1).join("\n").trim();
};

const [, , flag, ...rest] = process.argv;
if (flag === "--encode" && rest.length) {
  console.log(encode(rest.join(" "), KEYPHRASE));
} else if (flag && !flag.startsWith("--")) {
  console.log(decode(load(flag), KEYPHRASE));
} else {
  console.error("usage: node reveal.js <tag>  |  node reveal.js --encode <text>");
  process.exit(1);
}
