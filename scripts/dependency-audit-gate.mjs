import fs from 'node:fs';

const auditPath =
  process.argv[2]
  ?? '/tmp/yarn-audit.jsonl';

const REVIEWED_HIGH_ADVISORIES = new Map([
  [
    '1240912',
    {
      moduleName: 'node-forge',
      url: 'https://github.com/advisories/GHSA-86w9-cpqp-85rv',
      allowedPathPattern:
        /^expo>@expo\/cli(?:>|$)/,
      rationale:
        'Expo CLI build tooling only; no runtime dependency path. Upstream advisory currently exposes no patched release.',
    },
  ],
]);

function parseAudit(path) {
  const lines =
    fs
      .readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean);

  const seen = new Set();
  const advisories = [];

  for (const line of lines) {
    let record;

    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }

    if (
      record.type
      !== 'auditAdvisory'
    ) {
      continue;
    }

    const advisory =
      record.data?.advisory;

    if (!advisory) {
      continue;
    }

    const key = String(
      advisory.id
      ?? advisory.url
      ?? JSON.stringify(advisory),
    );

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    advisories.push(advisory);
  }

  return advisories;
}

function findingPaths(
  advisory,
) {
  return (
    advisory.findings
      ?.flatMap(
        (finding) =>
          finding.paths ?? [],
      )
    ?? []
  ).map(String);
}

function reviewedHighReason(
  advisory,
) {
  const id = String(
    advisory.id ?? '',
  );

  const review =
    REVIEWED_HIGH_ADVISORIES.get(id);

  if (!review) {
    return null;
  }

  if (
    advisory.module_name
    !== review.moduleName
  ) {
    return null;
  }

  if (
    advisory.url
    !== review.url
  ) {
    return null;
  }

  const paths =
    findingPaths(advisory);

  if (paths.length === 0) {
    return null;
  }

  if (
    !paths.every(
      (path) =>
        review
          .allowedPathPattern
          .test(path),
    )
  ) {
    return null;
  }

  return review.rationale;
}

const advisories =
  parseAudit(auditPath);

const counts = {
  info: 0,
  low: 0,
  moderate: 0,
  high: 0,
  critical: 0,
};

const reviewedHigh = [];
const blocking = [];

for (const advisory of advisories) {
  const severity =
    String(
      advisory.severity ?? '',
    ).toLowerCase();

  if (severity in counts) {
    counts[severity] += 1;
  }

  const line =
    `[${severity || 'unknown'}] `
    + `${advisory.module_name ?? 'unknown'}: `
    + `${advisory.title ?? 'untitled advisory'}`
    + (
      advisory.url
        ? ` (${advisory.url})`
        : ''
    );

  console.log(line);

  if (
    severity === 'critical'
  ) {
    blocking.push(advisory);
    continue;
  }

  if (severity === 'high') {
    const reason =
      reviewedHighReason(
        advisory,
      );

    if (!reason) {
      blocking.push(advisory);
      continue;
    }

    reviewedHigh.push({
      advisory,
      reason,
      paths:
        findingPaths(advisory),
    });
  }
}

console.log(
  'Dependency vulnerability counts:',
  counts,
);

for (
  const item
  of reviewedHigh
) {
  console.log(
    '[reviewed-high] '
    + `${item.advisory.module_name}: `
    + item.reason,
  );

  for (
    const path
    of item.paths
  ) {
    console.log(
      `  reviewed path: ${path}`,
    );
  }
}

if (blocking.length > 0) {
  console.error(
    'Blocking dependency vulnerabilities detected:',
  );

  for (
    const advisory
    of blocking
  ) {
    console.error(
      `- [${advisory.severity}] `
      + `${advisory.module_name}: `
      + `${advisory.title}`,
    );
  }

  process.exit(1);
}

console.log(
  'Dependency audit gate passed. '
  + `${reviewedHigh.length} reviewed High advisory path(s); `
  + '0 unreviewed High/Critical advisories.',
);
