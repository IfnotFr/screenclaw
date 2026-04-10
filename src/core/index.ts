import { useEvents } from "ai-sdk-agentic";

export * from "./config.js";
export * from "./utils/use-model.js";
export * from "./utils/use-storage.js";
export * from "./plugins/storage.js";
export * from "./utils/use-image.js";
export * from "./utils/use-computer.js";
export * from "./utils/use-skill.js";

/**
 * logger: Project-wide alias for the central logging system.
 */
export const logger = useEvents() as ReturnType<typeof useEvents> & {
  chat: (stream: AsyncIterable<string>) => Promise<void>;
};

logger.chat = async (stream: AsyncIterable<string>) => {
  for await (const chunk of stream) {
    logger.write(chunk);
  }
  logger.write("\n");
};

export { useEvents, useMission } from "ai-sdk-agentic";
export * from "./types.js";
