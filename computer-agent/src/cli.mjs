#!/usr/bin/env node

import fs from 'node:fs/promises';
import process from 'node:process';

import { ComputerTaskRunner } from './task-runner.mjs';

function usage() {
  console.error(
    'Usage: node ./src/cli.mjs --task <task.json> --grants <grants.json>',
  );
}

function parseArgs(argv) {
  const result = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--task' || token === '--grants') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error(`Missing value for ${token}`);
      }

      result[token.slice(2)] = value;
      index += 1;
    }
  }

  return result;
}

async function readJson(path) {
  const text = await fs.readFile(path, 'utf8');
  return JSON.parse(text);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.task || !args.grants) {
    usage();
    process.exitCode = 64;
    return;
  }

  const [task, grantsDocument] = await Promise.all([
    readJson(args.task),
    readJson(args.grants),
  ]);

  const grants = Array.isArray(grantsDocument)
    ? grantsDocument
    : grantsDocument.grants;

  if (!Array.isArray(grants)) {
    throw new Error('Grants file must contain an array or { "grants": [] }.');
  }

  const runner = new ComputerTaskRunner({
    grants,
    onEvent: (event) => {
      process.stderr.write(`${JSON.stringify(event)}\n`);
    },
  });

  const result = await runner.run(task);

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

  if (result.status === 'succeeded') {
    process.exitCode = 0;
  } else if (result.status === 'blocked') {
    process.exitCode = 3;
  } else if (result.status === 'cancelled') {
    process.exitCode = 130;
  } else {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.stack ?? error.message : String(error),
  );
  process.exitCode = 1;
});
