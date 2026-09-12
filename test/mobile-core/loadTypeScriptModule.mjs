import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import ts from 'typescript';

const require = createRequire(import.meta.url);

export function loadTypeScriptModule(
  relativePath,
) {
  const absolutePath = path.resolve(
    process.cwd(),
    relativePath,
  );

  const source = fs.readFileSync(
    absolutePath,
    'utf8',
  );

  const output = ts.transpileModule(
    source,
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        strict: true,
      },
      fileName: absolutePath,
      reportDiagnostics: true,
    },
  );

  const errors = output.diagnostics?.filter(
    (diagnostic) =>
      diagnostic.category ===
      ts.DiagnosticCategory.Error,
  ) ?? [];

  if (errors.length > 0) {
    throw new Error(
      errors
        .map((diagnostic) =>
          ts.flattenDiagnosticMessageText(
            diagnostic.messageText,
            '\n',
          ),
        )
        .join('\n'),
    );
  }

  const moduleRecord = {
    exports: {},
  };

  const execute = new Function(
    'module',
    'exports',
    'require',
    output.outputText,
  );

  execute(
    moduleRecord,
    moduleRecord.exports,
    require,
  );

  return moduleRecord.exports;
}
