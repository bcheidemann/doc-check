import { ts } from "ts-morph";

export interface Message {
  message: string;
  category: ts.DiagnosticCategory;
}

export interface Logger {
  logDiagnostics(diagnostics: ts.Diagnostic[]): void;
  log(message: Message): void;
}

export class DefaultLogger implements Logger {
  private categoryToString(category: ts.DiagnosticCategory) {
    switch (category) {
      case ts.DiagnosticCategory.Error:
        return "error";
      case ts.DiagnosticCategory.Warning:
        return "warning";
      case ts.DiagnosticCategory.Suggestion:
        return "suggestion";
      case ts.DiagnosticCategory.Message:
      default:
        return null;
    }
  }

  public log({ message, category }: Message) {
    if (category === ts.DiagnosticCategory.Message) {
      console.log(message);
      return;
    }
    console.log(`${this.categoryToString(category)}: ${message}`);
  }

  public logDiagnostics(diagnostics: ts.Diagnostic[]) {
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
