import { Link } from "@tanstack/react-router";
import "./personal.css";
import "./responsive.css";
export function PersonalLayout({ children, demo = true }) {
  return (
    <div className="personal-shell">
      <header className="personal-header">
        <div className="brand-row">
          <h1>りすけ</h1>
        </div>
        <nav className="mode-switch" aria-label="調整モード">
          <Link
            to={demo ? "/me" : "/account"}
            activeOptions={{ exact: true }}
            activeProps={{ "aria-current": "page" }}
          >
            {demo ? "自分だけ（テスト）" : "自分の予定"}
          </Link>
          <Link to="/me/pair" activeProps={{ "aria-current": "page" }}>
            相手と調整（テスト）
          </Link>
        </nav>
        <Link
          className="header-connection"
          to={demo ? "/me/connections" : "/account"}
          aria-label={
            demo ? "データ連携（テストデータを表示中）" : "本人のデータ連携"
          }
        >
          連携 <small>{demo ? "テスト" : "本人用"}</small>
        </Link>
      </header>
      <main className="personal-main">{children}</main>
    </div>
  );
}
