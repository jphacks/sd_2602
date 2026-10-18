import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/components/personal/AccountPage";
import { getSavedSchedule, getConnectionStatus } from "@/lib/account/server";
export const Route = createFileRoute("/_authed/account")({
  loader: async () => {
    const [status, saved] = await Promise.all([
      getConnectionStatus(),
      getSavedSchedule(),
    ]);
    return { status, saved };
  },
  head: () => ({ meta: [{ title: "アカウントと連携 | リスケRisuke" }] }),
  component: Page,
});
function Page() {
  const { status, saved } = Route.useLoaderData();
  return <AccountPage status={status} saved={saved} />;
}
