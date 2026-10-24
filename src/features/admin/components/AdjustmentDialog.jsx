import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const toLocalInput = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function AdjustmentDialog({ record, busy, onClose, onSubmit }) {
  const [form, setForm] = useState({
    start: toLocalInput(record?.start_at),
    end: toLocalInput(record?.end_at),
    value: record?.adjustment_value ?? 0,
    active: record ? Boolean(record.active) : true,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({
      start: toLocalInput(record?.start_at),
      end: toLocalInput(record?.end_at),
      value: record?.adjustment_value ?? 0,
      active: record ? Boolean(record.active) : true,
    });
    setError("");
  }, [record]);

  function submit() {
    if (!form.start || !form.end) {
      setError("開始と終了を入力してください。");
      return;
    }
    if (new Date(form.end) <= new Date(form.start)) {
      setError("終了は開始より後にしてください。");
      return;
    }
    onSubmit({
      start_at: new Date(form.start).toISOString(),
      end_at: new Date(form.end).toISOString(),
      adjustment_value: Number(form.value) || 0,
      active: form.active,
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {record ? "調整ルールを編集" : "調整ルールを追加"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adjustment-start">開始</Label>
            <Input
              id="adjustment-start"
              type="datetime-local"
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjustment-end">終了</Label>
            <Input
              id="adjustment-end"
              type="datetime-local"
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjustment-value">調整値</Label>
            <Input
              id="adjustment-value"
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              値の粒度・意味は編集仕様の確定後に固定されます。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="adjustment-active"
              checked={form.active}
              onCheckedChange={(checked) =>
                setForm({ ...form, active: checked })
              }
            />
            <Label htmlFor="adjustment-active">有効にする</Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            キャンセル
          </Button>
          <Button onClick={submit} disabled={busy}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}