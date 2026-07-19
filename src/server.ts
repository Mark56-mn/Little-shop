import { createRequestHandler } from "@tanstack/react-start/server";
import { startInstance } from "./start";

const handler = createRequestHandler({
  createRouter: () => startInstance.createRouter(),
});

export default handler;
