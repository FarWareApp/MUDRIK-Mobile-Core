import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

export type ReleaseCheckStatus =
  | 'passed'
  | 'failed'
  | 'pending';

export type SectionLayer4Status =
  | 'passed'
  | 'deferred'
  | 'failed'
  | 'not_applicable';

export type SectionReleaseEvidence =
  Readonly<{
    section: number;
    preDeviceComplete: boolean;
    layer4Status: SectionLayer4Status;
    unresolvedBlockerCriticalHigh: number;
  }>;

export type WholeSystemReleaseManifest =
  Readonly<{
    protocolVersion: '1.0';
    candidateSha: string;
    generatedAtMs: number;
    sections:
      readonly SectionReleaseEvidence[];
    mobileCoreValidation: ReleaseCheckStatus;
    codeql: ReleaseCheckStatus;
    dependencyHighCriticalGate:
      ReleaseCheckStatus;
    fullHistorySecretScan:
      ReleaseCheckStatus;
    physicalAndroidValidation:
      ReleaseCheckStatus;
    realProviderValidation:
      ReleaseCheckStatus;
    realIntegrationValidation:
      ReleaseCheckStatus;
    productionLikeControlPlaneAgent:
      ReleaseCheckStatus;
    independentSecurityReview:
      ReleaseCheckStatus;
    privacyRegulatoryReview:
      ReleaseCheckStatus;
    disasterRecoveryExercise:
      ReleaseCheckStatus;
    keyRotationExercise:
      ReleaseCheckStatus;
    incidentResponseExercise:
      ReleaseCheckStatus;
    loadReliabilityValidation:
      ReleaseCheckStatus;
    upgradeRollbackValidation:
      ReleaseCheckStatus;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type WholeSystemReleaseBlocker =
  | 'invalid_manifest'
  | 'section_pre_device_incomplete'
  | 'section_layer4_open'
  | 'section_layer4_failed'
  | 'section_high_severity_open'
  | 'trusted_time_invalid'
  | 'automated_validation_open'
  | 'physical_android_open'
  | 'real_provider_open'
  | 'real_integration_open'
  | 'control_plane_agent_open'
  | 'independent_security_review_open'
  | 'privacy_review_open'
  | 'disaster_recovery_open'
  | 'key_rotation_open'
  | 'incident_response_open'
  | 'load_reliability_open'
  | 'upgrade_rollback_open';

export type WholeSystemReleaseDecision =
  Readonly<{
    productionAllowed: boolean;
    blockers:
      readonly WholeSystemReleaseBlocker[];
    candidateSha: string | null;
    grantsAuthority: false;
  }>;
const MANIFEST_KEYS =
  new Set([
    'protocolVersion',
    'candidateSha',
    'generatedAtMs',
    'sections',
    'mobileCoreValidation',
    'codeql',
    'dependencyHighCriticalGate',
    'fullHistorySecretScan',
    'physicalAndroidValidation',
    'realProviderValidation',
    'realIntegrationValidation',
    'productionLikeControlPlaneAgent',
    'independentSecurityReview',
    'privacyRegulatoryReview',
    'disasterRecoveryExercise',
    'keyRotationExercise',
    'incidentResponseExercise',
    'loadReliabilityValidation',
    'upgradeRollbackValidation',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const SECTION_KEYS =
  new Set([
    'section',
    'preDeviceComplete',
    'layer4Status',
    'unresolvedBlockerCriticalHigh',
  ]);

const CHECKS =
  new Set<ReleaseCheckStatus>([
    'passed',
    'failed',
    'pending',
  ]);

const LAYER4 =
  new Set<SectionLayer4Status>([
    'passed',
    'deferred',
    'failed',
    'not_applicable',
  ]);

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype
    || prototype === null
  );
}

function exactKeys(
  value: Record<string, unknown>,
  keys: ReadonlySet<string>,
): boolean {
  return (
    Object.keys(value).length
      === keys.size
    && Object.keys(value).every(
      (key) => keys.has(key),
    )
  );
}

function safeInteger(
  value: unknown,
): value is number {
  return (
    Number.isSafeInteger(value)
    && Number(value) >= 0
  );
}

function parseSectionEvidence(
  input: unknown,
): SectionReleaseEvidence | null {
  if (
    !isPlainObject(input)
    || !exactKeys(input, SECTION_KEYS)
    || !safeInteger(input.section)
    || Number(input.section) < 1
    || Number(input.section) > 19
    || typeof input.preDeviceComplete
      !== 'boolean'
    || typeof input.layer4Status
      !== 'string'
    || !LAYER4.has(
      input.layer4Status as
        SectionLayer4Status,
    )
    || !safeInteger(
      input.unresolvedBlockerCriticalHigh,
    )
    || Number(
      input.unresolvedBlockerCriticalHigh,
    ) > 10_000
  ) {
    return null;
  }

  return Object.freeze({
    section: Number(input.section),
    preDeviceComplete:
      input.preDeviceComplete,
    layer4Status:
      input.layer4Status as
        SectionLayer4Status,
    unresolvedBlockerCriticalHigh:
      Number(
        input.unresolvedBlockerCriticalHigh,
      ),
  });
}

const CHECK_FIELDS =
  [
    'mobileCoreValidation',
    'codeql',
    'dependencyHighCriticalGate',
    'fullHistorySecretScan',
    'physicalAndroidValidation',
    'realProviderValidation',
    'realIntegrationValidation',
    'productionLikeControlPlaneAgent',
    'independentSecurityReview',
    'privacyRegulatoryReview',
    'disasterRecoveryExercise',
    'keyRotationExercise',
    'incidentResponseExercise',
    'loadReliabilityValidation',
    'upgradeRollbackValidation',
  ] as const;

export function parseWholeSystemReleaseManifest(
  input: unknown,
): WholeSystemReleaseManifest | null {
  if (
    !isPlainObject(input)
    || !exactKeys(input, MANIFEST_KEYS)
    || input.protocolVersion !== '1.0'
    || typeof input.candidateSha !== 'string'
    || !/^[0-9a-f]{40}$/.test(
      input.candidateSha,
    )
    || !safeInteger(input.generatedAtMs)
    || !Array.isArray(input.sections)
    || input.sections.length !== 19
    || input.grantsExecutionAuthority
      !== false
    || input.grantsSensorAuthority
      !== false
    || input.grantsApprovalAuthority
      !== false
    || input.grantsCapabilityAuthority
      !== false
  ) {
    return null;
  }

  for (const field of CHECK_FIELDS) {
    if (
      typeof input[field] !== 'string'
      || !CHECKS.has(
        input[field] as ReleaseCheckStatus,
      )
    ) {
      return null;
    }
  }

  const sections:
    SectionReleaseEvidence[] = [];

  for (const raw of input.sections) {
    const section =
      parseSectionEvidence(raw);

    if (!section) {
      return null;
    }

    sections.push(section);
  }

  const unique =
    new Set(
      sections.map(
        (section) => section.section,
      ),
    );

  if (
    unique.size !== 19
    || Array.from(
      { length: 19 },
      (_, index) => index + 1,
    ).some(
      (section) => !unique.has(section),
    )
  ) {
    return null;
  }

  sections.sort(
    (left, right) =>
      left.section - right.section,
  );

  return Object.freeze({
    protocolVersion: '1.0',
    candidateSha: input.candidateSha,
    generatedAtMs:
      Number(input.generatedAtMs),
    sections: Object.freeze(sections),
    mobileCoreValidation:
      input.mobileCoreValidation as ReleaseCheckStatus,
    codeql:
      input.codeql as ReleaseCheckStatus,
    dependencyHighCriticalGate:
      input.dependencyHighCriticalGate as ReleaseCheckStatus,
    fullHistorySecretScan:
      input.fullHistorySecretScan as ReleaseCheckStatus,
    physicalAndroidValidation:
      input.physicalAndroidValidation as ReleaseCheckStatus,

    realProviderValidation:
      input.realProviderValidation as ReleaseCheckStatus,
    realIntegrationValidation:
      input.realIntegrationValidation as ReleaseCheckStatus,
    productionLikeControlPlaneAgent:
      input.productionLikeControlPlaneAgent as ReleaseCheckStatus,
    independentSecurityReview:
      input.independentSecurityReview as ReleaseCheckStatus,
    privacyRegulatoryReview:
      input.privacyRegulatoryReview as ReleaseCheckStatus,
    disasterRecoveryExercise:
      input.disasterRecoveryExercise as ReleaseCheckStatus,
    keyRotationExercise:
      input.keyRotationExercise as ReleaseCheckStatus,
    incidentResponseExercise:
      input.incidentResponseExercise as ReleaseCheckStatus,
    loadReliabilityValidation:
      input.loadReliabilityValidation as ReleaseCheckStatus,
    upgradeRollbackValidation:
      input.upgradeRollbackValidation as ReleaseCheckStatus,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

function addBlocker(
  blockers: WholeSystemReleaseBlocker[],
  blocker: WholeSystemReleaseBlocker,
): void {
  if (!blockers.includes(blocker)) {
    blockers.push(blocker);
  }
}

export function evaluateWholeSystemReleaseGate(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
): WholeSystemReleaseDecision {
  const trustedNowMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );
  const manifest =
    parseWholeSystemReleaseManifest(
      input,
    );

  if (!manifest) {
    return Object.freeze({
      productionAllowed: false,
      blockers: Object.freeze([
        'invalid_manifest' as WholeSystemReleaseBlocker,
      ]),
      candidateSha: null,
      grantsAuthority: false,
    });
  }

  const blockers:
    WholeSystemReleaseBlocker[] = [];

  if (
    trustedNowMs === null
    || manifest.generatedAtMs
      > trustedNowMs
  ) {
    addBlocker(
      blockers,
      'trusted_time_invalid',
    );
  }

  if (
    manifest.sections.some(
      (section) =>
        !section.preDeviceComplete,
    )
  ) {
    addBlocker(
      blockers,
      'section_pre_device_incomplete',
    );
  }

  if (
    manifest.sections.some(
      (section) =>
        section.layer4Status
          === 'deferred',
    )
  ) {
    addBlocker(
      blockers,
      'section_layer4_open',
    );
  }

  if (
    manifest.sections.some(
      (section) =>
        section.layer4Status
          === 'failed',
    )
  ) {
    addBlocker(
      blockers,
      'section_layer4_failed',
    );
  }

  if (
    manifest.sections.some(
      (section) =>
        section
          .unresolvedBlockerCriticalHigh
          > 0,
    )
  ) {
    addBlocker(
      blockers,
      'section_high_severity_open',
    );
  }

  if (
    [
      manifest.mobileCoreValidation,
      manifest.codeql,
      manifest
        .dependencyHighCriticalGate,
      manifest.fullHistorySecretScan,
    ].some(
      (status) => status !== 'passed',
    )
  ) {
    addBlocker(
      blockers,
      'automated_validation_open',
    );
  }

  const topLevel:
    readonly [
      ReleaseCheckStatus,
      WholeSystemReleaseBlocker,
    ][] = [
      [
        manifest.physicalAndroidValidation,
        'physical_android_open',
      ],
      [
        manifest.realProviderValidation,
        'real_provider_open',
      ],
      [
        manifest.realIntegrationValidation,
        'real_integration_open',
      ],
      [
        manifest
          .productionLikeControlPlaneAgent,
        'control_plane_agent_open',
      ],
      [
        manifest.independentSecurityReview,
        'independent_security_review_open',
      ],
      [
        manifest.privacyRegulatoryReview,
        'privacy_review_open',
      ],
      [
        manifest.disasterRecoveryExercise,
        'disaster_recovery_open',
      ],
      [
        manifest.keyRotationExercise,
        'key_rotation_open',
      ],
      [
        manifest.incidentResponseExercise,
        'incident_response_open',
      ],
      [
        manifest.loadReliabilityValidation,
        'load_reliability_open',
      ],
      [
        manifest.upgradeRollbackValidation,
        'upgrade_rollback_open',
      ],
    ];

  for (const [status, blocker] of topLevel) {
    if (status !== 'passed') {
      addBlocker(blockers, blocker);
    }
  }

  return Object.freeze({
    productionAllowed:
      blockers.length === 0,
    blockers:
      Object.freeze([...blockers]),
    candidateSha:
      manifest.candidateSha,
    grantsAuthority: false,
  });
}
