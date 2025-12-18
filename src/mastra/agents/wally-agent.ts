import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { MCPClient } from "@mastra/mcp";
import { weatherTool } from "../tools/weather-tool";
import { saveEmailFeedbackTool } from "../tools/save-email-feedback";
import { wallyScorers } from "../scorers/wally-scorer";
import { balancedFallbackChain } from "../utils/model-with-fallback";

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
    lastMessages: 5, // Reducido de 20 para evitar exceder TPM en Groq
    semanticRecall: {
      topK: 1, // Reducido de 3 para menor contexto
      messageRange: {
        before: 1, // Reducido de 2
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
      - **FORMATO PROFESIONAL OBLIGATORIO**:
        * Usa saludo personalizado según contexto (Hola [Nombre] / Estimado/a [Nombre])
        * Estructura el cuerpo en párrafos claros y separados
        * Usa formato HTML/markdown: <b>, <i>, listas, líneas en blanco
        * Termina con despedida apropiada y firma
        * NO copies y pegues datos sin formato
      
      - **TONO ADAPTATIVO** (CRÍTICO):
        * Informal/Casual: Para amigos, conocidos, contextos relajados
          Ejemplo: "Hola Juancho, ¿Cómo va todo? Te paso el clima..."
        * Formal/Profesional: Para jefes, clientes, contextos profesionales
          Ejemplo: "Estimado Sr. López, Le comparto el reporte solicitado..."
        * Auto-detecta del contexto o sigue instrucción explícita
      
      - **EJEMPLO DE EMAIL BIEN FORMATEADO**:
        
        Hola Juancho,
        
        ¿Cómo va todo? Te paso el reporte del clima que me pediste:
        
        🌡️ **Clima en Corrientes**
        - Temperatura: 29°C (sensación térmica 30°C)
        - Humedad: 32% - Viento: 13 km/h
        - Condiciones: Cielo despejado ☀️
        
        Con este clima, te recomiendo:
        1. Salir a caminar o andar en bici
        2. Aprovechar para un picnic
        3. Deportes acuáticos si estás cerca del río
        
        ¡Que disfrutes el día!
        
        Saludos,
        Wally
      
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
  model: balancedFallbackChain, // Cadena balanceada: Groq (70B) → Gemini → OpenAI
  tools: {
    ...mcpTools,
    weatherTool,
    saveEmailFeedbackTool,
  },
  memory,
  scorers: {
    emailQuality: {
      scorer: wallyScorers.emailQualityScorer,
      sampling: {
        type: 'ratio',
        rate: 1, // Evalúa 100% de las interacciones
      },
    },
    githubSafety: {
      scorer: wallyScorers.githubSafetyScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    responseTime: {
      scorer: wallyScorers.responseTimeScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
  },
});

