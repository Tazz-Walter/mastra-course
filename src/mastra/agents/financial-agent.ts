import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { Memory } from "@mastra/memory";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { MCPClient } from "@mastra/mcp";
import { createSmitheryUrl } from "@smithery/sdk";
import { getTransactionsTool } from "../tools/get-transactions-tool";
import path from "path";

const zapierMcpUrl = process.env.ZAPIER_MCP_URL || "https://mcp.zapier.com/api/mcp/mcp";
const zapierMcpToken = process.env.ZAPIER_MCP_API_KEY || process.env.ZAPIER_MCP_TOKEN;

const smitheryApiKey = process.env.SMITHERY_API_KEY;
const smitheryProfile = process.env.SMITHERY_PROFILE;
const smitheryGithubUrlEnv = process.env.SMITHERY_GITHUB_MCP_URL;

// const smitheryGithubMcpUrl =
//   smitheryGithubUrlEnv ||
//   (smitheryApiKey && smitheryProfile
//     ? `https://server.smithery.ai/github/mcp?api_key=${encodeURIComponent(
//         smitheryApiKey,
//       )}&profile=${encodeURIComponent(smitheryProfile)}`
//     : null);

const mcpServers: Record<string, any> = {};

if (zapierMcpToken) {
  mcpServers.zapier = {
    url: new URL(zapierMcpUrl),
    // Zapier MCP requiere Bearer token para autenticarse
    requestInit: {
      headers: {
        Authorization: `Bearer ${zapierMcpToken}`,
      },
    },
  };
}

// if (smitheryGithubMcpUrl) {
//   mcpServers.github = {
//     url: new URL(smitheryGithubMcpUrl),
//     ...(smitheryApiKey && {
//       requestInit: {
//         headers: {
//           Authorization: `Bearer ${smitheryApiKey}`,
//         },
//       },
//     }),
//   };
// }

// Hacker News MCP server (corre localmente con npx)
mcpServers.hackernews = {
  command: "npx",
  args: ["-y", "@devabdultech/hn-mcp-server"],
};

// Filesystem MCP server (editor de texto para leer/escribir archivos locales)
mcpServers.textEditor = {
  command: "npx",
  args: [
    "@modelcontextprotocol/server-filesystem",
    path.join(process.cwd(), "..", "..", "notes"), // relativo al directorio output
  ],
};

const mcp = new MCPClient({
  servers: mcpServers,
});

const mcpTools = await mcp.getTools();

export const financialAgent = new Agent({
  name: "Financial Assistant Agent",
  description: "Financial assistant that analyzes transactions, manages emails via Gmail, monitors GitHub activity, and tracks tech news",
  instructions: `ROLE DEFINITION
- You are a financial assistant that helps users analyze their transaction data.
- Your key responsibility is to provide insights about financial transactions.
- Primary stakeholders are individual users seeking to understand their spending.

CORE CAPABILITIES
- Analyze transaction data to identify spending patterns.
- Answer questions about specific transactions or vendors.
- Provide basic summaries of spending by category or time period.

BEHAVIORAL GUIDELINES
- Maintain a professional and friendly communication style.
- Keep responses concise but informative.
- Always clarify if you need more information to answer a question.
- Format currency values appropriately.
- Ensure user privacy and data security.

CONSTRAINTS & BOUNDARIES
- Do not provide financial investment advice.
- Avoid discussing topics outside of the transaction data provided.
- Never make assumptions about the user's financial situation beyond what's in the data.

SUCCESS CRITERIA
- Deliver accurate and helpful analysis of transaction data.
- Achieve high user satisfaction through clear and helpful responses.
- Maintain user trust by ensuring data privacy and security.

TOOLS
- Use the getTransactions tool to fetch financial transaction data.
- Analyze the transaction data to answer user questions about their spending.

ZAPIER TOOLS (GMAIL EXAMPLE)
- Use Gmail tools to leer, encontrar, resumir, priorizar y categorizar correos.
- Usa Gmail para enviar, y contestar emails, responder a los emails.
- Identifica items accionables y prioridades en los emails.
- Puedes enviar correos cuando el usuario lo solicite.
- Mantén respuestas concisas y profesionales.

GITHUB TOOLS
- Usa estas herramientas para monitorear y resumir actividad de repositorios GitHub.
- Puedes revisar commits recientes, pull requests, issues y patrones de desarrollo.
- Ayuda a mantener seguimiento de la actividad del proyecto sin revisar GitHub manualmente.
- Resume cambios importantes y detecta tendencias en el desarrollo.

HACKER NEWS TOOLS
- Usa estas herramientas para buscar y recuperar historias de Hacker News.
- Puedes obtener las historias principales (top stories) o buscar historias específicas.
- Puedes recuperar comentarios de las historias para entender discusiones.
- Mantente actualizado con tendencias y noticias tech relevantes.

FILESYSTEM TOOLS
- Tienes acceso de lectura/escritura a un directorio de notas.
- Úsalo para almacenar información para uso posterior u organizar datos para el usuario.
- Puedes mantener listas de to-do y notas persistentes entre sesiones.
- Directorio de notas: ${path.join(process.cwd(), "..", "..", "notes")}

MEMORIA Y PERSONALIZACIÓN
- Tienes acceso a memoria de conversación y puedes recordar detalles sobre los usuarios.
- Cuando aprendas algo sobre un usuario, actualiza su working memory usando la herramienta apropiada.
- Esto incluye: intereses, preferencias, estilo de conversación (formal, casual), y otra información relevante.
- Usa la información almacenada para proporcionar respuestas más personalizadas.
- Mantén siempre un tono profesional y útil.`,
  model: openai("gpt-4o"),
  tools: { ...mcpTools, getTransactionsTool },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../../memory.db",
    }),
    vector: new LibSQLVector({
      connectionUrl: "file:../../memory.db",
    }),
    embedder: openai.embedding("text-embedding-3-small"),
    options: {
      // Mantiene los últimos 20 mensajes en contexto
      lastMessages: 20,
      // Habilita búsqueda semántica para encontrar conversaciones pasadas relevantes
      semanticRecall: {
        topK: 3,
        messageRange: {
          before: 2,
          after: 1,
        },
      },
      // Habilita working memory para recordar información del usuario
      workingMemory: {
        enabled: true,
        template: `
        <user>
          <first_name></first_name>
          <username></username>
          <preferences></preferences>
          <interests></interests>
          <conversation_style></conversation_style>
        </user>`,
      },
    },
  }),
});

