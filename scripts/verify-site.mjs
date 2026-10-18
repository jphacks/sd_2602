import process from "node:process";
import console from "node:console";
import { URL } from "node:url";
const { fetch, AbortSignal } = globalThis;
import { checkPage } from "../src/lib/site/check.js";
const origin = new URL(process.argv[2] || "http://localhost:5173");
if (
  origin.username ||
  origin.password ||
  !["https:", "http:"].includes(origin.protocol) ||
  (origin.protocol === "http:" &&
    !["localhost", "127.0.0.1"].includes(origin.hostname))
)
  throw new Error("Use HTTPS, or HTTP on localhost");
for (const pathname of ["/me", "/me/pair"]) {
  const target = new URL(pathname, origin);
  try {
    const response = await fetch(target, {
      signal: AbortSignal.timeout(15000),
    });
    const result = checkPage(response.status, await response.text());
    console.log(
      JSON.stringify({ url: target.href, status: response.status, ...result }),
    );
    if (!result.ok) process.exitCode = 1;
  } catch {
    console.log(
      JSON.stringify({ url: target.href, ok: false, reason: "REQUEST_FAILED" }),
    );
    process.exitCode = 1;
  }
}
