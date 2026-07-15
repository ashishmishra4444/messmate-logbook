import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/procurement-pos")({
  component: () => <Outlet />,
});
