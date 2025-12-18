# 🤝 Multi-Agent Architecture - Coordinación de Agentes

Este documento explica cómo exponer agentes mediante **MCPServer** y crear arquitecturas multi-agente donde un agente coordina a otros.

## 🎯 Casos de Uso

### 1️⃣ Tareas que Requieren Múltiples Especialidades

```
Usuario: "Revisa el clima en Madrid y envíame un email con el reporte"

Coordinator Agent:
  ├─ weatherAgent → Obtiene clima de Madrid
  └─ wallyAgent → Envía email con el reporte
```

### 2️⃣ Workflows Complejos Cross-Domain

```
Usuario: "Diseña un schema para un blog y guárdalo en un documento de GitHub"

Coordinator Agent:
  ├─ supabaseAgent → Diseña schema de PostgreSQL
  └─ wallyAgent → Crea issue/PR en GitHub con el diseño
```

### 3️⃣ Integración de Datos

```
Usuario: "Lista los issues abiertos de mi repo y crea una tabla en Supabase con ellos"

Coordinator Agent:
  ├─ wallyAgent (GitHub) → Lista issues abiertos
  └─ supabaseAgent → Diseña tabla e inserta los issues
```

---

## 🏗️ Arquitectura

### Componentes Creados

```
src/mastra/
├── mcp/
│   └── agents-mcp-server.ts     ← Expone wallyAgent, supabaseAgent, weatherAgent
├── agents/
│   └── coordinator-agent.ts     ← Meta-agente que coordina a los demás
└── index.ts                      ← Registra el MCPServer
```

---

## 📋 Configuración Actual (Desarrollo)

### 1️⃣ MCPServer (Proveedor)

**Archivo:** `src/mastra/mcp/agents-mcp-server.ts`

```typescript
export const agentsMcpServer = new MCPServer({
  id: "mastra-agents-server",
  name: "Mastra Agents Server",
  version: "1.0.0",
  
  agents: {
    wallyAgent,      // Emails, GitHub, Climate
    supabaseAgent,   // Database expert
    weatherAgent,    // Weather specialist
  },
  
  tools: {
    weatherTool,
    saveEmailFeedbackTool,
  },
});
```

**¿Qué hace?**
- ✅ Expone los agentes como servicios consumibles
- ✅ Permite que otros sistemas accedan a estos agentes
- ✅ Crea una API estandarizada (MCP) para interactuar con ellos

### 2️⃣ Coordinator Agent (Consumidor)

**Archivo:** `src/mastra/agents/coordinator-agent.ts`

```typescript
export const coordinatorAgent = new Agent({
  name: "Coordinator Agent",
  description: "Meta-agente que coordina agentes especializados",
  instructions: `
      Eres un coordinador que gestiona:
      - wallyAgent (emails, GitHub, clima)
      - supabaseAgent (bases de datos)
      - weatherAgent (clima detallado)
      
      Analiza tareas complejas y delega a los agentes apropiados.
  `,
  // En producción, conectaría al MCPServer para obtener tools
});
```

**¿Qué hace?**
- ✅ Analiza tareas complejas del usuario
- ✅ Identifica qué agentes necesita
- ✅ Delega subtareas a agentes especializados
- ✅ Combina resultados en una respuesta coherente

### 3️⃣ Registro en Mastra

**Archivo:** `src/mastra/index.ts`

```typescript
export const mastra = new Mastra({
  agents: { 
    wallyAgent, 
    supabaseAgent, 
    weatherAgent,
    coordinatorAgent,  // ← Nuevo
  },
  mcpServers: { 
    agentsMcpServer,   // ← Expone los agentes
  },
});
```

---

## 🚀 Uso en Desarrollo (Actual)

### Acceso Directo a Agentes

Por ahora, el `coordinatorAgent` puede acceder directamente a otros agentes sin MCP:

```typescript
// En tu código
import { wallyAgent } from './agents/wally-agent';
import { supabaseAgent } from './agents/supabase-agent';

// Coordinator puede invocar directamente
async function coordinateTask() {
  // 1. Obtener clima
  const weatherResult = await weatherAgent.generate("Clima en Madrid");
  
  // 2. Enviar email con resultado
  const emailResult = await wallyAgent.generate(
    `Envía email con este clima: ${weatherResult.text}`
  );
}
```

**Ventajas:**
- ✅ Más simple para desarrollo
- ✅ Sin overhead de red
- ✅ Debugging más fácil

**Desventajas:**
- ❌ Fuerte acoplamiento
- ❌ No escalable a múltiples procesos
- ❌ No accesible desde sistemas externos

---

## 🌐 Uso en Producción (Futuro)

### Paso 1: Iniciar el MCPServer como HTTP

```typescript
// src/mastra/index.ts o server.ts
import { mastra } from './mastra';

// Inicia el servidor MCP en HTTP
mastra.startHTTP({
  port: 4111,
});

// El MCPServer estará disponible en:
// http://localhost:4111/mcp/mastra-agents-server
```

### Paso 2: Conectar el Coordinator via MCP

```typescript
// src/mastra/agents/coordinator-agent.ts
const agentsMcpClient = new MCPClient({
  servers: {
    agents: {
      url: new URL("http://localhost:4111/mcp/mastra-agents-server"),
    }
  }
});

// Obtener herramientas de los agentes expuestos
const agentTools = await agentsMcpClient.getTools();

export const coordinatorAgent = new Agent({
  // ...
  tools: {
    ...agentTools,  // Ahora tiene acceso a wallyAgent, supabaseAgent, etc.
  },
});
```

### Paso 3: Usar desde Cursor/Claude

Ahora otros sistemas pueden conectarse al servidor:

**`.cursor/mcp.json` o Claude Desktop:**

```json
{
  "mcpServers": {
    "mastra-agents": {
      "url": "http://localhost:4111/mcp/mastra-agents-server"
    }
  }
}
```

**Ventajas:**
- ✅ Desacoplamiento total
- ✅ Escalable (múltiples instancias)
- ✅ Accesible desde cualquier sistema MCP-compatible
- ✅ Puede correr en servidores separados

---

## 💡 Ejemplos de Coordinación

### Ejemplo 1: Clima + Email

```
Usuario → coordinatorAgent: "Revisa el clima en Buenos Aires y envíame un email"

coordinatorAgent:
  1. Analiza: Necesito weatherAgent y wallyAgent
  2. Ejecuta weatherAgent.generate("Clima en Buenos Aires")
  3. Ejecuta wallyAgent.generate("Envía email con: {resultado clima}")
  4. Responde: "Email enviado con el clima de Buenos Aires"
```

### Ejemplo 2: GitHub + Supabase

```
Usuario → coordinatorAgent: "Lista mis repos de GitHub y crea una tabla en Supabase"

coordinatorAgent:
  1. Analiza: Necesito wallyAgent (GitHub) y supabaseAgent
  2. Ejecuta wallyAgent.generate("Lista mis repositorios")
  3. Ejecuta supabaseAgent.generate("Diseña tabla 'repositories' con: {repos}")
  4. Ejecuta supabaseAgent.generate("Inserta estos repositorios: {repos}")
  5. Responde: "Tabla creada con {N} repositorios"
```

### Ejemplo 3: Multi-Step Workflow

```
Usuario → coordinatorAgent: "Analiza el clima de esta semana y si va a llover, 
          crea un issue en GitHub recordándome llevar paraguas"

coordinatorAgent:
  1. Analiza: Flujo condicional con weatherAgent y wallyAgent
  2. Ejecuta weatherAgent.generate("Pronóstico semanal")
  3. Evalúa resultado (¿lluvia?)
  4. SI lluvia:
     - Ejecuta wallyAgent.generate("Crea issue en GitHub: Llevar paraguas")
  5. Responde con resumen del plan
```

---

## 🔧 Debugging y Testing

### Ver Agentes Expuestos

```bash
# Inicia el servidor
npm run dev

# En otra terminal, lista los agentes disponibles
curl http://localhost:4111/mcp/mastra-agents-server/list
```

### Test del Coordinator

```typescript
// test-coordinator.ts
import { coordinatorAgent } from './agents/coordinator-agent';

const result = await coordinatorAgent.generate(
  "Revisa el clima en Madrid y explica qué agentes usarías"
);

console.log(result.text);
// Debería explicar que usaría weatherAgent para clima
```

---

## 📊 Comparación: Directo vs MCP

| Aspecto | Acceso Directo | Via MCP Server |
|---------|----------------|----------------|
| **Simplicidad** | ✅ Muy simple | ⚠️ Más setup |
| **Performance** | ✅ Sin overhead | ⚠️ Overhead de red |
| **Escalabilidad** | ❌ Limitada | ✅ Alta |
| **Desacoplamiento** | ❌ Fuerte acoplamiento | ✅ Desacoplado |
| **Acceso externo** | ❌ No | ✅ Sí (Cursor, Claude) |
| **Debugging** | ✅ Fácil | ⚠️ Más complejo |
| **Multi-proceso** | ❌ No | ✅ Sí |

### Recomendación

- **Desarrollo/Prototipo:** Acceso directo (como está ahora)
- **Producción/Escala:** Via MCP Server (HTTP)

---

## 🎯 Próximos Pasos

### Opción 1: Mantener Simple (Desarrollo)

Usar acceso directo entre agentes:

```typescript
// Coordinator llama directamente
const weather = await weatherAgent.generate("...");
const email = await wallyAgent.generate("...");
```

### Opción 2: Activar MCP Server (Producción)

1. **Iniciar servidor HTTP:**
   ```typescript
   mastra.startHTTP({ port: 4111 });
   ```

2. **Actualizar coordinator para usar MCP:**
   ```typescript
   const client = new MCPClient({
     servers: { agents: { url: "http://localhost:4111/mcp/..." } }
   });
   ```

3. **Deployar en la nube:**
   - Vercel, Railway, Fly.io, etc.
   - Configurar URL pública
   - Actualizar clientes con la URL

---

## 🔒 Seguridad

### Consideraciones al Exponer Agentes

1. **Autenticación:** Agrega auth al MCPServer
   ```typescript
   mcpServers: {
     agentsMcpServer: {
       auth: {
         type: "bearer",
         token: process.env.MCP_SERVER_TOKEN,
       }
     }
   }
   ```

2. **Rate Limiting:** Limita requests por usuario/IP

3. **Permisos:** Controla qué agentes son accesibles por quién

4. **Logging:** Monitorea quién usa qué agentes

---

## 📚 Recursos

- [Mastra MCP Overview](https://mastra.ai/docs/mcp/overview)
- [MCPServer Reference](https://mastra.ai/reference/mcp/mcp-server)
- [MCPClient Reference](https://mastra.ai/reference/mcp/mcp-client)
- [Publishing MCP Servers](https://mastra.ai/docs/mcp/publishing)

---

## 🆘 Troubleshooting

### Coordinator no ve los agentes

**Problema:** `coordinatorAgent` dice "no tools available"

**Solución:** 
- Verifica que `agentsMcpServer` esté registrado en `mastra.mcpServers`
- Verifica que el servidor HTTP esté corriendo
- Chequea la URL del MCPClient

### Agentes no responden

**Problema:** Timeout al llamar agentes via MCP

**Solución:**
- Aumenta timeout en MCPClient config
- Verifica que los agentes base funcionen individualmente
- Chequea logs del servidor MCP

---

## ✅ Estado Actual

- ✅ **MCPServer creado** (`agents-mcp-server.ts`)
- ✅ **Coordinator Agent creado** (`coordinator-agent.ts`)
- ✅ **Registrado en Mastra** (`index.ts`)
- ⏳ **Pendiente:** Activar servidor HTTP (opcional)
- ⏳ **Pendiente:** Conectar coordinator via MCP (opcional)

Por ahora, el coordinator puede trabajar con acceso directo a los agentes para desarrollo rápido. Cuando necesites escalar o exponer a sistemas externos, activa el MCP Server HTTP.

