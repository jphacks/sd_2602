import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { shortId } from "@/features/admin/format";
import ProfileForm from "@/features/admin/components/ProfileForm";

const connectionLabels = {
  configuration_missing: "Connector IDが未設定です。",
  configuration_invalid: "Connector IDの形式を確認してください。",
  connection_unconfirmed: "接続は未確認です。",
  connected: "接続を確認しました。",
  unavailable: "接続状態を確認できませんでした。",
};

const badgeVariantFor = (state) =>
  state === "connected" ? "default" : state === "unavailable" ? "destructive" : "secondary";

export default function SettingsPage({ data }) {
  const { profile, connection } = data;
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">連携設定</h1>
        <p className="text-sm text-muted-foreground">
          Google Calendar接続と、UserProfileに紐づく設定を管理します。
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Google Calendar接続</CardTitle>
          <CardDescription>
            アプリに登録済みのApp user connector（APIコネクタID）と、このアカウントの接続状態です。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={badgeVariantFor(connection.state)}>
              {connectionLabels[connection.state] ?? connection.state}
            </Badge>
            {profile?.google_status && (
              <Badge variant="outline">
                プロフィール: {profile.google_status}
              </Badge>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">APIコネクタID</p>
            <p className="font-mono text-sm">
              {connection.connectorId ?? "（未設定）"}
            </p>
            <p className="text-xs text-muted-foreground">
              コネクタIDはBase44の連携設定（Secrets）で管理されます。この画面では確認のみ行えます。
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">接続参照（google_connection_ref）</p>
            <p className="font-mono text-sm">
              {profile?.google_connection_ref ?? "—"}
            </p>
          </div>
        </CardContent>
      </Card>
      <ProfileForm profile={profile} />
    </>
  );
}