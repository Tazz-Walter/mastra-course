# 🔗 Sistema de Fallback Multi-Modelo

Este sistema te permite **encadenar múltiples LLMs** para evitar quedarte sin quota en sistemas multi-agente que hacen muchas llamadas.

---

## 🎯 Problema que Resuelve

En un sistema multi-agente (como `coordinator-agent` + `wally-agent` + `weather-agent`), una sola tarea del usuario puede generar **10-20 llamadas al LLM**:

- Usuario: "Revisa el clima y envíame un email"
- Coordinador planea → 2 llamadas
- Delega a weatherAgent → 3 llamadas
- Delega a wallyAgent → 4 llamadas
- Revisa calidad del email → 2 llamadas
- Reescribe email → 3 llamadas
- **Total: ~14 llamadas** para una sola tarea

Con límites gratuitos de 3-15 RPM, te quedas sin quota rápidamente.

---

## ✅ Solución: Fallback en Cascada

El sistema intenta **múltiples LLMs en orden**:
1. Si el modelo primario se queda sin quota → prueba el siguiente
2. Continúa hasta encontrar uno con quota disponible
3. Solo falla si **todos** los modelos están agotados

---

## 🚀 Configuraciones Predefinidas

### 1️⃣ **Balanceada** (Recomendada para Producción)

```typescript
import { balancedFallbackChain } from "../utils/model-with-fallback";

export const myAgent = new Agent({
  // ...
  model: balancedFallbackChain,
});
```

**Cadena:**
1. **Groq Llama 3.3 70B** (gratis, 30 RPM, MUY rápido) ⚡
2. **Gemini 2.5 Flash Lite** (gratis, 15 RPM) 🌟
3. **OpenAI GPT-4o-mini** (free tier, 3 RPM) 🧠

**Ventajas:**
- Excelente balance calidad/velocidad
- 48 RPM combinados (30 + 15 + 3)
- Groq es increíblemente rápido (50-100 tokens/segundo)

---

### 2️⃣ **Ultra Rápida** (Para Agentes de Alta Frecuencia)

```typescript
import { ultraFastFallbackChain } from "../utils/model-with-fallback";

export const weatherAgent = new Agent({
  // ...
  model: ultraFastFallbackChain,
});
```

**Cadena:**
1. **Groq Llama 3.1 8B Instant** (ultra rápido, 30 RPM) 🚀
2. **Groq Mixtral 8x7B** (muy rápido, 30 RPM) ⚡
3. **Gemini 2.5 Flash Lite** (rápido, 15 RPM) 🌟

**Ventajas:**
- Latencia mínima (<1 segundo)
- 75 RPM combinados
- Ideal para tareas simples (clima, búsquedas)

---

### 3️⃣ **Premium** (Máxima Calidad)

```typescript
import { premiumFallbackChain } from "../utils/model-with-fallback";

export const contentAgent = new Agent({
  // ...
  model: premiumFallbackChain,
});
```

**Cadena:**
1. **OpenAI GPT-4o** (mejor calidad) 🏆
2. **Groq Llama 3.3 70B** (muy buena calidad) ⭐
3. **Gemini 2.5 Flash Lite** (backup rápido) 🌟

**Ventajas:**
- Máxima calidad de respuestas
- Ideal para emails, documentos, análisis complejos

---

### 4️⃣ **Free Tier Max** (Máximo Ahorro)

```typescript
import { freeTierMaxFallbackChain } from "../utils/model-with-fallback";

export const coordinatorAgent = new Agent({
  // ...
  model: freeTierMaxFallbackChain,
});
```

**Cadena:**
1. **Gemini 2.5 Flash Lite** (gratis, 15 RPM) 🌟
2. **Groq Llama 3.3 70B** (gratis, 30 RPM) ⚡
3. **Groq Mixtral 8x7B** (gratis, 30 RPM) 🔥
4. **OpenAI GPT-4o-mini** (free tier, 3 RPM) 🧠

**Ventajas:**
- 78 RPM combinados (máximo disponible gratis)
- 4 niveles de fallback
- Ideal para desarrollo y prototipos

---

## 🔑 Configuración de API Keys

### 1. Groq (⭐ Recomendado - El Más Generoso)

```bash
# Obtén tu API key en: https://console.groq.com/keys
# 100% GRATIS, sin tarjeta de crédito, ~30 RPM

GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Modelos disponibles (gratis):**
- `llama-3.3-70b-versatile` - Llama 3.3 70B (excelente calidad)
- `llama-3.1-8b-instant` - Llama 3.1 8B (ultra rápido)
- `mixtral-8x7b-32768` - Mixtral 8x7B (muy bueno)
- `gemma2-9b-it` - Gemma 2 9B (rápido)

**Límites gratuitos:**
- ✅ 30 requests/minuto
- ✅ 6,000 tokens/minuto
- ✅ Sin tarjeta de crédito
- ✅ Sin límite diario
- 🚀 **50-100 tokens/segundo** (increíblemente rápido)

---

### 2. Google Gemini (Ya Configurado)

```bash
# Ya tienes esto configurado
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Límites gratuitos:**
- 15 requests/minuto
- 1 millón de tokens/día

---

### 3. OpenAI (Ya Configurado)

```bash
# Ya tienes esto configurado
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Límites free tier:**
- 3 requests/minuto
- 200 requests/día

---

## 🛠️ Configuración Personalizada

### Crear Tu Propia Cadena

```typescript
import { createMultiModelFallback } from "../utils/model-with-fallback";

export const myCustomChain = createMultiModelFallback({
  models: [
    {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      displayName: 'Groq Llama 3.3 70B',
    },
    {
      provider: 'google',
      model: 'gemini-2.5-flash-lite',
      displayName: 'Gemini Flash Lite',
    },
    {
      provider: 'openai',
      model: 'gpt-4o-mini',
      displayName: 'GPT-4o-mini',
    },
    // Agrega más modelos según necesites
  ],
});
```

---

## 📊 Comparación de Proveedores (Tier Gratuito)

| Proveedor | RPM | TPM | Velocidad | Calidad | Sin Tarjeta |
|-----------|-----|-----|-----------|---------|-------------|
| **Groq** | 30 | 6,000 | ⚡⚡⚡⚡⚡ | ⭐⭐⭐⭐ | ✅ |
| **Gemini** | 15 | 32,000 | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ | ✅ |
| **OpenAI** | 3 | 40,000 | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | ✅ |

**RPM**: Requests por minuto  
**TPM**: Tokens por minuto  

---

## 🎯 Recomendaciones por Agente

### Coordinator Agent
```typescript
model: freeTierMaxFallbackChain, // Hace MUCHAS llamadas
```

### Wally Agent (Emails, GitHub)
```typescript
model: balancedFallbackChain, // Necesita calidad + velocidad
```

### Weather Agent (Tareas Simples)
```typescript
model: ultraFastFallbackChain, // Prioriza velocidad
```

### Content Agent (Escritura)
```typescript
model: premiumFallbackChain, // Prioriza calidad
```

### Supabase Agent (SQL)
```typescript
model: balancedFallbackChain, // Balance óptimo
```

---

## 📝 Ejemplo Completo

```typescript
// src/mastra/agents/my-agent.ts
import { Agent } from "@mastra/core/agent";
import { balancedFallbackChain } from "../utils/model-with-fallback";

export const myAgent = new Agent({
  name: "My Agent",
  description: "Agent with multi-model fallback",
  instructions: "...",
  model: balancedFallbackChain, // 🎯 Usa cadena de fallback
  tools: { /* ... */ },
});
```

### Logs en Consola

```
[MultiModelFallback] 🔗 Cadena de fallback configurada con 3 modelos:
  1. Groq Llama 3.3 70B
  2. Gemini 2.5 Flash Lite
  3. OpenAI GPT-4o-mini

[MultiModelFallback] 1/3 Intentando con Groq Llama 3.3 70B...
✅ Respuesta recibida en 850ms

[MultiModelFallback] 1/3 Intentando con Groq Llama 3.3 70B...
⚠️ Groq Llama 3.3 70B sin quota. Probando siguiente...
[MultiModelFallback] 2/3 Intentando con Gemini 2.5 Flash Lite...
✅ Respuesta recibida en 1200ms
```

---

## 🔍 Debugging

### Ver qué modelo se está usando

```bash
# Logs automáticos en terminal
npm run dev

# Busca líneas como:
[MultiModelFallback] 1/3 Intentando con Groq Llama 3.3 70B...
```

### Si un modelo falla

```
⚠️ No se pudo inicializar groq/llama-3.3-70b-versatile: GROQ_API_KEY no configurada en .env
```

**Solución:** Agrega la API key al `.env`

---

## 💡 Tips Pro

1. **Groq primero siempre** - Es gratis y 10x más rápido que otros
2. **Combina 3-4 modelos** - Maximiza disponibilidad
3. **Monitorea logs** - Verás qué modelo se usa más
4. **Free tier suficiente** - Con 4 modelos → 78 RPM (suficiente para la mayoría)
5. **Actualiza agentes gradualmente** - Empieza por coordinatorAgent

---

## 🚨 Troubleshooting

### "Todos los modelos fallaron"
- **Causa:** Agotaste TODOS los modelos (raro con 4 fallbacks)
- **Solución:** Espera 1 minuto o agrega más modelos

### "GROQ_API_KEY no configurada"
- **Causa:** Falta API key en `.env`
- **Solución:** Agrega `GROQ_API_KEY=...` y reinicia

### "Respuestas lentas"
- **Causa:** Probablemente cayendo en fallbacks lentos
- **Solución:** Verifica logs, tal vez necesites más quota

---

## 📚 Recursos

- **Groq Console:** https://console.groq.com/
- **Groq Docs:** https://console.groq.com/docs/quickstart
- **Gemini Pricing:** https://ai.google.dev/pricing
- **OpenAI Limits:** https://platform.openai.com/docs/guides/rate-limits

---

## 🎉 Resultado Final

Con este sistema:
- ✅ **78 RPM gratuitos** (vs 3-15 antes)
- ✅ **Nunca te quedas sin quota** (4 niveles de fallback)
- ✅ **Respuestas ultra rápidas** (Groq promedia 50-100 tokens/s)
- ✅ **Sin tarjeta de crédito** (todo gratis)
- ✅ **Transparente** - Los agentes no notan la diferencia

**Tu sistema multi-agente ahora puede escalar sin costos.** 🚀

