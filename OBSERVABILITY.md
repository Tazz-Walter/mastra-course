# 📊 Observabilidad y Monitoreo de Llamadas al Modelo

## ✅ Configuración Actual

### 1. Logger Global (PinoLogger)
Ya está configurado en `src/mastra/index.ts`:
```typescript
logger: new PinoLogger({
  name: 'Mastra',
  level: 'info',
}),
```

### 2. Observabilidad Habilitada
```typescript
observability: {
  default: { enabled: true }, 
},
```

Esto habilita el **DefaultExporter** que registra automáticamente:
- Cada llamada al modelo (con timestamps)
- Tokens usados (input/output)
- Latencia de cada request
- Errores y reintentos

### 3. Storage de Métricas
```typescript
storage: new LibSQLStore({
  url: ":memory:",
}),
```

**Nota**: Actualmente usa `:memory:`, lo que significa que las métricas se pierden al reiniciar. Para persistir, cambia a:
```typescript
url: "file:../mastra.db",
```

## 📈 Cómo Ver las Métricas

### Opción 1: Logs en Consola
Al correr `npm run dev` o `npm start`, verás logs como:
```
INFO (Mastra): Agent call started - wallyAgent
INFO (Mastra): Model: gemini-1.5-flash
INFO (Mastra): Tokens used: 1234 input, 567 output
INFO (Mastra): Latency: 2.3s
```

### Opción 2: Query a la Base de Datos
Si cambias storage a `file:../mastra.db`, puedes consultar:
```bash
sqlite3 mastra.db "SELECT * FROM observability ORDER BY timestamp DESC LIMIT 10;"
```

### Opción 3: Mastra Cloud (Opcional)
Para dashboards visuales, configura el CloudExporter:
```typescript
observability: {
  default: { enabled: true },
  cloud: { 
    enabled: true,
    apiKey: process.env.MASTRA_CLOUD_API_KEY 
  },
},
```

## 🎯 Optimizaciones Aplicadas

### 1. Modelo Cambiado
- **Antes**: `gemini-2.5-flash` (5 RPM gratis)
- **Ahora**: `gemini-1.5-flash` (15 RPM gratis)
- **Beneficio**: 3x más llamadas por minuto

### 2. Working Memory Optimizada
**Cambio en instrucciones**:
```
IMPORTANTE: Solo llama updateWorkingMemory cuando el usuario 
EXPLÍCITAMENTE te pida que guardes/recuerdes información personal.
NO lo llames automáticamente en cada conversación.
```

**Antes**: Se llamaba `updateWorkingMemory` en cada turno → +1 llamada extra
**Ahora**: Solo cuando el usuario dice "recuerda que...", "guarda que..."

### Reducción Estimada de Llamadas
Para una conversación típica de 5 turnos con 2 tool calls:
- **Antes**: ~12-15 llamadas (3 por turno con auto-update)
- **Ahora**: ~10 llamadas (2 por turno sin auto-update)
- **Ahorro**: ~20-30% menos llamadas

## 🔍 Debugging de Rate Limits

Si ves el error `429 RESOURCE_EXHAUSTED`:
1. Revisa los logs para contar llamadas en el último minuto
2. Espera el tiempo indicado en `retryDelay` (~20 segundos)
3. Considera espaciar las interacciones o usar un modelo con mayor límite

## 📊 Métricas Clave a Monitorear

1. **Llamadas por minuto (RPM)**: Debe estar < 15 para `gemini-1.5-flash`
2. **Tokens por llamada**: Afecta latencia y costos futuros
3. **Tasa de error**: Reintentos y fallos de herramientas
4. **Latencia promedio**: Tiempo de respuesta del modelo

## 🚀 Próximos Pasos (Opcional)

1. **Persistir métricas**: Cambiar storage a `file:../mastra.db`
2. **Alertas custom**: Agregar lógica para notificar cuando RPM > 80%
3. **Rate limiting proactivo**: Implementar cola de requests con delay automático
4. **Upgrade a plan pago**: Si necesitas > 15 RPM consistentemente

