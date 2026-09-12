import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

function runGit(...args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function fail(message) {
  console.error(`SECTION 01 DEVICE PREFLIGHT: FAIL: ${message}`);
  process.exit(1);
}

const head = runGit('rev-parse', 'HEAD');
const branch = runGit('rev-parse', '--abbrev-ref', 'HEAD');
const dirty = runGit('status', '--porcelain');

if (dirty) {
  fail('working tree is not clean; build evidence must map to an exact committed SHA');
}

const expectedSha = process.env.SECTION01_EXPECTED_SHA?.trim();
if (expectedSha && expectedSha !== head) {
  fail(`HEAD ${head} does not match SECTION01_EXPECTED_SHA ${expectedSha}`);
}

const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const eas = JSON.parse(fs.readFileSync('eas.json', 'utf8'));

const androidPackage = app?.expo?.android?.package;
if (typeof androidPackage !== 'string' || androidPackage.trim().length === 0) {
  fail('expo.android.package is not selected yet; do not begin final device freeze testing until the permanent Android application ID is committed');
}

const packagePattern = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/;
if (!packagePattern.test(androidPackage)) {
  fail(`expo.android.package has an unexpected format: ${androidPackage}`);
}

const profile = eas?.build?.['device-validation'];
if (!profile) {
  fail('eas.json is missing build.device-validation');
}

if (profile.distribution !== 'internal') {
  fail('device-validation profile must use internal distribution');
}

if (profile?.android?.buildType !== 'apk') {
  fail('device-validation Android buildType must be apk');
}

const evidence = {
  candidateSha: head,
  branch,
  appVersion: app?.expo?.version ?? null,
  androidPackage,
  buildProfile: 'device-validation',
  artifactType: 'apk',
};

console.log('SECTION 01 DEVICE PREFLIGHT: PASS');
console.log(JSON.stringify(evidence, null, 2));
console.log('Next build command: eas build --platform android --profile device-validation');
