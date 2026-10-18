import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PersonalLayout } from "@/components/personal/PersonalLayout";

export const Route = createFileRoute("/me")({
  component: () => (
    <PersonalLayout>
      <Outlet />
    </PersonalLayout>
  ),
});
