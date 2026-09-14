import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const workflowDirectory = '.github/workflows';
const workflowFiles = fs
  .readdirSync(workflowDirectory)
  .filter((name) => /\.ya?ml$/i.test(name))
  .sort();

test(
  'all external GitHub Actions are pinned to immutable commit SHAs',
  () => {
    assert.ok(workflowFiles.length > 0);

    for (const name of workflowFiles) {
      const workflowPath = path.join(
        workflowDirectory,
        name,
      );
      const content = fs.readFileSync(
        workflowPath,
        'utf8',
      );

      const actionRefs = content
        .split(/\r?\n/)
        .map((line) => line.match(/^\s*uses:\s*([^\s#]+)\s*$/)?.[1])
        .filter(Boolean);

      for (const actionRef of actionRefs) {
        if (actionRef.startsWith('./')) {
          continue;
        }

        assert.match(
          actionRef,
          /^[^@\s]+@[0-9a-f]{40}$/,
          `${workflowPath} contains a floating or non-SHA action reference: ${actionRef}`,
        );
      }
    }
  },
);
