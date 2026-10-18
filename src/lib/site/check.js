export function checkPage(status, html) {
  if (status !== 200) return { ok: false, reason: "HTTP_" + status };
  if (
    !/<meta(?=[^>]*name=["']risuke-renderer["'])(?=[^>]*content=["']tanstack-start-v1["'])[^>]*>/i.test(
      html,
    )
  )
    return { ok: false, reason: "EXPECTED_APP_NOT_SERVED" };
  return { ok: true, reason: "EXPECTED_APP_SERVED" };
}
