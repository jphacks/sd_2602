import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { shortId } from "@/lib/admin/format";
import RunHistory from "@/components/admin/RunHistory";

const states = [
  { key: "queued", label: "待機中" },
  { key: "running", label: "実行中" },
  { key: "succeeded", label: "成功" },
  { key: "failed", label: "失敗" },
  { key: "superseded", label: "置き換え" },
  { key: "ignored", label: "スキップ" },
];

const candidateLabels = {
  valid: "有効",
  empty: "空",
  invalid: "無効",
};

const googleLabels = {
  unlinked: "未連携",
  linked: "連携済み",
  auth_required: "要再認可",
};

export default function DashboardPage({ data }) {
  const { profile, stateCounts, runs } = data;
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          同期ダッシュボード
        </h1>
        <p className="text-sm text-muted-foreground">
          現在の同期状態とOperationRunの実行履歴を確認できます。
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>現在の同期状態</CardTitle>
          <CardDescription>
            {profile
              ? "UserProfileに保存されている最新の同期状態です。"
              : "UserProfileが未作成です。連携設定ページで作成できます。"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile ? (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">現在のラン</dt>
                <dd className="font-mono text-sm">
                  {shortId(profile.current_run_id)}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">候補の状態</dt>
                <dd>
                  <Badge variant="outline">
                    {candidateLabels[profile.candidate_state] ?? "未設定"}
                  </Badge>
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">Google連携</dt>
                <dd>
                  <Badge variant="secondary">
                    {googleLabels[profile.google_status] ?? "未設定"}
                  </Badge>
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">設定バージョン</dt>
                <dd className="font-mono text-sm">
                  {shortId(profile.settings_version)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              まだ同期が実行されていません。
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>実行状態の内訳</CardTitle>
          <CardDescription>OperationRunの状態ごとの件数です。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {states.map(({ key, label }) => (
              <div
                key={key}
                className="rounded-lg border p-3 text-center space-y-1"
              >
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold tabular-nums">
                  {stateCounts[key] ?? 0}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <RunHistory runs={runs} />
    </>
  );
}