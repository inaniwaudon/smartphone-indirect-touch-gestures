import { createRootRoute, Outlet } from "@tanstack/react-router";

import Main from "@/components/Main";

const RootComponent = () => {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") === "mirror" ? "mirror" : "operation";
  const port = params.get("port") ?? "8765";

  return (
    <Main mode={mode} port={port}>
      <Outlet />
    </Main>
  );
};

export const Route = createRootRoute({
  component: RootComponent,
});
