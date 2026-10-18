import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/components/personal/AccountPage";
import { getConnectionStatus } from "@/lib/account/server";
export const Route = createFileRoute("/_authed/account")({
  loader: () => getConnectionStatus(),
  head: () => ({ meta: [{ title: "アカウントと連携 | リスケRisuke" }] }),
  component: Page,
});
function Page() {
  return <AccountPage status={Route.useLoaderData()} />;
}
