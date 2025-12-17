import { MCPServer } from "@mastra/mcp";
import { wallyAgent } from "../agents/wally-agent";
import { supabaseAgent } from "../agents/supabase-agent";
import { weatherAgent } from "../agents/weather-agent";
import { weatherTool } from "../tools/weather-tool";
import { saveEmailFeedbackTool } from "../tools/save-email-feedback";

/**
 * MCPServer que expone los agentes de Mastra para que otros sistemas
 * puedan consumirlos.
 * 
 * Casos de uso:
 * - Permitir que otros agentes coordinen estos agentes especializados
 * - Exponer agentes a sistemas externos (Cursor, Claude, etc.)
 * - Crear arquitecturas de multi-agentes con delegación de tareas
 */
export const agentsMcpServer = new MCPServer({
  id: "mastra-agents-server",
  name: "Mastra Agents Server",
  version: "1.0.0",
  description: "Servidor MCP que expone agentes especializados de Mastra",
  
  // Expone los agentes para que otros los puedan usar
  agents: {
    wallyAgent,      // Asistente personal con Gmail, GitHub, Weather
    supabaseAgent,   // Experto en bases de datos y Supabase
    weatherAgent,    // Especialista en clima
  },
  
  // También puedes exponer tools individuales
  tools: {
    weatherTool,
    saveEmailFeedbackTool,
  },
});

