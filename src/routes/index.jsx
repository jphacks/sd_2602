import { Link, createFileRoute } from "@tanstack/react-router";
import { getServerInfo } from "@/lib/server-fns";

export const Route = createFileRoute("/")({
  loader: () => getServerInfo(),
  head: () => ({ meta: [{ title: "リスケRisuke" }] }),
  component: HomePage,
});

function HomePage() {
  const { renderedAt } = Route.useLoaderData();
  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">リスケRisuke</h1>
      <Link to="/me/connections" className="inline-block rounded-lg bg-emerald-700 px-5 py-3 text-white">個人ページを試す →</Link>
      <p className="text-muted-foreground">
        Server-rendered at <time dateTime={renderedAt}>{renderedAt}</time>.
      </p>
    </main>
  );
}
