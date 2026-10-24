import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarReturn } from "@/features/account/components/CalendarReturn";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "リスケRisuke" }] }),
  component: HomePage,
});

function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 px-6 py-12">
      <CalendarReturn />
      <h1 className="text-3xl font-semibold tracking-tight">りすけ</h1>
      <p className="text-muted-foreground">
        予定から誘いやすい日を見つける、スケジュール調整支援ツール
      </p>
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <Link
          to="/account"
          className="flex-1 rounded-lg bg-emerald-700 px-5 py-3 text-center font-medium text-white"
        >
          ログインして自分の予定を見る
        </Link>
        <Link
          to="/me"
          className="flex-1 rounded-lg border px-5 py-3 text-center"
        >
          テストデータで試す
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        <Link to="/me/connections" className="underline underline-offset-4">
          連携の流れとプレビュー
        </Link>
      </p>
    </main>
  );
}