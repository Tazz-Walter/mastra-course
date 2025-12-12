import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { MCPClient } from "@mastra/mcp";
import { weatherTool } from "../tools/weather-tool";
import { saveEmailFeedbackTool } from "../tools/save-email-feedback";

const zapierMcpUrl = process.env.ZAPIER_MCP_URL;
const zapierMcpToken = process.env.ZAPIER_MCP_API_KEY || process.env.ZAPIER_MCP_TOKEN;
const githubPat = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

const mcpServers: Record<string, any> = {};

// Zapier MCP para Gmail y otras integraciones
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

// GitHub MCP Server oficial 
if (githubPat) {
  mcpServers.github = {
    url: new URL("https://api.githubcopilot.com/mcp/"),
    requestInit: {
      headers: {
        Authorization: `Bearer ${githubPat}`,
      },
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
      
      CORREO:
      - Puedes enviar y preparar correos vía las herramientas de Gmail (Zapier).
      - Confirma antes de enviar correos reales si falta información clave (destinatario, asunto, mensaje).
      - Después de enviar un correo, guarda feedback (puntaje, comentario, cuerpo) con la tool save-email-feedback cuando el usuario lo proporcione.
      
      GITHUB:
      - Tienes acceso completo al GitHub MCP Server oficial con 142+ herramientas.
      - Puedes: buscar repos, listar archivos, leer código, gestionar issues/PRs, crear branches, hacer commits, revisar CI/CD, analizar security advisories, listar repos con estrellas, etc.
      - Siempre confirma el nombre del repositorio y owner con el usuario antes de hacer operaciones de escritura.
      
      CLIMA Y ACTIVIDADES:
      - Puedes obtener clima actual usando weatherTool y adjuntarlo en correos.
      - Cuando consultes clima, sugiere actividades apropiadas según las condiciones (soleado → aire libre, lluvia → bajo techo, etc.).
      
      HACKER NEWS:
      - Usa las herramientas para buscar historias, obtener top stories y comentarios, mantenerte al día con tendencias tech.
      
      MEMORIA:
      - Tienes acceso a working memory para recordar info del usuario (nombres, correos, preferencias).
      - IMPORTANTE: Solo llama updateWorkingMemory cuando el usuario EXPLÍCITAMENTE pida guardar info personal ("recuerda que...", "guarda que..."). NO automáticamente.
      
      - Mantén un tono profesional, conciso y amable.
`,
  model: google("gemini-2.5-flash-lite"),
  tools: {
    ...mcpTools,
    weatherTool,
    saveEmailFeedbackTool,
  },
  memory,
});

