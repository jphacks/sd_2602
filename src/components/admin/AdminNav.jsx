import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
} from "lucide-react";

const links = [
  { to: "/dashboard", label: "同期ダッシュボード", icon: LayoutDashboard },
  { to: "/calendar-sources", label: "カレンダーソース", icon: CalendarDays },
  { to: "/adjustments", label: "調整ルール", icon: SlidersHorizontal },
  { to: "/settings", label: "連携設定", icon: Settings },
];

export default function AdminNav() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-3">
        <Link to="/" className="shrink-0 font-semibold tracking-tight">
          りすけ <span className="text-muted-foreground">管理</span>
        </Link>
        <nav
          className="flex flex-1 items-center gap-1 overflow-x-auto"
          aria-label="管理メニュー"
        >
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeProps={{
                className:
                  "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm bg-accent text-accent-foreground font-medium",
              }}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <Link
          to="/account"
          className="shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          本人ページ
        </Link>
      </div>
    </header>
  );
}