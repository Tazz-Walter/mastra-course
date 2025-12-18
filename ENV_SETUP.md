# 🔐 Configuración de Variables de Entorno

Copia este contenido a tu archivo `.env`:

```bash
# ========================================
# PROVEEDORES DE LLM
# ========================================

# OpenAI (ya configurado)
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Google Gemini (ya configurado)
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX

# Groq (⭐ ALTAMENTE RECOMENDADO - 100% gratis, sin tarjeta, 30 RPM, MUY rápido)
# Obtén tu key en: https://console.groq.com/keys
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ========================================
# MCP SERVERS
# ========================================

# Zapier (ya configurado)
ZAPIER_MCP_URL=https://mcp.zapier.com/api/mcp/mcp
ZAPIER_MCP_API_KEY=your-zapier-api-key
# Alternativa:
# ZAPIER_MCP_TOKEN=your-zapier-token

# GitHub MCP Server
GITHUB_PERSONAL_ACCESS_TOKEN=github_pat_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Supabase MCP Server
SUPABASE_ACCESS_TOKEN=sbp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
SUPABASE_PROJECT_REF=your-project-ref

# ========================================
# MASTRA OBSERVABILITY
# ========================================

# Mastra Cloud (OPCIONAL - Para analytics y monitoring)
# Obtén tu key en: https://mastra.ai/
MASTRA_CLOUD_API_KEY=mastra_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# ========================================
# CONFIGURACIÓN DEL SISTEMA
# ========================================

# Node Environment
NODE_ENV=development

# Port (opcional)
PORT=4111
```

## 🚀 Obtener Groq API Key (5 minutos)

1. Ve a https://console.groq.com/
2. Regístrate con tu email (sin tarjeta)
3. Ve a "API Keys" → "Create API Key"
4. Copia la key (empieza con `gsk_`)
5. Pégala en `.env`: `GROQ_API_KEY=gsk_...`
6. Reinicia el servidor: `npm run dev`

**¡Listo!** Ahora tienes 30 RPM adicionales gratis y respuestas 10x más rápidas.

---

## ✅ Verificación

Para verificar que todo funciona:

```bash
# 1. Verifica que las variables están cargadas
npm run dev

# 2. Busca en los logs:
[MultiModelFallback] 🔗 Cadena de fallback configurada con 3 modelos:
  1. Groq Llama 3.3 70B
  2. Gemini 2.5 Flash Lite
  3. OpenAI GPT-4o-mini

# 3. Usa un agente y observa qué modelo se usa
[MultiModelFallback] 1/3 Intentando con Groq Llama 3.3 70B...
✅ Respuesta recibida en 850ms
```

---

## 🔍 Debugging

### Si ves: "GROQ_API_KEY no configurada"
- ✅ Verifica que agregaste `GROQ_API_KEY=...` al `.env`
- ✅ Reinicia el servidor después de editar `.env`
- ✅ La key debe empezar con `gsk_`

### Si no ves logs de MultiModelFallback
- ✅ Verifica que los agentes usen las cadenas de fallback
- ✅ Ejemplo: `model: balancedFallbackChain`

---

## 💡 Recomendación

**Mínimo recomendado:**
```bash
OPENAI_API_KEY=sk-...
GOOGLE_GENERATIVE_AI_API_KEY=AIza...
GROQ_API_KEY=gsk_...  # ← AGREGA ESTE
```

Con estos 3 proveedores tendrás **48 RPM gratuitos** (3 + 15 + 30).

---

## 📚 Más Info

Ver `MULTI_MODEL_FALLBACK.md` para detalles completos sobre:
- Configuraciones predefinidas
- Comparación de proveedores
- Cadenas personalizadas
- Troubleshooting avanzado

