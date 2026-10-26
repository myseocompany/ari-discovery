# ARI Discovery

Harness multi-cliente para convertir un brief en un diagnóstico estratégico basado en evidencia. Separa el método reutilizable del estado, archivos y entregables de cada cliente.

## Flujo

```text
Brief aprobado
  -> 1. Sector
  -> 2. Mercado
  -> 3. Problema
  -> 4. Negocio y evidencia
  -> 5. Revisión crítica
  -> 6. Acciones y medición
```

Cada etapa produce `artifact.json` y `artifact.md`. El JSON es la fuente de verdad; Markdown es la vista para revisión humana. Una etapa no se abre hasta aprobar la anterior.

## Aislamiento

```text
workspaces/<client_id>/
  client.json
  engagements/<engagement_id>/
    engagement.json
    brief.json
    inputs/
    stages/01-sector/
      artifact.json
      artifact.md
```

`workspaces/` está excluido de Git. En producción debe sustituirse por almacenamiento persistente con aislamiento por tenant.

## Uso

```bash
npm test
node src/cli.js init-client cafe-luna "Café Luna"
node src/cli.js init-engagement cafe-luna weekdays "Mejorar ventas lunes y martes"
node src/cli.js status cafe-luna weekdays
```

Edita `brief.json`, completa sus campos y luego:

```bash
node src/cli.js approve cafe-luna weekdays brief
node src/cli.js start cafe-luna weekdays 1
# Completa stages/01-sector/artifact.json y artifact.md
node src/cli.js approve cafe-luna weekdays 1
```

Todos los comandos aceptan `--root <directorio>` para tests o almacenamiento alternativo.

## Integración futura con un modelo

El prompt en `prompts/agent.md` define el comportamiento común. La aplicación debe entregar al modelo únicamente el brief y artefactos del engagement activo, exigir salida estructurada y guardar el resultado antes de solicitar aprobación humana.

