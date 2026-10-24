import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/features/admin/format";
import AdjustmentDialog from "@/features/admin/components/AdjustmentDialog";
import {
  createAdjustment,
  deleteAdjustment,
  updateAdjustment,
} from "@/features/admin/server";

export default function AdjustmentsPage({ adjustments }) {
  const router = useRouter();
  const create = useServerFn(createAdjustment);
  const update = useServerFn(updateAdjustment);
  const remove = useServerFn(deleteAdjustment);
  const [dialog, setDialog] = useState(null); // null | "new" | record
  const [busy, setBusy] = useState(false);

  async function run(action, message) {
    setBusy(true);
    try {
      await action();
      toast.success(message);
      await router.invalidate();
    } catch {
      toast.error("保存できませんでした。入力内容を確認してください。");
    } finally {
      setBusy(false);
    }
  }

  const handleSubmit = (values) =>
    run(
      () =>
        dialog === "new"
          ? create({ data: values })
          : update({ data: { id: dialog.id, ...values } }),
      dialog === "new" ? "調整ルールを追加しました。" : "調整ルールを更新しました。",
    );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            調整ルール設定
          </h1>
          <p className="text-sm text-muted-foreground">
            ManualAdjustmentでスケジュール調整のルールや手動設定を管理します。
          </p>
        </div>
        <Button onClick={() => setDialog("new")}>新規追加</Button>
      </div>
      <Card>
        <CardContent>
          {adjustments.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              調整ルールはまだありません。「新規追加」から作成できます。
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>開始</TableHead>
                    <TableHead>終了</TableHead>
                    <TableHead>調整値</TableHead>
                    <TableHead>有効</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDateTime(item.start_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDateTime(item.end_at)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {item.adjustment_value ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={Boolean(item.active)}
                          disabled={busy}
                          aria-label="有効切り替え"
                          onCheckedChange={(checked) =>
                            run(
                              () =>
                                update({
                                  data: { id: item.id, active: checked },
                                }),
                              checked
                                ? "ルールを有効にしました。"
                                : "ルールを無効にしました。",
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => setDialog(item)}
                          >
                            編集
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            disabled={busy}
                            onClick={() =>
                              run(
                                () => remove({ data: { id: item.id } }),
                                "調整ルールを削除しました。",
                              )
                            }
                          >
                            削除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {dialog && (
        <AdjustmentDialog
          record={dialog === "new" ? null : dialog}
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}