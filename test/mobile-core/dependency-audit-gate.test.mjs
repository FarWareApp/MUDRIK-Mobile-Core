import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  spawnSync,
} from 'node:child_process';
import test from 'node:test';

const scriptPath =
  'scripts/dependency-audit-gate.mjs';

function advisoryRecord({
  id,
  moduleName,
  severity,
  url,
  paths,
}) {
  return JSON.stringify({
    type: 'auditAdvisory',
    data: {
      advisory: {
        id,
        module_name: moduleName,
        severity,
        title:
          'synthetic advisory',
        url,
        findings: [
          {
            version: '1.0.0',
            paths,
          },
        ],
      },
    },
  });
}

function runAudit(
  records,
) {
  const directory =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'mudrik-audit-gate-',
      ),
    );
  const auditFile =
    path.join(
      directory,
      'audit.jsonl',
    );

  fs.writeFileSync(
    auditFile,
    records.join('\n'),
  );

  try {
    return spawnSync(
      process.execPath,
      [
        scriptPath,
        auditFile,
      ],
      {
        encoding: 'utf8',
      },
    );
  } finally {
    fs.rmSync(
      directory,
      {
        recursive: true,
        force: true,
      },
    );
  }
}

test(
  'dependency gate permits only the reviewed node-forge Expo CLI advisory path',
  () => {
    const result =
      runAudit([
        advisoryRecord({
          id: 1240912,
          moduleName:
            'node-forge',
          severity: 'high',
          url:
            'https://github.com/advisories/GHSA-86w9-cpqp-85rv',
          paths: [
            'expo>@expo/cli>node-forge',
            'expo>@expo/cli>@expo/code-signing-certificates>node-forge',
          ],
        }),
      ]);

    assert.equal(
      result.status,
      0,
      result.stderr,
    );
    assert.match(
      result.stdout,
      /reviewed-high/,
    );
    assert.match(
      result.stdout,
      /0 unreviewed High\/Critical advisories/,
    );
  },
);

test(
  'dependency gate blocks the same advisory if it reaches a runtime path',
  () => {
    const result =
      runAudit([
        advisoryRecord({
          id: 1240912,
          moduleName:
            'node-forge',
          severity: 'high',
          url:
            'https://github.com/advisories/GHSA-86w9-cpqp-85rv',
          paths: [
            'mudrik-runtime>node-forge',
          ],
        }),
      ]);

    assert.equal(
      result.status,
      1,
    );
    assert.match(
      result.stderr,
      /Blocking dependency vulnerabilities detected/,
    );
  },
);

test(
  'dependency gate blocks any unreviewed High advisory',
  () => {
    const result =
      runAudit([
        advisoryRecord({
          id: 9999999,
          moduleName:
            'synthetic-runtime',
          severity: 'high',
          url:
            'https://example.invalid/advisory',
          paths: [
            'mudrik-runtime>synthetic-runtime',
          ],
        }),
      ]);

    assert.equal(
      result.status,
      1,
    );
  },
);

test(
  'dependency gate always blocks Critical advisories',
  () => {
    const result =
      runAudit([
        advisoryRecord({
          id: 1240912,
          moduleName:
            'node-forge',
          severity:
            'critical',
          url:
            'https://github.com/advisories/GHSA-86w9-cpqp-85rv',
          paths: [
            'expo>@expo/cli>node-forge',
          ],
        }),
      ]);

    assert.equal(
      result.status,
      1,
    );
  },
);

test(
  'dependency gate ignores duplicate audit records when counting reviewed advisories',
  () => {
    const record =
      advisoryRecord({
        id: 1240912,
        moduleName:
          'node-forge',
        severity: 'high',
        url:
          'https://github.com/advisories/GHSA-86w9-cpqp-85rv',
        paths: [
          'expo>@expo/cli>node-forge',
        ],
      });

    const result =
      runAudit([
        record,
        record,
      ]);

    assert.equal(
      result.status,
      0,
      result.stderr,
    );
    assert.match(
      result.stdout,
      /1 reviewed High advisory path\(s\)/,
    );
  },
);
