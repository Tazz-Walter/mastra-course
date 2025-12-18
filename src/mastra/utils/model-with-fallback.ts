import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV1 } from "@ai-sdk/provider";

/**
 * Sistema de fallback en cascada para múltiples LLMs
 * 
 * Estrategia:
 * 1. Intenta con el modelo primario
 * 2. Si falla por rate limit (429), prueba el siguiente en la cadena
 * 3. Continúa hasta agotar todos los fallbacks
 * 4. Solo falla si todos los modelos están sin quota
 * 
 * Proveedores 100% GRATUITOS sin tarjeta (2025):
 * - Groq: Llama 3.3 70B/8B, Mixtral 8x7B (30 RPM gratis, MUY rápido)
 * - Google Gemini: Flash 2.5 Lite (15 RPM gratis)
 * - OpenAI: gpt-4o-mini (3 RPM en free tier)
 */

// Tipos de proveedores soportados
type Provider = 'google' | 'openai' | 'groq';

interface ModelConfig {
  provider: Provider;
  model: string;
  displayName?: string;
}

interface MultiModelFallbackOptions {
  models: ModelConfig[];
}

/**
 * Configura proveedores de LLM
 */
const groqApiKey = process.env.GROQ_API_KEY;

// Cliente Groq (usando OpenAI-compatible API)
const groq = groqApiKey ? createOpenAI({
  apiKey: groqApiKey,
  baseURL: 'https://api.groq.com/openai/v1',
}) : null;

/**
 * Obtiene una instancia del modelo según el proveedor
 */
function getModelInstance(config: ModelConfig): any {
  switch (config.provider) {
    case 'google':
      return google(config.model);
    case 'openai':
      return openai(config.model);
    case 'groq':
      if (!groq) {
        throw new Error('GROQ_API_KEY no configurada en .env');
      }
      return groq(config.model);
    default:
      throw new Error(`Proveedor desconocido: ${config.provider}`);
  }
}

/**
 * Verifica si un error es por límite de rate/quota o incompatibilidad del proveedor
 */
function isRateLimitError(error: any): boolean {
  const message = error.message?.toLowerCase() || '';
  const errorType = error.type?.toLowerCase() || '';
  
  return (
    // Rate limit errors
    error.statusCode === 429 ||
    error.code === 429 ||
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('resource_exhausted') ||
    message.includes('too many requests') ||
    
    // Token limit errors (Groq específico)
    message.includes('request too large') ||
    message.includes('tokens per minute') ||
    message.includes('tpm') ||
    
    // Content type errors (Groq incompatibilidad)
    message.includes('unsupported content') ||
    message.includes('invalid_request_error') ||
    errorType.includes('invalid_request')
  );
}

/**
 * Crea un modelo con fallback en cascada a múltiples LLMs
 */
export function createMultiModelFallback(options: MultiModelFallbackOptions): any {
  const { models } = options;

  if (models.length === 0) {
    throw new Error('Debe proporcionar al menos un modelo en la cadena de fallback');
  }

  // Instancia todos los modelos disponibles
  const modelInstances = models
    .map(config => {
      try {
        return {
          config,
          instance: getModelInstance(config),
          displayName: config.displayName || `${config.provider}/${config.model}`,
        };
      } catch (error: any) {
        console.warn(`[MultiModelFallback] ⚠️ No se pudo inicializar ${config.provider}/${config.model}: ${error.message}`);
        return null;
      }
    })
    .filter(Boolean) as Array<{ config: ModelConfig; instance: any; displayName: string }>;

  if (modelInstances.length === 0) {
    throw new Error('No se pudo inicializar ningún modelo en la cadena de fallback');
  }

  console.log(`[MultiModelFallback] 🔗 Cadena de fallback configurada con ${modelInstances.length} modelos:`);
  modelInstances.forEach((m, i) => console.log(`  ${i + 1}. ${m.displayName}`));

  // Usa el primer modelo como base para el wrapper
  const primary = modelInstances[0].instance;

  // Crea wrapper que mantiene todas las propiedades del modelo primario
  const wrapper = Object.create(Object.getPrototypeOf(primary));
  Object.assign(wrapper, primary);

  /**
   * Intenta ejecutar con cada modelo en cascada
   */
  async function tryModelsInCascade(operation: 'generate' | 'stream', options: any): Promise<any> {
    const errors: Array<{ model: string; error: any }> = [];

    for (let i = 0; i < modelInstances.length; i++) {
      const { instance, displayName } = modelInstances[i];
      const isLast = i === modelInstances.length - 1;

      try {
        console.log(`[MultiModelFallback] ${i + 1}/${modelInstances.length} Intentando con ${displayName}...`);

        if (operation === 'generate') {
          return await instance.doGenerate(options);
        } else {
          return await instance.doStream(options);
        }
      } catch (error: any) {
        errors.push({ model: displayName, error });

        if (isRateLimitError(error)) {
          console.warn(`[MultiModelFallback] ⚠️ ${displayName} sin quota. ${isLast ? 'No quedan fallbacks.' : 'Probando siguiente...'}`);

          if (!isLast) {
            continue; // Intenta con el siguiente modelo
          }
        }

        // Si no es error de rate limit o es el último modelo, lanza el error
        if (isLast) {
          console.error(`[MultiModelFallback] ❌ Todos los modelos fallaron:`);
          errors.forEach(({ model, error }) => {
            console.error(`  - ${model}: ${error.message}`);
          });

          throw new Error(
            `Todos los modelos de fallback agotaron su quota. Modelos intentados: ${errors.map(e => e.model).join(', ')}`
          );
        }

        throw error; // Error no relacionado con rate limit
      }
    }

    throw new Error('Fallback cascade failed unexpectedly');
  }

  // Sobrescribe doGenerate
  wrapper.doGenerate = async function (options: any) {
    return tryModelsInCascade('generate', options);
  };

  // Sobrescribe doStream
  wrapper.doStream = async function (options: any) {
    return tryModelsInCascade('stream', options);
  };

  return wrapper;
}

/**
 * ========================================
 * CONFIGURACIONES PREDEFINIDAS
 * ========================================
 */

/**
 * Configuración balanceada para uso general
 * Prioriza compatibilidad y disponibilidad
 * 
 * Cadena:
 * 1. Gemini 2.5 Flash Lite (gratis, 15 RPM, compatible con todas las features de Mastra)
 * 2. Groq Llama 3.3 70B (gratis, 30 RPM, MUY rápido, pero puede fallar con contextos grandes)
 * 3. OpenAI GPT-4o-mini (free tier, 3 RPM)
 * 
 * Nota: Gemini primero porque Groq tiene límites de TPM bajos (12,000) y no soporta
 * todos los content types de Mastra. Groq es mejor como fallback rápido.
 */
export const balancedFallbackChain = createMultiModelFallback({
  models: [
    {
      provider: 'google',
      model: 'gemini-2.5-flash-lite',
      displayName: 'Gemini 2.5 Flash Lite',
    },
    {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      displayName: 'Groq Llama 3.3 70B',
    },
    {
      provider: 'openai',
      model: 'gpt-4o-mini',
      displayName: 'OpenAI GPT-4o-mini',
    },
  ],
});

/**
 * Configuración ultra-rápida
 * Prioriza velocidad sobre todo
 * 
 * Cadena:
 * 1. Gemini 2.5 Flash Lite (rápido, compatible, 15 RPM)
 * 2. Groq Llama 3.1 8B (ULTRA rápido, 30 RPM, contexto limitado)
 * 3. Groq Mixtral 8x7B (muy rápido, 30 RPM, contexto limitado)
 * 
 * Nota: Gemini primero para mejor compatibilidad, Groq como fallback rápido
 */
export const ultraFastFallbackChain = createMultiModelFallback({
  models: [
    {
      provider: 'google',
      model: 'gemini-2.5-flash-lite',
      displayName: 'Gemini 2.5 Flash Lite',
    },
    {
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
      displayName: 'Groq Llama 3.1 8B Instant',
    },
    {
      provider: 'groq',
      model: 'mixtral-8x7b-32768',
      displayName: 'Groq Mixtral 8x7B',
    },
  ],
});

/**
 * Configuración premium
 * Para tareas que requieren máxima calidad
 * 
 * Cadena:
 * 1. OpenAI GPT-4o (mejor calidad)
 * 2. Groq Llama 3.3 70B (muy buena calidad)
 * 3. Gemini 2.5 Flash Lite (backup rápido)
 */
export const premiumFallbackChain = createMultiModelFallback({
  models: [
    {
      provider: 'openai',
      model: 'gpt-4o',
      displayName: 'OpenAI GPT-4o',
    },
    {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      displayName: 'Groq Llama 3.3 70B',
    },
    {
      provider: 'google',
      model: 'gemini-2.5-flash-lite',
      displayName: 'Gemini 2.5 Flash Lite',
    },
  ],
});

/**
 * Configuración solo gratuitos
 * Maximiza llamadas sin costo
 * 
 * Cadena:
 * 1. Gemini 2.5 Flash Lite (gratis, 15 RPM)
 * 2. Groq Llama 3.3 70B (gratis, 30 RPM)
 * 3. Groq Mixtral 8x7B (gratis, 30 RPM)
 * 4. OpenAI GPT-4o-mini (free tier, 3 RPM)
 */
export const freeTierMaxFallbackChain = createMultiModelFallback({
  models: [
    {
      provider: 'google',
      model: 'gemini-2.5-flash-lite',
      displayName: 'Gemini 2.5 Flash Lite',
    },
    {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      displayName: 'Groq Llama 3.3 70B',
    },
    {
      provider: 'groq',
      model: 'mixtral-8x7b-32768',
      displayName: 'Groq Mixtral 8x7B',
    },
    {
      provider: 'openai',
      model: 'gpt-4o-mini',
      displayName: 'OpenAI GPT-4o-mini',
    },
  ],
});

/**
 * ========================================
 * BACKWARD COMPATIBILITY
 * ========================================
 * Mantiene las configuraciones anteriores para no romper código existente
 */

export const geminiWithOpenAIFallback = createMultiModelFallback({
  models: [
    { provider: 'google', model: 'gemini-2.5-flash-lite' },
    { provider: 'openai', model: 'gpt-4o-mini' },
  ],
});

export const openaiWithGeminiFallback = createMultiModelFallback({
  models: [
    { provider: 'openai', model: 'gpt-4o-mini' },
    { provider: 'google', model: 'gemini-2.5-flash-lite' },
  ],
});

export const geminiProWithGPT4Fallback = createMultiModelFallback({
  models: [
    { provider: 'google', model: 'gemini-1.5-pro-latest' },
    { provider: 'openai', model: 'gpt-4o' },
  ],
});
