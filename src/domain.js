export const STAGES = Object.freeze([
  { number: 1, slug: "sector", title: "Sector" },
  { number: 2, slug: "market", title: "Mercado" },
  { number: 3, slug: "problem", title: "Problema" },
  { number: 4, slug: "business", title: "Negocio y evidencia" },
  { number: 5, slug: "review", title: "Revisión crítica" },
  { number: 6, slug: "action", title: "Acciones y medición" }
]);

export function assertId(value, label) {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(value ?? "")) {
    throw new Error(`${label} debe usar minúsculas, números, guion o guion bajo`);
  }
}

export function stageByNumber(value) {
  const stage = STAGES.find((item) => item.number === Number(value));
  if (!stage) throw new Error("La etapa debe estar entre 1 y 6");
  return stage;
}

export function stageDirectory(stage) {
  return `${String(stage.number).padStart(2, "0")}-${stage.slug}`;
}

export function briefTemplate(clientId, engagementId) {
  return {
    contract_version: "1.0.0",
    client_id: clientId,
    engagement_id: engagementId,
    status: "draft",
    objective: "",
    decision_to_make: "",
    scope: { included: [], excluded: [] },
    success_criteria: [],
    constraints: [],
    available_evidence: [],
    missing_information: [],
    ambiguities: [],
    approved_at: null
  };
}

export function artifactTemplate(clientId, engagementId, stage) {
  return {
    contract_version: "1.0.0",
    client_id: clientId,
    engagement_id: engagementId,
    stage: stage.number,
    stage_name: stage.title,
    status: "draft",
    facts: [],
    inferences: [],
    assumptions: [],
    contradictions: [],
    missing_information: [],
    conclusions: [],
    sources: [],
    change_requests: [],
    approved_at: null
  };
}

export function validateBriefForApproval(brief) {
  const missing = [];
  if (!brief.objective?.trim()) missing.push("objective");
  if (!brief.decision_to_make?.trim()) missing.push("decision_to_make");
  if (!brief.scope?.included?.length) missing.push("scope.included");
  if (!brief.success_criteria?.length) missing.push("success_criteria");
  if (missing.length) throw new Error(`Brief incompleto: ${missing.join(", ")}`);
}

export function validateArtifactForApproval(artifact) {
  if (!["pending_approval", "needs_input"].includes(artifact.status)) {
    throw new Error("El entregable debe estar en pending_approval o needs_input antes de revisión");
  }
  if (artifact.status === "needs_input") {
    throw new Error("No se puede aprobar mientras el entregable necesite información");
  }
  if (!artifact.conclusions.length) throw new Error("El entregable necesita al menos una conclusión");
}
