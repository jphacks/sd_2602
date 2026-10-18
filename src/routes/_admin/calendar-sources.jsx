import { createFileRoute } from "@tanstack/react-router";
import CalendarSourcesPage from "@/components/admin/CalendarSourcesPage";
import { getCalendarSources } from "@/lib/admin/server";

export const Route = createFileRoute("/_admin/calendar-sources")({
  loader: () => getCalendarSources(),
  pendingComponent: () => (
    <p role="status" className="text-sm text-muted-foreground">
      カレンダーソースを読み込んでいます…
    </p>
  ),
  head: () => ({ meta: [{ title: "カレンダーソース管理 | リスケRisuke" }] }),
  component: Page,
});

function Page() {
  return <CalendarSourcesPage data={Route.useLoaderData()} />;
}