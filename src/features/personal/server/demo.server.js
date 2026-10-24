import seed from "../../../mock/personal.json";
import { loadPersonalDemo } from "./service.js";

export function readDemo() {
  return loadPersonalDemo({
    seed,
    now: new Date(),
    requestId: crypto.randomUUID(),
    log: (entry) => console.info(JSON.stringify(entry)),
  });
}
