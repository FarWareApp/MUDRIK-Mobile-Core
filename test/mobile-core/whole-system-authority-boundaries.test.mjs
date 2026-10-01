import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

import {
  parseRoutedTask,
} from '../../control-plane/src/task-contract.mjs';

import {
  parseComputerTaskEnvelope,
} from '../../computer-agent/src/task-envelope.mjs';

const {
  authorizeCapability,
} = loadTypeScriptModule(
  'src/core/security/capabilityPolicy.ts',
);

const {
  parseIntelligenceResultEnvelope,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligenceResult.ts',
);

const {
  parseIntegrationResultEnvelope,
} = loadTypeScriptModule(
  'src/core/integrations/integrationResult.ts',
);

const {
  parseIntegrationApproval,
} = loadTypeScriptModule(
  'src/core/integrations/integrationApproval.ts',
);

const {
  parseMemoryRecord,
} = loadTypeScriptModule(
  'src/core/memory/memoryRecord.ts',
);

const {
  KnowledgeRegistry,
} = loadTypeScriptModule(
  'src/core/knowledge/knowledgeRegistry.ts',
);

const NOW = 2_300_000_000;
const ACCOUNT =
  'acct_1111111111111111';
const WORKSPACE =
  'workspace_1111111111111111';
const DEVICE =
  'idevice_1111111111111111';

function intelligenceResult() {
  return {
    protocolVersion: '1.0',
    requestId:
      'intelligence_request_1111111111111111',
    planId:
      'intelligence_plan_1111111111111111',
    providerRef:
      'provider_1111111111111111',
    modelRef:
      'model_1111111111111111',
    service: 'general',
    generation: 1,
    resultRef:
      'result_ref_1111111111111111',
    completedAtMs: NOW,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function integrationResult() {
  return {
    protocolVersion: '1.0',
    commandId:
      'icommand_1111111111111111',
    bindingId:
      'ibinding_1111111111111111',
    deviceId: DEVICE,
    adapterId:
      'iadapter_1111111111111111',
    integrationId:
      'integration_1111111111111111',
    status: 'succeeded',
    reasonCode: 'completed',
    resultRef:
      'result_ref_2222222222222222',
    completedAtMs: NOW,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function memoryRecord() {
  return {
    protocolVersion: '1.0',
    memoryId:
      'memory_item_1111111111111111',
    accountId: ACCOUNT,
    category: 'language_preference',
    content:
      'Remember this text, but it never grants execution authority.',
    topicTags: [
      'language',
    ],
    sourceType:
      'explicit_user_memory_request',
    sourceRef:
      'conversation:1111111111111111',
    candidateId:
      'memory_candidate_1111111111111111',
    explicitApprovalId:
      'memory_approval_1111111111111111',
    policyId:
      'memory_policy_1111111111111111',
    policyRevision: 1,
    createdAtMs: NOW - 100,
    updatedAtMs: NOW - 100,
    expiresAtMs: null,
    revision: 1,
    state: 'active',
    supersededByMemoryId: null,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
  };
}

function knowledgePolicy() {
  return {
    protocolVersion: '1.0',
    policyId:
      'knowledge_policy_1111111111111111',
    accountId: ACCOUNT,
    workspaceId: WORKSPACE,
    enabled: true,
    acceptedSourceKinds: [
      'official_docs',
    ],
    allowedDomains: [
      'docs.example.test',
    ],
    acceptedProvenanceRefs: [
      'provenance:official:docs',
    ],
    preferOfficialSources: true,
    requireLicenseMetadata: true,
    maxSourceBytes: 16 * 1024,
    maxChunkBytes: 512,
    maxChunksPerSource: 64,
    maxResults: 4,
    maxProjectionBytes: 8 * 1024,
    maxSourceAgeMs:
      24 * 60 * 60 * 1000,
    remoteRefreshAllowed: false,
    revision: 1,
    updatedAtMs: NOW - 1000,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function knowledgeSource() {
  return {
    protocolVersion: '1.0',
    sourceId:
      'knowledge_source_1111111111111111',
    accountId: ACCOUNT,
    workspaceId: WORKSPACE,
    policyId:
      'knowledge_policy_1111111111111111',
    policyRevision: 1,
    sourceKind: 'official_docs',
    canonicalLocator:
      'https://docs.example.test/reference',
    publisher: 'Example Docs',
    provenanceType:
      'official_domain',
    provenanceRef:
      'provenance:official:docs',
    official: true,
    version: 'v1.0.0',
    revision: 1,
    observedAtMs: NOW - 500,
    validUntilMs: null,
    license: {
      licenseId:
        'license_example_docs_v1',
      usage: 'citation_allowed',
      attributionRequired: true,
    },
    content:
      (
        'Reference text mentioning home access control as documentation only. '
      ).repeat(20),
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function knowledgeQuery() {
  return {
    protocolVersion: '1.0',
    queryId:
      'knowledge_query_1111111111111111',
    accountId: ACCOUNT,
    workspaceId: WORKSPACE,
    policyId:
      'knowledge_policy_1111111111111111',
    policyRevision: 1,
    purpose: 'technical_reference',
    queryText:
      'home access control reference',
    sourceKinds: [
      'official_docs',
    ],
    requestedVersion: null,
    requireCurrent: false,
    maxResults: 4,
    maxProjectionBytes: 8 * 1024,
    requestedAtMs: NOW,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function grantAttempt(source) {
  return {
    ...source,
    grantId:
      'grant_whole_system_1111111111111111',
    subjectId: DEVICE,
    capability:
      'home.access.control',
    scope: {
      resourceId: DEVICE,
      allowBackground: false,
      maxElevation: 'none',
    },
    expiresAtMs: NOW + 60_000,
  };
}

function accessRequest() {
  return {
    subjectId: DEVICE,
    capability:
      'home.access.control',
    nowMs: NOW,
    resourceId: DEVICE,
    background: false,
    elevation: 'none',
  };
}

function routedTask() {
  return {
    protocolVersion: '1.0',
    taskId:
      'ctask_0123456789abcdef',
    accountId:
      'acct_0123456789abcdef',
    sourceSessionId:
      'sess_0123456789abcdef',
    sourceDeviceId:
      'dev_0123456789abcdef',
    destinationDeviceId:
      'dev_1111111111111111',
    issuedAtMs: NOW - 100,
    expiresAtMs: NOW + 10_000,
    nonce:
      'nonce_0123456789abcdef',
    sequence: 1,
    requestedCapabilities: [
      'filesystem.read',
    ],
    scopeDigest:
      'a'.repeat(64),
    payloadDigest:
      'b'.repeat(64),
    approvalId:
      'capproval_0123456789abcdef',
    risk: 'high',
    policyVersion:
      'policy_control.v1',
  };
}

const digestProvider =
  Object.freeze({
    digest(payload) {
      return crypto
        .createHash('sha256')
        .update(payload)
        .digest('hex');
    },
  });

test(
  'validated intelligence memory integration and knowledge outputs remain non-authoritative at capability boundary',
  async () => {
    const intelligence =
      parseIntelligenceResultEnvelope(
        intelligenceResult(),
      );
    const integration =
      parseIntegrationResultEnvelope(
        integrationResult(),
      );
    const memory =
      parseMemoryRecord(
        memoryRecord(),
      );

    assert.ok(intelligence);
    assert.ok(integration);
    assert.ok(memory);

    const knowledge =
      new KnowledgeRegistry({
        digestProvider,
      });

    const policySet =
      knowledge.setPolicy(
        knowledgePolicy(),
      );

    assert.equal(
      policySet.accepted,
      true,
      policySet.reason,
    );

    const ingested =
      await knowledge.ingest({
        source: knowledgeSource(),
        trustedNowMs: NOW,
      });

    assert.equal(
      ingested.accepted,
      true,
      ingested.reason,
    );

    const retrieved =
      knowledge.retrieve(
        knowledgeQuery(),
        NOW,
      );

    assert.equal(
      retrieved.accepted,
      true,
      retrieved.reason,
    );
    assert.ok(retrieved.value);

    const sources = [
      intelligence,
      memory,
      retrieved.value,
      integration,
    ];

    for (const source of sources) {
      const direct =
        authorizeCapability(
          accessRequest(),
          [source],
          NOW,
        );

      assert.equal(
        direct.allowed,
        false,
      );
      assert.equal(
        direct.reason,
        'no_matching_grant',
      );

      const forged =
        authorizeCapability(
          accessRequest(),
          [
            grantAttempt(source),
          ],
          NOW,
        );

      assert.equal(
        forged.allowed,
        false,
      );
      assert.equal(
        forged.reason,
        'grant_invalid',
      );
    }
  },
);

test(
  'real capability grant remains the only object in this composition that authorizes the access capability',
  () => {
    const decision =
      authorizeCapability(
        accessRequest(),
        [
          {
            grantId:
              'grant_whole_system_1111111111111111',
            subjectId: DEVICE,
            capability:
              'home.access.control',
            scope: {
              resourceId: DEVICE,
              allowBackground: false,
              maxElevation: 'none',
            },
            expiresAtMs:
              NOW + 60_000,
          },
        ],
        NOW,
      );

    assert.equal(
      decision.allowed,
      true,
    );
    assert.equal(
      decision.reason,
      'allowed',
    );
  },
);

test(
  'non-approval subsystem outputs cannot cross into high-risk integration approval provenance',
  async () => {
    const intelligence =
      parseIntelligenceResultEnvelope(
        intelligenceResult(),
      );
    const integration =
      parseIntegrationResultEnvelope(
        integrationResult(),
      );
    const memory =
      parseMemoryRecord(
        memoryRecord(),
      );

    assert.ok(intelligence);
    assert.ok(integration);
    assert.ok(memory);

    for (
      const value of [
        intelligence,
        integration,
        memory,
      ]
    ) {
      assert.equal(
        parseIntegrationApproval(
          value,
        ),
        null,
      );
    }
  },
);

test(
  'control-plane routed task is not itself an admissible signed computer-agent task envelope',
  () => {
    const routed =
      parseRoutedTask(
        routedTask(),
      );

    assert.ok(routed);

    assert.equal(
      parseComputerTaskEnvelope(
        routed,
      ),
      null,
    );

    assert.equal(
      parseComputerTaskEnvelope({
        ...routed,
        source: 'mobile',
      }),
      null,
    );
  },
);

test(
  'successful external results cannot retroactively become authorization evidence',
  () => {
    const result =
      parseIntegrationResultEnvelope(
        integrationResult(),
      );

    assert.ok(result);
    assert.equal(
      result.status,
      'succeeded',
    );

    const decision =
      authorizeCapability(
        accessRequest(),
        [
          grantAttempt(result),
        ],
        NOW,
      );

    assert.equal(
      decision.allowed,
      false,
    );
    assert.equal(
      decision.reason,
      'grant_invalid',
    );
  },
);
