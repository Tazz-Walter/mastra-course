import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

export const saveEmailFeedbackTool = createTool({
  id: "save-email-feedback",
  description: "Guarda feedback de correos enviados para mejorar futuras respuestas.",
  inputSchema: z.object({
    recipient: z.string().optional(),
    subject: z.string().optional(),
    tone: z.enum(["formal", "casual"]).optional(),
    rating: z.number().min(1).max(10).describe("Puntaje de 1 a 10"),
    comment: z.string().optional(),
    emailBody: z.string().describe("Cuerpo del correo enviado"),
  }),
  outputSchema: z.object({
    saved: z.boolean(),
    path: z.string(),
  }),
  execute: async ({ inputData }) => {
    const outDir = path.join(process.cwd(), "..", "..", "notes");
    const outFile = path.join(outDir, "email_feedback.jsonl");

    try {
      await fs.mkdir(outDir, { recursive: true });
      const record = {
        ts: new Date().toISOString(),
        ...inputData,
      };
      await fs.appendFile(outFile, JSON.stringify(record) + "\n", "utf8");
      return { saved: true, path: outFile };
    } catch (err) {
      throw new Error(`No se pudo guardar el feedback: ${(err as Error).message}`);
    }
  },
});

