import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import ts from 'typescript';

const moduleCache = new Map();

function resolveLocalModule(
  fromFile,
  request,
) {
  const base = path.resolve(
    path.dirname(fromFile),
    request,
  );

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    base.endsWith('.js')
      ? base.slice(0, -3) + '.ts'
      : null,
    base.endsWith('.js')
      ? base.slice(0, -3) + '.tsx'
      : null,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ].filter(Boolean);

  const resolved =
    candidates.find((candidate) =>
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isFile(),
    );

  if (!resolved) {
    throw new Error(
      `Unable to resolve local TypeScript module "${request}" from ${fromFile}`,
    );
  }

  return resolved;
}

function loadAbsoluteTypeScriptModule(
  absolutePath,
) {
  const cached =
    moduleCache.get(absolutePath);

  if (cached) {
    return cached.exports;
  }

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
        esModuleInterop: true,
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

  moduleCache.set(
    absolutePath,
    moduleRecord,
  );

  const nodeRequire =
    createRequire(absolutePath);

  const localRequire = (
    request,
  ) => {
    if (
      typeof request === 'string' &&
      request.startsWith('.')
    ) {
      const resolved =
        resolveLocalModule(
          absolutePath,
          request,
        );

      if (
        resolved.endsWith('.ts') ||
        resolved.endsWith('.tsx')
      ) {
        return loadAbsoluteTypeScriptModule(
          resolved,
        );
      }
    }

    return nodeRequire(request);
  };

  const execute = new Function(
    'module',
    'exports',
    'require',
    '__filename',
    '__dirname',
    output.outputText,
  );

  execute(
    moduleRecord,
    moduleRecord.exports,
    localRequire,
    absolutePath,
    path.dirname(absolutePath),
  );

  return moduleRecord.exports;
}

export function loadTypeScriptModule(
  relativePath,
) {
  const absolutePath = path.resolve(
    process.cwd(),
    relativePath,
  );

  return loadAbsoluteTypeScriptModule(
    absolutePath,
  );
}
