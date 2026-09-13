import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

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
};

console.log('PRODUCTION RELEASE PREFLIGHT: PASS');
console.log(JSON.stringify(evidence, null, 2));
console.log('Next Android production command: eas build --platform android --profile production');
