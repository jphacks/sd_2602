import { useEffect } from "react";
import { pendingCalendar } from "@/lib/account/flow";
// Resume only a user-started Calendar flow returning to the home page.
// The marker contains no credential and does not bypass the /account auth gate.
export function CalendarReturn() {
  useEffect(() => {
    if (window.location.pathname !== "/") return;
    try {
      if (pendingCalendar(window.sessionStorage))
        window.location.replace("/account");
    } catch {
      /* Storage may be disabled. */
    }
  }, []);
  return null;
}
