import { Code } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { join } from "path";
import {
  Diagnostic,
  Project as TsmProject,
  ProjectOptions,
  ts,
} from "ts-morph";
import {
  DefaultDiagnosticLogger,
  DiagnosticLogger,
} from "./diagnostic-logger.js";
import { concatArray } from "./helpers.js";

interface File {
  path: string;
  text: string;
}

type DefaultOptions = Pick<
  Required<Options>,
  "diagnositcLogger" | "exclude" | "include" | "root"
>;

export interface Options {
  diagnositcLogger?: DiagnosticLogger;
  exclude?: RegExp[];
  include?: RegExp[];
  root?: string;
  tsProjectOptions?: ProjectOptions;
}

type ResolvedOptions = DefaultOptions & Options;

export class Project extends TsmProject {
  private options: ResolvedOptions;

  static DEFAULT_OPTIONS: DefaultOptions = {
    diagnositcLogger: new DefaultDiagnosticLogger(),
    exclude: [
      /^(?:.*[\\\/])?node_modules(?:[\\\/].*)?$/,
      /^(?:.*[\\\/])?\.git(?:[\\\/].*)?$/,
    ],
    include: [/.md$/g],
    root: "./",
  };

  constructor(options: Options = {}) {
    const tsConfigFilePath = ts.findConfigFile("./", ts.sys.fileExists);
    super({
      tsConfigFilePath: tsConfigFilePath,
      ...options.tsProjectOptions,
    });
    this.options = {
      ...Project.DEFAULT_OPTIONS,
      exclude: concatArray(Project.DEFAULT_OPTIONS.exclude, options.exclude),
      include: concatArray(Project.DEFAULT_OPTIONS.include, options.include),
      ...options,
    };
  }

  private get languageService() {
    return this.getLanguageService().compilerObject;
  }

  private get fileSystem() {
    return this.getFileSystem();
  }

  private get diagnosticLogger() {
    return this.options.diagnositcLogger;
  }

  private findMarkdownFiles(dir = this.options.root) {
    const ents = this.fileSystem.readDirSync(dir);
    return ents
      .map((ent): string | string[] => {
        const path = ent.name;
        if (this.options.exclude.some((exclude) => exclude.test(path))) {
          return [];
        }
        if (ent.isDirectory) {
          return this.findMarkdownFiles(path);
        }
        if (
          ent.isFile &&
          this.options.include.some((include) => include.test(path))
        ) {
          return path;
        }
        return [];
      })
      .flat();
  }

  private checkMarkdownFileSync(file: File) {
    const markdownAst = fromMarkdown(file.text);
    const diagnostics = new Array<{
      diagnostic: ts.Diagnostic;
      content: Code;
    }>();
    let index = 0;
    markdownAst.children
      .map((content) => {
        if (
          content.type === "code" &&
          // TODO: Handle expanded langs (e.g. typescript)
          (content.lang === "ts" ||
            content.lang === "tsx" ||
            content.lang === "js" ||
            content.lang === "jsx")
        ) {
          const virtualSnippetFile: File = {
            path: `./${file.path}.${index++}.${content.lang}`,
            text: content.value,
          };
          const sourceFile = this.createSourceFile(
            virtualSnippetFile.path,
            virtualSnippetFile.text
          );
          const firstLineComment = sourceFile
            .getFirstChildIfKind(ts.SyntaxKind.SyntaxList)
            ?.getFirstChildIfKind(ts.SyntaxKind.SingleLineCommentTrivia);
          if (firstLineComment) {
            const maybeFilePath = firstLineComment
              .getText()
              .substring("// ".length);
            if (maybeFilePath.endsWith(`.${content.lang}`)) {
              this.removeSourceFile(sourceFile);
              virtualSnippetFile.path = maybeFilePath;
              this.createSourceFile(
                virtualSnippetFile.path,
                virtualSnippetFile.text
              );
            }
          }
          return {
            virtualSnippetFile,
            content,
          };
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

    this.diagnosticLogger.log(mappedDiagnostics);

    return {
      code: mappedDiagnostics.some(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
      )
        ? 1
        : 0,
    };
  }

  private checkMarkdownFilesSync() {
    return this.findMarkdownFiles().map((path) =>
      this.checkMarkdownFileSync({
        path,
        text: this.fileSystem.readFileSync(path),
      })
    );
  }

  private logConfigFileDiagnostics() {
    this.diagnosticLogger.log(
      this.getConfigFileParsingDiagnostics().map(
        (tsmDiagnositc) => tsmDiagnositc.compilerObject
      )
    );
  }

  public checkMarkdownSync() {
    this.logConfigFileDiagnostics();
    return {
      code: this.checkMarkdownFilesSync().some(({ code }) => Boolean(code))
        ? 1
        : 0,
    };
  }
}
