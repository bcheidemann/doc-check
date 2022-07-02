import { Code } from "mdast";
import { z } from "zod";
import { parseMetaString } from "./helpers.js";

export type Lang = "ts" | "js" | "tsx" | "jsx" | string;

export interface SnippetOptions {
  ignore: boolean;
  lang: Lang | null;
  path: string | null;
}

const snippetMetaSchema = z.object({
  ignore: z.boolean().optional(),
  path: z.string().optional(),
});

export function getSnippetLang(snippet: Code): Lang | null {
  let lang: string | null = snippet.lang || null;
  if (lang?.endsWith(",")) {
    lang = lang.substring(0, lang.length - 1);
  }
  switch (lang) {
    case "typescript":
      return "ts";
    case "javascript":
      return "js";
    default:
      return lang;
  }
}

export function getSnippetOptions(snippet: Code) {
  const options: SnippetOptions = {
    ignore: false,
    path: null,
    lang: getSnippetLang(snippet),
  };
  if (snippet.meta) {
    const meta = snippetMetaSchema.parse(parseMetaString(snippet.meta));
    options.ignore = Boolean(meta.ignore);
    if (meta.path) {
      options.path = meta.path;
    }
  }
  return options;
}
