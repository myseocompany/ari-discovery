import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { approve, initClient, initEngagement, paths, startStage, status } from "../src/workspace.js";

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const writeJson = async (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ari-discovery-"));
  await initClient(root, "cafe_luna", "Café Luna");
  await initEngagement(root, "cafe_luna", "weekdays", "Ventas entre semana");
  return { root, p: paths(root, "cafe_luna", "weekdays") };
}

test("mantiene espacios separados por cliente", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ari-discovery-"));
  await initClient(root, "cliente_a", "Cliente A");
  await initClient(root, "cliente_b", "Cliente B");
  assert.notEqual(paths(root, "cliente_a").client, paths(root, "cliente_b").client);
});

test("no inicia etapas antes de aprobar un brief completo", async () => {
  const { root } = await fixture();
  await assert.rejects(startStage(root, "cafe_luna", "weekdays", 1), /Aprueba el brief/);
  await assert.rejects(approve(root, "cafe_luna", "weekdays", "brief"), /Brief incompleto/);
});

test("obliga a avanzar y aprobar las etapas en orden", async () => {
  const { root, p } = await fixture();
  const brief = await readJson(p.briefFile);
  brief.objective = "Mejorar las ventas de lunes y martes";
  brief.decision_to_make = "Elegir qué experimento comercial ejecutar";
  brief.scope.included.push("Sede principal, lunes y martes");
  brief.success_criteria.push("Incrementar margen de contribución semanal");
  await writeJson(p.briefFile, brief);
  await approve(root, "cafe_luna", "weekdays", "brief");
  await assert.rejects(startStage(root, "cafe_luna", "weekdays", 2), /siguiente etapa/);
  const directory = await startStage(root, "cafe_luna", "weekdays", 1);
  const artifactFile = path.join(directory, "artifact.json");
  const artifact = await readJson(artifactFile);
  artifact.status = "pending_approval";
  artifact.conclusions.push("El sector presenta demanda concentrada por ocasión de consumo");
  await writeJson(artifactFile, artifact);
  await approve(root, "cafe_luna", "weekdays", 1);
  const snapshot = await status(root, "cafe_luna", "weekdays");
  assert.equal(snapshot.engagement.current_stage, 1);
  assert.equal(snapshot.engagement.status, "ready");
});

test("no permite aprobar un entregable que todavía necesita datos", async () => {
  const { root, p } = await fixture();
  const brief = await readJson(p.briefFile);
  brief.objective = "Entender la caída";
  brief.decision_to_make = "Definir siguiente análisis";
  brief.scope.included.push("Ventas entre semana");
  brief.success_criteria.push("Problema cuantificado");
  await writeJson(p.briefFile, brief);
  await approve(root, "cafe_luna", "weekdays", "brief");
  const directory = await startStage(root, "cafe_luna", "weekdays", 1);
  const file = path.join(directory, "artifact.json");
  const artifact = await readJson(file);
  artifact.status = "needs_input";
  artifact.missing_information.push("Datos de tráfico");
  await writeJson(file, artifact);
  await assert.rejects(approve(root, "cafe_luna", "weekdays", 1), /necesite información/);
});
