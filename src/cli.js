#!/usr/bin/env node
import path from "node:path";
import { approve, initClient, initEngagement, startStage, status } from "./workspace.js";

function usage() {
  return `ARI Discovery

Comandos:
  init-client <client_id> <nombre> [--root dir]
  init-engagement <client_id> <engagement_id> <titulo> [--root dir]
  status <client_id> <engagement_id> [--root dir]
  approve <client_id> <engagement_id> <brief|1..6> [--root dir]
  start <client_id> <engagement_id> <1..6> [--root dir]`;
}

const argv = process.argv.slice(2);
const rootIndex = argv.indexOf("--root");
const root = path.resolve(rootIndex >= 0 ? argv[rootIndex + 1] : "workspaces");
if (rootIndex >= 0) argv.splice(rootIndex, 2);
const [command, ...args] = argv;

try {
  let result;
  if (command === "init-client") result = await initClient(root, args[0], args[1]);
  else if (command === "init-engagement") result = await initEngagement(root, args[0], args[1], args[2]);
  else if (command === "start") result = await startStage(root, args[0], args[1], args[2]);
  else if (command === "approve") result = await approve(root, args[0], args[1], args[2]);
  else if (command === "status") result = await status(root, args[0], args[1]);
  else throw new Error(usage());
  console.log(typeof result === "string" ? result : JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
