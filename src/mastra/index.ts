
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow';
import { contentWorkflow, aiContentWorkflow, parallelAnalysisWorkflow, conditionalWorkflow } from './workflows/content-workflow';
import { emailWorkflow } from './workflows/email-workflow';
import { weatherAgent } from './agents/weather-agent';
import { financialAgent } from './agents/financial-agent';
import { learningAssistantAgent } from './agents/learning-assistant';
import { contentAgent } from './agents/content-agent';
import { wallyAgent } from './agents/wally-agent';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';
import { emailQualityScorer, githubSafetyScorer, responseTimeScorer } from './scorers/wally-scorer';

export const mastra = new Mastra({
  workflows: { weatherWorkflow, contentWorkflow, aiContentWorkflow, parallelAnalysisWorkflow, conditionalWorkflow, emailWorkflow },
  agents: { weatherAgent, financialAgent, learningAssistantAgent, contentAgent, wallyAgent },
  scorers: { 
    // Weather agent scorers
    toolCallAppropriatenessScorer, 
    completenessScorer, 
    translationScorer,
    // Wally agent scorers
    emailQualityScorer,
    githubSafetyScorer,
    responseTimeScorer,
  },
  storage: new LibSQLStore({
    // stores observability, scores, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false, 
  },
  observability: {
    // Enables DefaultExporter and CloudExporter for AI tracing
    default: { enabled: true }, 
  },
});
