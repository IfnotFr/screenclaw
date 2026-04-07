import { linux } from "./os/linux.js";
import type { OS } from "./os/os.js";

export function useComputer(): OS {
  return linux;
}
