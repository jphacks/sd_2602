import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthGateError, requireSignedIn } from "@/components/auth/AuthGate";
import { PersonalLayout } from "@/components/personal/PersonalLayout";
export const Route = createFileRoute("/_authed")({
  ssr: false,
  beforeLoad: requireSignedIn,
  errorComponent: AuthGateError,
  component: () => (
    <PersonalLayout>
      <Outlet />
    </PersonalLayout>
  ),
});