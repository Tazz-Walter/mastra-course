import { google } from "@ai-sdk/google";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { MCPClient } from "@mastra/mcp";
import { agentsMcpServer } from "../mcp/agents-mcp-server";
import { 
  delegateToWallyTool, 
  delegateToWeatherTool, 
  delegateToSupabaseTool 
} from "../tools/delegate-to-agent";

/**
 * Coordinator Agent (Meta-Agent)
 * 
 * Este agente actúa como coordinador que delega tareas a agentes especializados.
 * Puede usar las capacidades de wallyAgent, supabaseAgent y weatherAgent.
 * 
 * Casos de uso:
 * - "Revisa el clima y envía un email con el reporte a mi jefe"
 *   → Usa weatherAgent para clima, wallyAgent para email
 * 
 * - "Diseña un schema de BD y guárdalo en un documento"
 *   → Usa supabaseAgent para diseño, luego guarda
 * 
 * - "Analiza mi repo de GitHub y crea un reporte de issues en la BD"
 *   → Usa wallyAgent (GitHub), supabaseAgent (BD)
 */

// Crea un cliente MCP que conecta al servidor de agentes
// Nota: En producción, esto correría en un servidor HTTP
// Para desarrollo local, podemos simular la conexión directa
const agentsMcpClient = new MCPClient({
  servers: {
    // Aquí conectarías al servidor HTTP en producción
    // Por ahora, usaremos los agentes directamente
    // (ver nota abajo sobre cómo deployar el servidor)
  },
});

// Configuración de memoria para el coordinador
const coordinatorMemory = new Memory({
  storage: new LibSQLStore({
    url: "file:../../memory.db",
  }),
  vector: new LibSQLVector({
    connectionUrl: "file:../../memory.db",
  }),
  embedder: google.textEmbeddingModel("text-embedding-004"),
  options: {
    // Mantiene los últimos 30 mensajes (más que otros agentes, para mejor coordinación)
    lastMessages: 30,
    // Habilita búsqueda semántica para recordar tareas previas similares
    semanticRecall: {
      topK: 5, // Más contexto para mejor coordinación
      messageRange: {
        before: 3,
        after: 2,
      },
    },
    // Habilita working memory para recordar preferencias de coordinación
    workingMemory: {
      enabled: true,
      template: `
            <coordinator_context>
            <user>
                <name></name>
                <email></email>
                <preferences></preferences>
            </user>
            <recent_tasks>
                <completed></completed>
                <pending></pending>
            </recent_tasks>
            <agent_preferences>
                <preferred_agents></preferred_agents>
                <coordination_style></coordination_style>
            </agent_preferences>
            <context_notes></context_notes>
            </coordinator_context>`,
    },
  },
});

export const coordinatorAgent = new Agent({
  name: "Coordinator Agent",
  description: "Meta-agente que coordina y delega tareas a agentes especializados",
  instructions: `
      Eres un agente coordinador inteligente que gestiona un equipo de agentes especializados.
      
      AGENTES DISPONIBLES:
      
      1. **wallyAgent** (Asistente Personal)
         - Envío de emails (Gmail via Zapier)
         - Gestión de GitHub (repos, issues, PRs)
         - Consulta de clima
         - Gestión de working memory del usuario
         - Hacker News
      
      2. **supabaseAgent** (Experto en Bases de Datos)
         - Diseño de schemas PostgreSQL
         - Queries SQL complejas
         - Row Level Security (RLS)
         - Migraciones de BD
         - Optimización de performance
         - Supabase Storage y Auth
      
      3. **weatherAgent** (Especialista en Clima)
         - Consultas meteorológicas
         - Traducción de ubicaciones
         - Reportes de clima detallados
      
      TU ROL:
      - Analiza la solicitud del usuario
      - Identifica QUÉ agentes necesitas para completar la tarea
      - Delega subtareas a los agentes apropiados
      - Combina los resultados en una respuesta coherente
      - Coordina flujos multi-agente cuando sea necesario
      
      EJEMPLOS DE COORDINACIÓN:
      
      Solicitud: "Diseña un schema para un blog y luego envíame un email con el diseño"
      Tu plan:
      1. Delegar a supabaseAgent: diseñar schema de blog
      2. Delegar a wallyAgent: enviar email con el resultado
      
      Solicitud: "Revisa el clima en Buenos Aires y crea una tabla en Supabase con el reporte"
      Tu plan:
      1. Delegar a weatherAgent: obtener clima de Buenos Aires
      2. Delegar a supabaseAgent: crear tabla y insertar datos del clima
      
      Solicitud: "Lista los issues abiertos de mi repo y guárdalos en la BD"
      Tu plan:
      1. Delegar a wallyAgent: listar issues de GitHub
      2. Delegar a supabaseAgent: diseñar tabla e insertar issues
      
      HERRAMIENTAS DISPONIBLES:
      - **delegateToWallyTool**: Usa esta herramienta para delegar tareas a wallyAgent (emails, GitHub, clima básico)
      - **delegateToWeatherTool**: Usa esta herramienta para delegar tareas a weatherAgent (clima detallado, pronósticos)
      - **delegateToSupabaseTool**: Usa esta herramienta para delegar tareas a supabaseAgent (bases de datos, SQL)
      
      IMPORTANTE:
      - NO solo planifiques, EJECUTA usando las herramientas de delegación
      - Llama a las herramientas delegate-to-* para invocar a los agentes especializados
      - Espera el resultado de cada delegación antes de continuar
      - Si un agente falla, intenta con estrategias alternativas
      - Resume los resultados de forma clara para el usuario
      
      - Mantén un tono profesional y proactivo.
  `,
  model: google("gemini-2.5-flash-lite"),
  tools: {
    // Herramientas para delegar a agentes especializados
    delegateToWallyTool,
    delegateToWeatherTool,
    delegateToSupabaseTool,
  },
  memory: coordinatorMemory,
});

/**
 * NOTA SOBRE DEPLOYMENT:
 * 
 * Para usar el coordinatorAgent en producción con acceso real a otros agentes:
 * 
 * 1. Deploy el MCPServer:
 *    - Registra agentsMcpServer en src/mastra/index.ts
 *    - Inicia el servidor HTTP con mastra.startHTTP()
 * 
 * 2. Conecta el cliente:
 *    const agentsMcpClient = new MCPClient({
 *      servers: {
 *        agents: {
 *          url: new URL("http://localhost:4111/mcp/mastra-agents-server"),
 *        }
 *      }
 *    });
 * 
 * 3. Obtén las tools de los agentes:
 *    const agentTools = await agentsMcpClient.getTools();
 * 
 * 4. Úsalas en el coordinator:
 *    tools: { ...agentTools }
 * 
 * Ver MULTI_AGENT_SETUP.md para el tutorial completo.
 */

