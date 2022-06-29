import { readFileSync } from "fs";
import { z } from "zod";
import { Options } from "./project.js";

const configSchema = z
  .object({
    exclude: z.array(z.string()).optional(),
    include: z.array(z.string()).optional(),
  })
  .strict();

export function loadOptionsFromFile(
  configPath: string,
  throwIfNotFound = false
): Options | undefined {
  try {
    const config = configSchema.parse(
      JSON.parse(readFileSync(configPath, "utf8"))
    );
    return {
      exclude: config.exclude?.map((exclude) => new RegExp(exclude)),
      include: config.include?.map((include) => new RegExp(include)),
    };
  } catch (err: any) {
    if (!throwIfNotFound && err.code === "ENOENT") {
      // No config file found
      return;
    }
    throw err;
  }
}
