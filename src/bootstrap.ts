import { useComputer } from "#/core/utils/use-computer.js";

export async function bootstrap() {
  await useComputer().setup();
}
