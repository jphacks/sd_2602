import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, shortId } from "@/features/admin/format";

const badgeFor = (state) => {
  if (state === "succeeded") return <Badge>成功</Badge>;
  if (state === "failed") return <Badge variant="destructive">失敗</Badge>;
  if (state === "running") return <Badge variant="secondary">実行中</Badge>;
  if (state === "queued") return <Badge variant="secondary">待機中</Badge>;
  if (state === "superseded") return <Badge variant="outline">置き換え</Badge>;
  if (state === "ignored") return <Badge variant="outline">スキップ</Badge>;
  return <Badge variant="outline">{state ?? "不明"}</Badge>;
};

export default function RunHistory({ runs }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>実行履歴</CardTitle>
        <CardDescription>直近のOperationRun（最大15件）です。</CardDescription>
      </CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            実行履歴はまだありません。
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ランID</TableHead>
                  <TableHead>トリガー</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>ステージ</TableHead>
                  <TableHead>開始</TableHead>
                  <TableHead>終了</TableHead>
                  <TableHead>配信</TableHead>
                  <TableHead>エラー</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono text-xs">
                      {shortId(run.run_id)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {run.trigger ?? "—"}
                    </TableCell>
                    <TableCell>{badgeFor(run.state)}</TableCell>
                    <TableCell className="text-xs">
                      {run.stage ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateTime(run.started_at ?? run.created_date)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateTime(run.finished_at)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {run.delivery_state ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {run.error_code ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}