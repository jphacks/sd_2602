import { createFileRoute } from "@tanstack/react-router";
import CalendarSourcesPage from "@/features/admin/components/CalendarSourcesPage";
import { getCalendarSources } from "@/features/admin/server";

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