import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import {
  STAGES,
  artifactTemplate,
  assertId,
  briefTemplate,
  stageByNumber,
  stageDirectory,
  validateArtifactForApproval,
  validateBriefForApproval
} from "./domain.js";

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

async function mustNotExist(target, label) {
  try {
    await access(target);
    throw new Error(`${label} ya existe`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

export function paths(root, clientId, engagementId) {
  const client = path.join(root, clientId);
  const engagement = engagementId
    ? path.join(client, "engagements", engagementId)
    : null;
  return {
    client,
    clientFile: path.join(client, "client.json"),
    engagement,
    engagementFile: engagement && path.join(engagement, "engagement.json"),
    briefFile: engagement && path.join(engagement, "brief.json"),
    inputs: engagement && path.join(engagement, "inputs"),
    stages: engagement && path.join(engagement, "stages")
  };
}

export async function initClient(root, clientId, name) {
  assertId(clientId, "client_id");
  if (!name?.trim()) throw new Error("El nombre del cliente es obligatorio");
  const p = paths(root, clientId);
  await mustNotExist(p.clientFile, "El cliente");
  await mkdir(path.join(p.client, "engagements"), { recursive: true });
  await writeFile(p.clientFile, json({ client_id: clientId, name, created_at: new Date().toISOString() }));
  return p.clientFile;
}

export async function initEngagement(root, clientId, engagementId, title) {
  assertId(clientId, "client_id");
  assertId(engagementId, "engagement_id");
  const p = paths(root, clientId, engagementId);
  await access(p.clientFile);
  await mustNotExist(p.engagementFile, "El engagement");
  await mkdir(p.inputs, { recursive: true });
  await mkdir(p.stages, { recursive: true });
  await writeFile(p.engagementFile, json({
    client_id: clientId,
    engagement_id: engagementId,
    title: title?.trim() || engagementId,
    method_version: "1.0.0",
    current_stage: 0,
    status: "briefing",
    created_at: new Date().toISOString()
  }));
  await writeFile(p.briefFile, json(briefTemplate(clientId, engagementId)));
  return p.engagement;
}

export async function startStage(root, clientId, engagementId, number) {
  const p = paths(root, clientId, engagementId);
  const engagement = await readJson(p.engagementFile);
  const brief = await readJson(p.briefFile);
  const stage = stageByNumber(number);
  if (brief.status !== "approved") throw new Error("Aprueba el brief antes de iniciar una etapa");
  if (stage.number !== engagement.current_stage + 1) {
    throw new Error(`La siguiente etapa permitida es ${engagement.current_stage + 1}`);
  }
  const directory = path.join(p.stages, stageDirectory(stage));
  await mustNotExist(directory, "La etapa");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "artifact.json"), json(artifactTemplate(clientId, engagementId, stage)));
  await writeFile(path.join(directory, "artifact.md"), `# ${stage.number}. ${stage.title}\n\nEstado: borrador\n`);
  engagement.status = "in_progress";
  engagement.active_stage = stage.number;
  await writeFile(p.engagementFile, json(engagement));
  return directory;
}

export async function approve(root, clientId, engagementId, target) {
  const p = paths(root, clientId, engagementId);
  const engagement = await readJson(p.engagementFile);
  const now = new Date().toISOString();
  if (target === "brief") {
    const brief = await readJson(p.briefFile);
    validateBriefForApproval(brief);
    brief.status = "approved";
    brief.approved_at = now;
    engagement.status = "ready";
    await writeFile(p.briefFile, json(brief));
    await writeFile(p.engagementFile, json(engagement));
    return p.briefFile;
  }
  const stage = stageByNumber(target);
  if (engagement.active_stage !== stage.number) throw new Error("La etapa no está activa");
  const file = path.join(p.stages, stageDirectory(stage), "artifact.json");
  const artifact = await readJson(file);
  validateArtifactForApproval(artifact);
  artifact.status = "approved";
  artifact.approved_at = now;
  engagement.current_stage = stage.number;
  delete engagement.active_stage;
  engagement.status = stage.number === STAGES.length ? "completed" : "ready";
  await writeFile(file, json(artifact));
  await writeFile(p.engagementFile, json(engagement));
  return file;
}

export async function status(root, clientId, engagementId) {
  const p = paths(root, clientId, engagementId);
  return {
    engagement: await readJson(p.engagementFile),
    brief: await readJson(p.briefFile)
  };
}
