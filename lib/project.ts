import glob from "glob";
import { Code } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { Project as TsmProject, ProjectOptions, ts } from "ts-morph";
import { DefaultLogger, Logger } from "./logger.js";
import { concatArray } from "./helpers.js";
import { getSnippetOptions } from "./get-snippet-options.js";

interface File {
  path: string;
  text: string;
}

type DefaultOptions = Pick<
  Required<Options>,
  "logger" | "exclude" | "include" | "root"
>;

export interface Options {
  logger?: Logger;
  exclude?: string[];
  include?: string;
  root?: string;
  tsProjectOptions?: ProjectOptions;
}

type ResolvedOptions = DefaultOptions & Options;

export class Project extends TsmProject {
  private options: ResolvedOptions;

  static DEFAULT_OPTIONS: DefaultOptions = {
    logger: new DefaultLogger(),
    exclude: ["**/node_modules/**"],
    include: "**/*.md",
    root: "./",
  };

  constructor(options: Options = {}) {
    const resolvedOptions: ResolvedOptions = {
      ...Project.DEFAULT_OPTIONS,
      ...options,
      exclude: concatArray(Project.DEFAULT_OPTIONS.exclude, options.exclude),
    };
    const tsConfigFilePath =
      options.tsProjectOptions?.tsConfigFilePath ||
      ts.findConfigFile(resolvedOptions.root, ts.sys.fileExists);
    super({
      tsConfigFilePath: tsConfigFilePath,
      ...options.tsProjectOptions,
    });
    this.options = resolvedOptions;
  }

  private get languageService() {
    return this.getLanguageService().compilerObject;
  }

  private get fileSystem() {
    return this.getFileSystem();
  }

  private get logger() {
    return this.options.logger;
  }

  private async findMarkdownFiles() {
    return await new Promise<string[]>((resolve, reject) => {
      glob(
        this.options.include,
        {
          cwd: this.options.root,
          ignore: this.options.exclude,
        },
        (err, files) => {
          if (err) {
            reject(err);
          } else {
            resolve(files);
          }
        }
      );
    });
  }

  private checkMarkdownFile(file: File) {
    const markdownAst = fromMarkdown(file.text);
    const diagnostics = new Array<{
      diagnostic: ts.Diagnostic;
      content: Code;
    }>();
    let index = 0;
    markdownAst.children
      .map((content) => {
        if (content.type === "code") {
          const snippetOptions = getSnippetOptions(content);
          if (
            !snippetOptions.ignore &&
            snippetOptions.lang &&
            ["ts", "tsx", "js", "jsx"].includes(snippetOptions.lang)
          ) {
            const virtualSnippetFile: File = {
              path:
                snippetOptions.path ||
                `./${file.path}.${index++}.${content.lang}`,
              text: content.value,
            };
            this.createSourceFile(
              virtualSnippetFile.path,
              virtualSnippetFile.text
            );
            return {
              virtualSnippetFile,
              content,
            };
          }
        }
      })
      .forEach((data) => {
        if (data) {
          const { virtualSnippetFile, content } = data;
          diagnostics.push(
            ...this.languageService
              .getSyntacticDiagnostics(virtualSnippetFile.path)
              .map((diagnostic) => ({
                diagnostic,
                content,
              }))
          );
          diagnostics.push(
            ...this.languageService
              .getSuggestionDiagnostics(virtualSnippetFile.path)
              .map((diagnostic) => ({
                diagnostic,
                content,
              }))
          );
          diagnostics.push(
            ...this.languageService
              .getSemanticDiagnostics(virtualSnippetFile.path)
              .map((diagnostic) => ({
                diagnostic,
                content,
              }))
          );
        }
      });

    const markdownSourceFile = ts.createSourceFile(
      file.path,
      file.text,
      ts.ScriptTarget.ES2022
    );

    const mappedDiagnostics = diagnostics
      // Diagnostic hack - makes it look like the error is in the markdown file
      // TODO: recursively follow diagnostic message chains (message chains have
      //       incorrect file names)
      .map(
        ({ diagnostic, content }): ts.Diagnostic => ({
          ...diagnostic,
          source: file.text,
          // FIXME: This is inaccurate in some situations
          start: diagnostic.start! + content.position!.start.offset! + 1,
          file: markdownSourceFile,
        })
      );

    this.logger.logDiagnostics(mappedDiagnostics);

    return {
      error: mappedDiagnostics.some(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
      ),
    };
  }

  private async checkMarkdownFiles() {
    const inputs = await this.findMarkdownFiles();

    return inputs.map((path) =>
      this.checkMarkdownFile({
        path,
        text: this.fileSystem.readFileSync(path),
      })
    );
  }

  private logConfigFileDiagnostics() {
    this.logger.logDiagnostics(
      this.getConfigFileParsingDiagnostics().map(
        (tsmDiagnositc) => tsmDiagnositc.compilerObject
      )
    );
  }

  public async checkMarkdown() {
    this.logConfigFileDiagnostics();
    const results = await this.checkMarkdownFiles();
    return {
      error: results.some(({ error }) => error),
    };
  }
}
