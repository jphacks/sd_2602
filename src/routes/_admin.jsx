import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthGateError, requireSignedIn } from "@/components/auth/AuthGate";
import AdminNav from "@/components/admin/AdminNav";

export const Route = createFileRoute("/_admin")({
  ssr: false,
  beforeLoad: requireSignedIn,
  errorComponent: AuthGateError,
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <AdminNav />
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}