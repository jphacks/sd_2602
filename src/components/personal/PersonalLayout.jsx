import { Link } from "@tanstack/react-router";
import { PersonalFooter } from "@/components/personal/PersonalFooter";
import "./personal.css";
import "./responsive.css";

// ヘッダーのメニュー。項目の追加・削除はここだけで全ページに反映されます。
const menu = [{ to: "/dashboard", label: "管理画面" }];

export function PersonalLayout({ children }) {
  return (
    <div className="personal-shell">
      <header className="personal-header">
        <div className="brand-row">
          <h1>りすけ</h1>
        </div>
        <nav className="mode-switch" aria-label="メインメニュー">
          {menu.map(({ to, label }) => (
            <Link key={to} to={to} activeProps={{ "aria-current": "page" }}>
              {label}
            </Link>
          ))}
        </nav>
        <Link
          className="header-connection"
          to="/account"
          aria-label="Google連携と本人の予定を開く"
        >
          連携
        </Link>
      </header>
      <main className="personal-main">{children}</main>
      <PersonalFooter />
    </div>
  );
}