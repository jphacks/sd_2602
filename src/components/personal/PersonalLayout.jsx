import { Link } from "@tanstack/react-router";
import "./personal.css";
import "./responsive.css";
export function PersonalLayout({ children }) {
  return (
    <div className="personal-shell">
      <header className="personal-header">
        <div className="brand-row">
          <h1>りすけ</h1>
        </div>
        <nav className="mode-switch" aria-label="調整モード">
          <Link
            to="/me"
            activeOptions={{ exact: true }}
            activeProps={{ "aria-current": "page" }}
          >
            自分だけ
          </Link>
          <Link to="/me/pair" activeProps={{ "aria-current": "page" }}>
            相手と調整
          </Link>
        </nav>
        <Link
          className="header-connection"
          to="/me/connections"
          aria-label="データ連携（テストデータを表示中）"
        >
          連携 <small>テスト</small>
        </Link>
      </header>
      <main className="personal-main">{children}</main>
    </div>
  );
}
