import { ts } from "ts-morph";

export interface DiagnosticLogger {
  log(diagnostics: ts.Diagnostic[]): void;
}

export class DefaultDiagnosticLogger implements DiagnosticLogger {
  public log(diagnostics: ts.Diagnostic[]) {
    const diagnosticOutput = ts.formatDiagnosticsWithColorAndContext(
      diagnostics.filter(
        (diagnostic) => diagnostic.category !== ts.DiagnosticCategory.Suggestion
      ),
      {
        getCanonicalFileName(fileName: string) {
          return fileName;
        },
        getCurrentDirectory() {
          return process.cwd();
        },
        getNewLine() {
          return "\n";
        },
      }
    );

    console.log(diagnosticOutput);
  }
}
