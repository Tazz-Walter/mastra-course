import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { weatherTool } from "../tools/weather-tool";

// Clasifica el tono y ruta de procesado según rol/longitud/hint
export const classifyToneStep = createStep({
  id: "classify-tone",
  description: "Clasifica tono (formal/casual) según rol y pista de tono",
  inputSchema: z.object({
    recipientName: z.string().optional(),
    recipientRole: z.string().optional(), // ej: jefe, amigo, cliente
    toneHint: z.enum(["formal", "casual"]).optional(),
    subject: z.string(),
    message: z.string(),
    includeWeather: z.boolean().default(false),
    location: z.string().optional(),
  }),
  outputSchema: z.object({
    recipientName: z.string().optional(),
    recipientRole: z.string().optional(),
    tone: z.enum(["formal", "casual"]),
    subject: z.string(),
    message: z.string(),
    includeWeather: z.boolean(),
    location: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const { recipientRole, toneHint, subject, message, includeWeather, location, recipientName } =
      inputData;

    let tone: "formal" | "casual" = "formal";
    const text = `${subject} ${message}`.toLowerCase();
    const friendlyKeywords = ["hola", "hey", "che", "amigo", "gracias", "😊"];

    const isFriendly =
      friendlyKeywords.some((k) => text.includes(k)) ||
      (recipientRole && /amigo|friend/i.test(recipientRole));

    if (toneHint === "casual" || isFriendly) tone = "casual";
    if (toneHint === "formal") tone = "formal";
    if (recipientRole && /jefe|boss|director|ceo|manager/i.test(recipientRole)) tone = "formal";

    return {
      recipientName,
      recipientRole,
      tone,
      subject,
      message,
      includeWeather,
      location,
    };
  },
});

export const composeFormalEmailStep = createStep({
  id: "compose-formal-email",
  description: "Redacta correo formal",
  inputSchema: z.object({
    recipientName: z.string().optional(),
    recipientRole: z.string().optional(),
    tone: z.enum(["formal", "casual"]),
    subject: z.string(),
    message: z.string(),
    includeWeather: z.boolean(),
    location: z.string().optional(),
  }),
  outputSchema: z.object({
    email: z.string(),
    tone: z.enum(["formal", "casual"]),
    weatherIncluded: z.boolean(),
  }),
  execute: async ({ inputData, mastra }) => {
    const { recipientName, recipientRole, subject, message, includeWeather, location } = inputData;

    let weatherSnippet = "";
    if (includeWeather && location) {
      try {
        const weather = await weatherTool.execute({
          context: { location },
          runtimeContext: {} as any,
        });
        weatherSnippet = ` Clima en ${weather.location}: ${weather.temperature}°C, sensación ${weather.feelsLike}°C, humedad ${weather.humidity}%.`;
      } catch (err) {
        weatherSnippet = "";
        console.warn("Weather fetch failed:", (err as Error).message);
      }
    }

    const agent = mastra.getAgent("wallyAgent");
    const { text } = await agent.generate(
      [
        {
          role: "user",
          content: `
Redacta un correo formal en español.
Destinatario: ${recipientName ?? "N/D"} (${recipientRole ?? "N/D"})
Asunto: ${subject}
Puntos clave: ${message}
${weatherSnippet ? `Incluye una línea breve con clima: ${weatherSnippet}` : ""}

Estructura:
- Saludo formal
- Desarrollo claro y conciso
- Cierre con llamado a acción si aplica
- Firma breve
`,
        },
      ],
      {
        // IDs estáticos de ejemplo; en producción deben venir de la app
        resourceId: "user_wally",
        threadId: "email_formal",
      },
    );

    return {
      email: text,
      tone: "formal" as const,
      weatherIncluded: Boolean(weatherSnippet),
    };
  },
});

export const composeCasualEmailStep = createStep({
  id: "compose-casual-email",
  description: "Redacta correo casual",
  inputSchema: z.object({
    recipientName: z.string().optional(),
    recipientRole: z.string().optional(),
    tone: z.enum(["formal", "casual"]),
    subject: z.string(),
    message: z.string(),
    includeWeather: z.boolean(),
    location: z.string().optional(),
  }),
  outputSchema: z.object({
    email: z.string(),
    tone: z.enum(["formal", "casual"]),
    weatherIncluded: z.boolean(),
  }),
  execute: async ({ inputData, mastra }) => {
    const { recipientName, subject, message, includeWeather, location } = inputData;

    let weatherSnippet = "";
    if (includeWeather && location) {
      try {
        const weather = await weatherTool.execute({
          context: { location },
          runtimeContext: {} as any,
        });
        weatherSnippet = ` Clima en ${weather.location}: ${weather.temperature}°C, sensación ${weather.feelsLike}°C.`;
      } catch (err) {
        weatherSnippet = "";
        console.warn("Weather fetch failed:", (err as Error).message);
      }
    }

    const agent = mastra.getAgent("wallyAgent");
    const { text } = await agent.generate(
      [
        {
          role: "user",
          content: `
Redacta un correo amistoso y breve en español.
Destinatario: ${recipientName ?? "N/D"}
Asunto: ${subject}
Puntos clave: ${message}
${weatherSnippet ? `Incluye una línea corta con clima: ${weatherSnippet}` : ""}

Estructura:
- Saludo cercano
- Mensaje directo y positivo
- Cierre amigable
`,
        },
      ],
      {
        resourceId: "user_wally",
        threadId: "email_casual",
      },
    );

    return {
      email: text,
      tone: "casual" as const,
      weatherIncluded: Boolean(weatherSnippet),
    };
  },
});

export const emailWorkflow = createWorkflow({
  id: "email-reply-workflow",
  description: "Responde correos con tono formal o casual y opcional clima",
  inputSchema: z.object({
    recipientName: z.string().optional(),
    recipientRole: z.string().optional(),
    toneHint: z.enum(["formal", "casual"]).optional(),
    subject: z.string(),
    message: z.string(),
    includeWeather: z.boolean().default(false),
    location: z.string().optional(),
  }),
  outputSchema: z.object({
    email: z.string(),
    tone: z.enum(["formal", "casual"]),
    weatherIncluded: z.boolean(),
  }),
})
  .then(classifyToneStep)
  .branch([
    [async ({ inputData }) => inputData.tone === "formal", composeFormalEmailStep],
    [async ({ inputData }) => inputData.tone === "casual", composeCasualEmailStep],
  ])
  .commit();

