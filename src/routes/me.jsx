import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PersonalLayout } from "@/features/personal/components/PersonalLayout";

export const Route = createFileRoute("/me")({
  component: () => (
    <PersonalLayout>
      <Outlet />
    </PersonalLayout>
  ),
});
