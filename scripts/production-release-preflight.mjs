import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  loadTypeScriptModule,
} from './lib/load-typescript-module.mjs';

function runGit(...args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function fail(message) {
  console.error(`PRODUCTION RELEASE PREFLIGHT: FAIL: ${message}`);
  process.exit(1);
}

const head = runGit('rev-parse', 'HEAD');
const dirty = runGit('status', '--porcelain');

if (dirty) {
  fail('working tree is not clean; production evidence must map to an exact committed SHA');
}

const releaseManifestPath =
  process.env.MUDRIK_RELEASE_MANIFEST;

if (
  typeof releaseManifestPath !== 'string'
  || releaseManifestPath.trim().length === 0
) {
  fail(
    'MUDRIK_RELEASE_MANIFEST must point to an exact-SHA Section 20 certification manifest',
  );
}

const resolvedReleaseManifestPath =
  path.resolve(releaseManifestPath);

if (!fs.existsSync(resolvedReleaseManifestPath)) {
  fail(
    'Section 20 certification manifest does not exist',
  );
}

let releaseManifest;

try {
  releaseManifest = JSON.parse(
    fs.readFileSync(
      resolvedReleaseManifestPath,
      'utf8',
    ),
  );
} catch {
  fail(
    'Section 20 certification manifest is not valid JSON',
  );
}

if (releaseManifest?.candidateSha !== head) {
  fail(
    'Section 20 certification manifest candidateSha does not match current HEAD',
  );
}

const {
  evaluateWholeSystemReleaseGate,
} = loadTypeScriptModule(
  'src/core/release/wholeSystemReleaseGate.ts',
);

const releaseDecision =
  evaluateWholeSystemReleaseGate(
    releaseManifest,
    Date.now(),
  );

if (!releaseDecision.productionAllowed) {
  fail(
    'Section 20 production gate blocked: '
      + releaseDecision.blockers.join(', '),
  );
}

const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const eas = JSON.parse(fs.readFileSync('eas.json', 'utf8'));

if (eas?.cli?.requireCommit !== true) {
  fail('EAS CLI must require a committed working tree');
}

if (eas?.cli?.appVersionSource !== 'remote') {
  fail('production version source must be remote');
}

const production = eas?.build?.production;
if (!production) {
  fail('eas.json is missing build.production');
}

if (production.autoIncrement !== true) {
  fail('production builds must auto-increment developer-facing build versions');
}

if (production.environment !== 'production') {
  fail('production build must use the production EAS environment');
}

if (
  production?.android?.buildType !== undefined
  && production.android.buildType !== 'app-bundle'
) {
  fail('production Android artifact must remain an app bundle');
}

const preview = eas?.build?.preview;
if (!preview) {
  fail('eas.json is missing build.preview');
}

if (preview.distribution !== 'internal') {
  fail('preview builds must use internal distribution');
}

if (preview.environment !== 'preview') {
  fail('preview builds must use the preview EAS environment');
}

if (preview?.android?.buildType !== 'apk') {
  fail('preview Android builds must produce an installable APK');
}

const androidPackage = app?.expo?.android?.package;
if (typeof androidPackage !== 'string' || androidPackage.trim().length === 0) {
  fail('expo.android.package must be configured before production release');
}

const evidence = {
  candidateSha: head,
  appVersion: app?.expo?.version ?? null,
  androidPackage,
  versionSource: 'remote',
  productionAutoIncrement: true,
  androidArtifact: 'app-bundle',
  previewArtifact: 'apk',
  section20ReleaseGate: 'passed',
  releaseManifest:
    resolvedReleaseManifestPath,
};

console.log('PRODUCTION RELEASE PREFLIGHT: PASS');
console.log(JSON.stringify(evidence, null, 2));
console.log('Next Android production command: eas build --platform android --profile production');
