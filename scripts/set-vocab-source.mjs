import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const source = process.argv[2] === "private" ? "private" : "sample";
const file = resolve(process.cwd(), ".env.local");

writeFileSync(file, `VOCAB_SOURCE=${source}\n`, "utf8");
console.log(`VOCAB_SOURCE=${source}`);
