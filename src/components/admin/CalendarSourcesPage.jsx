import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, shortId } from "@/lib/admin/format";

export default function CalendarSourcesPage({ data }) {
  const { sources, currentRunId } = data;
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          カレンダーソース管理
        </h1>
        <p className="text-sm text-muted-foreground">
          登録済みのCalendarSourceと同期状態を確認できます。
        </p>
      </div>
      {sources.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            登録済みのカレンダーソースはまだありません。
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sources.map((source) => {
            const isCurrent = source.run_id && source.run_id === currentRunId;
            return (
              <Card key={source.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="font-mono text-base">
                      {source.calendar_id || "（既定カレンダー）"}
                    </CardTitle>
                    <div className="flex gap-2">
                      {isCurrent ? (
                        <Badge>現在のラン</Badge>
                      ) : (
                        <Badge variant="outline">過去のスナップショット</Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    最終フェッチ {formatDateTime(source.fetched_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
                    <div className="space-y-0.5">
                      <dt className="text-xs text-muted-foreground">
                        タイムゾーン
                      </dt>
                      <dd className="font-mono text-xs">
                        {source.timezone ?? "—"}
                      </dd>
                    </div>
                    <div className="space-y-0.5">
                      <dt className="text-xs text-muted-foreground">
                        取得範囲
                      </dt>
                      <dd className="text-xs">
                        {source.range
                          ? `${source.range.start_date} 〜 ${source.range.end_date_exclusive}`
                          : "—"}
                      </dd>
                    </div>
                    <div className="space-y-0.5">
                      <dt className="text-xs text-muted-foreground">
                        ソースリビジョン
                      </dt>
                      <dd className="font-mono text-xs">
                        {shortId(source.source_revision)}
                      </dd>
                    </div>
                    <div className="space-y-0.5">
                      <dt className="text-xs text-muted-foreground">
                        スキーマ
                      </dt>
                      <dd className="font-mono text-xs">
                        {source.schema_version ?? "—"}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}