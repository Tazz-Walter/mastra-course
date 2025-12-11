import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { MCPClient } from "@mastra/mcp";
import { weatherTool } from "../tools/weather-tool";
import { saveEmailFeedbackTool } from "../tools/save-email-feedback";

const zapierMcpUrl = process.env.ZAPIER_MCP_URL;
const zapierMcpToken = process.env.ZAPIER_MCP_API_KEY || process.env.ZAPIER_MCP_TOKEN;

const githubMcpUrl =
  process.env.SMITHERY_GITHUB_MCP_URL ||
  (process.env.SMITHERY_API_KEY && process.env.SMITHERY_PROFILE
    ? `https://server.smithery.ai/github/mcp?api_key=${encodeURIComponent(
        process.env.SMITHERY_API_KEY,
      )}&profile=${encodeURIComponent(process.env.SMITHERY_PROFILE)}`
    : null);

const mcpServers: Record<string, any> = {};

if (zapierMcpUrl && zapierMcpToken) {
  mcpServers.zapier = {
    url: new URL(zapierMcpUrl),
    requestInit: {
      headers: {
        Authorization: `Bearer ${zapierMcpToken}`,
      },
    },
  };
}

if (githubMcpUrl) {
  mcpServers.github = {
    url: new URL(githubMcpUrl),
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
  embedder: openai.embedding("text-embedding-3-small"),
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
            <email></email>
            <org></org>
            <preferences></preferences>
            <tone>cálido y profesional</tone>
            <notes></notes>
            <email_prefs>
                <signoff></signoff>
                <formality>auto</formality>
                <languages>es</languages>
                <avoid_phrases></avoid_phrases>
            </email_prefs>
            <recent_examples></recent_examples>
            </user>`,
    },
  },
});

export const wallyAgent = new Agent({
  name: "Wally Agent",
  description: "Asistente personal que puede enviar correos, revisar GitHub y añadir clima.",
  instructions: `
Eres un asistente personal de Wally.
- Puedes enviar y preparar correos vía las herramientas de Gmail (Zapier).
- Puedes revisar repositorios con estrellas en GitHub mediante las herramientas disponibles.
- Puedes obtener clima actual usando la herramienta de weather y adjuntarlo en correos si se pide.
- Usa las herramientas de Hacker News para buscar y recuperar historias, obtener top stories y comentarios, y mantenerte al día con tendencias tech.
- Después de enviar o preparar un correo, guarda feedback (puntaje, comentario, cuerpo) con la tool save-email-feedback cuando el usuario lo proporcione, para mejorar futuras respuestas.
- Usa la working memory para recordar nombres, correos, preferencias y contexto del destinatario.
- Confirma antes de enviar correos reales si falta información clave (destinatario, asunto, mensaje).
- Mantén un tono profesional, conciso y amable.
`,
  model: openai("gpt-4o"),
  tools: {
    ...mcpTools,
    weatherTool,
    saveEmailFeedbackTool,
  },
  memory,
});

