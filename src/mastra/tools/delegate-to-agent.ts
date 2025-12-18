import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { wallyAgent } from "../agents/wally-agent";
import { weatherAgent } from "../agents/weather-agent";
import { supabaseAgent } from "../agents/supabase-agent";

/**
 * Herramientas para que el coordinatorAgent pueda delegar tareas a agentes especializados
 */

// Herramienta para delegar a wallyAgent
export const delegateToWallyTool = createTool({
  id: "delegate-to-wally-agent",
  description: "Delega una tarea al Wally Agent (asistente personal para emails, GitHub, clima y Hacker News)",
  inputSchema: z.object({
    task: z.string().describe("La tarea específica que debe realizar wallyAgent"),
  }),
  execute: async ({ context, mastra }) => {
    const { task } = context;
    
    // Obtiene threadId y resourceId del contexto de Mastra
    const threadId = mastra?.threadId || `wally-${Date.now()}`;
    const resourceId = mastra?.resourceId || mastra?.userId || 'default-user';
    
    try {
      const result = await wallyAgent.generate(task, {
        threadId,
        resourceId,
      });
      
      return {
        agent: "wallyAgent",
        success: true,
        result: result.text,
        metadata: {
          taskCompleted: task,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        agent: "wallyAgent",
        success: false,
        error: error.message,
        task,
      };
    }
  },
});

// Herramienta para delegar a weatherAgent
export const delegateToWeatherTool = createTool({
  id: "delegate-to-weather-agent",
  description: "Delega una tarea al Weather Agent (especialista en clima y pronósticos)",
  inputSchema: z.object({
    task: z.string().describe("La tarea específica que debe realizar weatherAgent, incluyendo la ubicación"),
  }),
  execute: async ({ context, mastra }) => {
    const { task } = context;
    
    // Obtiene threadId y resourceId del contexto de Mastra
    const threadId = mastra?.threadId || `weather-${Date.now()}`;
    const resourceId = mastra?.resourceId || mastra?.userId || 'default-user';
    
    try {
      const result = await weatherAgent.generate(task, {
        threadId,
        resourceId,
      });
      
      return {
        agent: "weatherAgent",
        success: true,
        result: result.text,
        metadata: {
          taskCompleted: task,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        agent: "weatherAgent",
        success: false,
        error: error.message,
        task,
      };
    }
  },
});

// Herramienta para delegar a supabaseAgent
export const delegateToSupabaseTool = createTool({
  id: "delegate-to-supabase-agent",
  description: "Delega una tarea al Supabase Agent (experto en bases de datos PostgreSQL y Supabase)",
  inputSchema: z.object({
    task: z.string().describe("La tarea específica que debe realizar supabaseAgent (queries SQL, diseño de schemas, RLS, etc.)"),
  }),
  execute: async ({ context, mastra }) => {
    const { task } = context;
    
    // Obtiene threadId y resourceId del contexto de Mastra
    const threadId = mastra?.threadId || `supabase-${Date.now()}`;
    const resourceId = mastra?.resourceId || mastra?.userId || 'default-user';
    
    try {
      const result = await supabaseAgent.generate(task, {
        threadId,
        resourceId,
      });
      
      return {
        agent: "supabaseAgent",
        success: true,
        result: result.text,
        metadata: {
          taskCompleted: task,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        agent: "supabaseAgent",
        success: false,
        error: error.message,
        task,
      };
    }
  },
});

