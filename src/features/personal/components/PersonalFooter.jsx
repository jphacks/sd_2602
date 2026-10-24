import { Link } from "@tanstack/react-router";

// すべてのページへのリンクをまとめたフッター。項目の追加・削除はここだけで全ページに反映されます。
const pages = [
  { to: "/", label: "ホーム" },
  { to: "/account", label: "Google連携・本人ページ" },
  { to: "/me", label: "個人ページ（テストデータ）" },
  { to: "/me/pair", label: "2人リスケ（テストデータ）" },
  { to: "/me/preview", label: "連携プレビュー" },
  { to: "/me/connections", label: "データ連携" },
  { to: "/dashboard", label: "管理画面" },
];

export function PersonalFooter() {
  return (
    <footer className="personal-footer" aria-label="ページリンク">
      {pages.map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          activeProps={{ "aria-current": "page" }}
        >
          {label}
        </Link>
      ))}
    </footer>
  );
}