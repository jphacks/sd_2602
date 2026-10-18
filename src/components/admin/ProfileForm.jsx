import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSettings } from "@/lib/admin/server";

const initialForm = (profile) => ({
  timezone: profile?.timezone ?? "Asia/Tokyo",
  google_status: profile?.google_status ?? "unlinked",
  google_connection_ref: profile?.google_connection_ref ?? "",
  line_user_id: profile?.line_user_id ?? "",
  line_display_name: profile?.line_display_name ?? "",
});

export default function ProfileForm({ profile }) {
  const router = useRouter();
  const save = useServerFn(updateSettings);
  const [form, setForm] = useState(() => initialForm(profile));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm(initialForm(profile));
  }, [profile]);

  async function submit() {
    setBusy(true);
    try {
      await save({ data: form });
      toast.success("設定を保存しました。");
      await router.invalidate();
    } catch {
      toast.error("保存できませんでした。入力内容を確認してください。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>UserProfile設定</CardTitle>
        <CardDescription>
          タイムゾーン・Google連携状態・LINE連携の参照情報を保存します。
          {profile ? "" : "保存するとUserProfileが作成されます。"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-timezone">タイムゾーン</Label>
            <Input
              id="profile-timezone"
              value={form.timezone}
              placeholder="Asia/Tokyo"
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Google連携状態</Label>
            <Select
              value={form.google_status}
              onValueChange={(value) =>
                setForm({ ...form, google_status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unlinked">未連携</SelectItem>
                <SelectItem value="linked">連携済み</SelectItem>
                <SelectItem value="auth_required">要再認可</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-connection-ref">
              接続参照（google_connection_ref）
            </Label>
            <Input
              id="profile-connection-ref"
              value={form.google_connection_ref}
              onChange={(e) =>
                setForm({ ...form, google_connection_ref: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-line-id">LINEユーザーID</Label>
            <Input
              id="profile-line-id"
              value={form.line_user_id}
              onChange={(e) => setForm({ ...form, line_user_id: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-line-name">LINE表示名</Label>
            <Input
              id="profile-line-name"
              value={form.line_display_name}
              onChange={(e) =>
                setForm({ ...form, line_display_name: e.target.value })
              }
            />
          </div>
        </div>
        <Button onClick={submit} disabled={busy}>
          保存する
        </Button>
      </CardContent>
    </Card>
  );
}