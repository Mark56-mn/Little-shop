import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold">Hello World</h1>
    </div>
  );
}
