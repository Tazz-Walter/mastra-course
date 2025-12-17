import { google } from "@ai-sdk/google";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { MCPClient } from "@mastra/mcp";

const supabaseAccessToken = process.env.SUPABASE_ACCESS_TOKEN;
const supabaseProjectRef = process.env.SUPABASE_PROJECT_REF;

const mcpServers: Record<string, any> = {};

// Supabase MCP Server (local npx process)
if (supabaseAccessToken && supabaseProjectRef) {
  mcpServers.supabase = {
    command: "npx",
    args: [
      "-y",
      "@supabase/mcp-server-supabase@latest",
      "--read-only",
      `--project-ref=${supabaseProjectRef}`,
    ],
    env: {
      SUPABASE_ACCESS_TOKEN: supabaseAccessToken,
    },
  };
}

const mcp = new MCPClient({
  servers: mcpServers,
});

const mcpTools = await mcp.getTools();

const memory = new Memory({
  storage: new LibSQLStore({
    url: "file:../../memory.db",
  }),
  vector: new LibSQLVector({
    connectionUrl: "file:../../memory.db",
  }),
  embedder: google.textEmbeddingModel("text-embedding-004"),
  options: {
    lastMessages: 20,
    semanticRecall: {
      topK: 3,
      messageRange: {
        before: 2,
        after: 1,
      },
    },
    workingMemory: {
      enabled: true,
      template: `
            <user>
            <name></name>
            <project_context></project_context>
            <database_schema></database_schema>
            <preferences></preferences>
            <recent_queries></recent_queries>
            </user>`,
    },
  },
});

export const supabaseAgent = new Agent({
  name: "Supabase Expert Agent",
  description: "Experto en bases de datos y Supabase, especializado en queries, schemas, RLS y optimización",
  instructions: `
      Eres un experto senior en bases de datos PostgreSQL y Supabase.
      
      CAPACIDADES PRINCIPALES:
      - Diseño y optimización de schemas de base de datos
      - Escritura de queries SQL complejas y eficientes
      - Configuración de Row Level Security (RLS) policies
      - Implementación de funciones y triggers PostgreSQL
      - Análisis de performance y optimización de queries
      - Migraciones de bases de datos
      - Gestión de índices y claves foráneas
      - Best practices de seguridad en Supabase
      
      SUPABASE ESPECÍFICO:
      - Storage: Manejo de archivos y buckets
      - Auth: Configuración de autenticación y autorización
      - Edge Functions: Desarrollo de funciones serverless
      - Realtime: Configuración de suscripciones en tiempo real
      - APIs auto-generadas: REST y GraphQL
      
      ENFOQUE:
      - Siempre pregunta por el contexto del proyecto antes de sugerir soluciones
      - Proporciona código SQL limpio, comentado y optimizado
      - Explica las decisiones de diseño y trade-offs
      - Sugiere índices apropiados para mejorar performance
      - Implementa RLS policies seguras por defecto
      - Valida la seguridad de las queries antes de ejecutar
      - Usa transacciones cuando sea necesario
      
      SEGURIDAD:
      - IMPORTANTE: Antes de ejecutar queries de escritura (INSERT, UPDATE, DELETE), confirma con el usuario
      - Antes de modificar schemas (ALTER, DROP), SIEMPRE pide confirmación explícita
      - Explica los riesgos de operaciones destructivas
      - Sugiere backups antes de cambios importantes
      
      MEJORES PRÁCTICAS:
      - Usa prepared statements para prevenir SQL injection
      - Implementa políticas RLS granulares
      - Optimiza con EXPLAIN ANALYZE cuando sea relevante
      - Sugiere índices parciales cuando sea apropiado
      - Documenta el código SQL generado
      
      - Mantén un tono profesional, técnico pero accesible.
      - Si no estás seguro de algo, di "necesito más contexto sobre X" en vez de adivinar.
`,
  model: google("gemini-2.5-flash-lite"),
  tools: {
    ...mcpTools,
  },
  memory,
});

