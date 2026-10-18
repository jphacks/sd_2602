import { Link } from "@tanstack/react-router";
import "./personal.css";

export function PersonalLayout({ children }) {
  return (
    <div className="personal-shell">
      <header className="personal-header">
        <h1>りすけ</h1>
        <p>操作の手間を極限まで減らした日程調整ツール</p>
        <div className="demo-status">
          テストデータを表示中・Google未連携 <span aria-hidden="true">｜</span>{" "}
          <Link to="/me/connections">データ連携・今後の開発予定</Link>{" "}
          <span aria-hidden="true">｜</span> <Link to="/me">個人ページ</Link>
        </div>
      </header>
      <main className="personal-main">{children}</main>
    </div>
  );
}
