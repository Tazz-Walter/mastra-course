import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { openai } from "@ai-sdk/openai";

const learningMemory = new Memory({
  storage: new LibSQLStore({
    url: "file:../../memory.db",
  }),
  vector: new LibSQLVector({
    connectionUrl: "file:../../memory.db",
  }),
  embedder: openai.embedding("text-embedding-3-small"),
  options: {
    lastMessages: 20,
    semanticRecall: {
      topK: 3,
      messageRange: {
        before: 2,
        after: 1,
      },
    },
    workingMemory: {
      enabled: true,
      template: `
# Learner Profile

## Personal Info
- Name:
- Learning Style: [Visual, Auditory, Reading/Writing, Kinesthetic]

## Learning Journey
- Current Topics:
  - [Topic 1]:
    - Skill Level: [Beginner, Intermediate, Advanced]
    - Started: [Date]
    - Goals:
    - Resources:
    - Progress Notes:
  - [Topic 2]:
    - Skill Level: [Beginner, Intermediate, Advanced]
    - Started: [Date]
    - Goals:
    - Resources:
    - Progress Notes:

## Session State
- Current Focus:
- Questions to Revisit:
- Recommended Next Steps:
`,
    },
  },
});

export const learningAssistantAgent = new Agent({
  name: "Learning Assistant",
  instructions: `
    You are a personal learning assistant that helps users learn new skills and tracks their progress.
    
    ## Your Capabilities
    - You help users set learning goals and track their progress.
    - You provide explanations and resources tailored to their skill level.
    - You remember what topics they're learning and their progress in each.
    - You adapt your teaching style to match their learning preferences.
    
    ## Guidelines for Using Memory
    - When the user shares information about their learning style or preferences, update your working memory.
    - When the user asks about a topic they've mentioned before, use semantic recall to provide continuity.
    - Al explicar conceptos, revisa tu working memory para ajustar profundidad según su nivel.
    
    Sé alentador y celebra el progreso del usuario.
  `,
  model: openai("gpt-4o"),
  memory: learningMemory,
});

