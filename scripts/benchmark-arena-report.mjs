#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  loadTypeScriptModule,
} from './lib/load-typescript-module.mjs';

const {
  parseBenchmarkCase,
  parseBenchmarkObservation,
} = loadTypeScriptModule(
  'src/core/benchmark/benchmarkArena.ts',
);

const {
  parseBenchmarkRunManifest,
} = loadTypeScriptModule(
  'src/core/benchmark/benchmarkRun.ts',
);

const {
  buildBenchmarkReport,
} = loadTypeScriptModule(
  'src/core/benchmark/benchmarkReport.ts',
);

const MAX_INPUT_BYTES = 16 * 1024 * 1024;

function fail(message) {
  process.stderr.write(
    'MUDRIK BENCHMARK REPORT: FAIL: ' + message + '\n',
  );
  process.exit(1);
}

function parseArgs(argv) {
  const values = new Map();

  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];

    if (
      typeof key !== 'string'
      || !key.startsWith('--')
      || typeof value !== 'string'
    ) {
      fail('arguments must be --name value pairs');
    }

    if (values.has(key)) {
      fail('duplicate argument: ' + key);
    }

    values.set(key, value);
  }

  for (const required of [
    '--manifest',
    '--cases',
    '--observations',
  ]) {
    if (!values.has(required)) {
      fail('missing required argument: ' + required);
    }
  }

  return values;
}

function readJson(filePath) {
  const absolutePath = path.resolve(filePath);
  const stat = fs.statSync(absolutePath);

  if (!stat.isFile()) {
    fail('input is not a file: ' + filePath);
  }

  if (stat.size > MAX_INPUT_BYTES) {
    fail('input exceeds 16 MiB limit: ' + filePath);
  }

  try {
    return JSON.parse(
      fs.readFileSync(absolutePath, 'utf8'),
    );
  } catch {
    fail('invalid JSON: ' + filePath);
  }
}

function parseArray(
  value,
  parser,
  label,
) {
  if (!Array.isArray(value)) {
    fail(label + ' must be a JSON array');
  }

  return value.map((item, index) => {
    const parsed = parser(item);
    if (!parsed) {
      fail(
        label + '[' + index + '] failed validation',
      );
    }
    return parsed;
  });
}

const args = parseArgs(process.argv.slice(2));

const manifest =
  parseBenchmarkRunManifest(
    readJson(args.get('--manifest')),
  );

if (!manifest) {
  fail('manifest failed validation');
}

const cases = parseArray(
  readJson(args.get('--cases')),
  parseBenchmarkCase,
  'cases',
);

const observations = parseArray(
  readJson(args.get('--observations')),
  parseBenchmarkObservation,
  'observations',
);

const report =
  buildBenchmarkReport(
    manifest,
    cases,
    observations,
  );

if (!report.accepted || !report.value) {
  fail('report rejected: ' + report.reason);
}

const output =
  JSON.stringify(report.value, null, 2) + '\n';
const outputPath = args.get('--out');

if (outputPath) {
  fs.writeFileSync(
    path.resolve(outputPath),
    output,
    { flag: 'wx' },
  );
} else {
  process.stdout.write(output);
}
