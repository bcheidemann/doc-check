import { readFileSync } from "fs";
import { ProjectOptions } from "ts-morph";
import { z } from "zod";
import { Options } from "./project.js";

const configSchema = z
  .object({
    exclude: z.array(z.string()).optional(),
    include: z.string().optional(),
    tsProjectOptions: z
      .custom<ProjectOptions>(
        (data) => typeof data === "object" && data !== null
      )
      .optional(),
    root: z.string().optional(),
  })
  .strict();

export function loadOptionsFromFile(
  configPath: string,
  throwIfNotFound = false
): Options | undefined {
  try {
    return configSchema.parse(JSON.parse(readFileSync(configPath, "utf8")));
  } catch (err: any) {
    if (!throwIfNotFound && err.code === "ENOENT") {
      // No config file found
      return;
    }
    throw err;
  }
}
