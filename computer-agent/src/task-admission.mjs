import crypto from 'node:crypto';

import {
  canonicalTaskPayload,
  parseComputerTaskEnvelope,
  verifyComputerTaskSignature,
} from './task-envelope.mjs';

const ACCOUNT_ID =
  /^acct_[a-z0-9][a-z0-9_-]{15,127}$/;

const DEVICE_ID =
  /^dev_[a-z0-9][a-z0-9_-]{15,127}$/;

const SIGNER_KEY_ID =
  /^skey_[a-z0-9][a-z0-9_-]{15,127}$/;

function validTrustedTime(value) {
  return (
    Number.isSafeInteger(value)
    && value >= 0
  );
}

function fingerprint(task) {
  const payload =
    canonicalTaskPayload(task);

  if (!payload) {
    return null;
  }

  return crypto
    .createHash('sha256')
    .update(payload)
    .digest('base64url');
}

function admissionResult(
  accepted,
  idempotent,
  task,
  reason,
) {
  return Object.freeze({
    accepted,
    idempotent,
    task,
    reason,
    grantsAuthority: false,
    performsExternalAction: false,
  });
}

export class TaskAdmissionRegistry {
  constructor({
    accountId,
    deviceId,
    trustedSigners = [],
    maxClockSkewMs = 300_000,
  } = {}) {
    if (
      !ACCOUNT_ID.test(accountId)
      || !DEVICE_ID.test(deviceId)
      || !Array.isArray(trustedSigners)
      || trustedSigners.length < 1
      || trustedSigners.length > 64
      || !Number.isSafeInteger(
        maxClockSkewMs,
      )
      || maxClockSkewMs < 0
      || maxClockSkewMs > 3_600_000
    ) {
      throw new TypeError(
        'Invalid task admission configuration.',
      );
    }

    this.accountId = accountId;
    this.deviceId = deviceId;
    this.maxClockSkewMs =
      maxClockSkewMs;
    this.signers = new Map();
    this.byTaskId = new Map();
    this.byNonce = new Map();

    for (const signer of trustedSigners) {
      if (
        !signer
        || typeof signer !== 'object'
        || !SIGNER_KEY_ID.test(
          signer.signerKeyId,
        )
        || signer.accountId !== accountId
        || !signer.publicKey
        || this.signers.has(
          signer.signerKeyId,
        )
      ) {
        throw new TypeError(
          'Invalid or duplicate trusted signer.',
        );
      }

      let publicKey;

      try {
        if (
          signer.publicKey
            instanceof crypto.KeyObject
        ) {
          if (
            signer.publicKey.type
              !== 'public'
          ) {
            throw new TypeError(
              'Not a public key.',
            );
          }

          publicKey =
            signer.publicKey;
        } else {
          publicKey =
            crypto.createPublicKey(
              signer.publicKey,
            );
        }
      } catch {
        throw new TypeError(
          'Trusted signer public key is invalid.',
        );
      }

      if (
        publicKey.asymmetricKeyType
          !== 'ed25519'
      ) {
        throw new TypeError(
          'Trusted signer must use Ed25519.',
        );
      }

      this.signers.set(
        signer.signerKeyId,
        Object.freeze({
          signerKeyId:
            signer.signerKeyId,
          accountId,
          publicKey,
        }),
      );
    }
  }

  admit(
    envelopeInput,
    trustedTimeMs,
  ) {
    if (!validTrustedTime(trustedTimeMs)) {
      return admissionResult(
        false,
        false,
        null,
        'invalid_time',
      );
    }

    const task =
      parseComputerTaskEnvelope(
        envelopeInput,
      );

    if (!task) {
      return admissionResult(
        false,
        false,
        null,
        'invalid_envelope',
      );
    }

    if (
      task.accountId !== this.accountId
      || task.deviceId !== this.deviceId
    ) {
      return admissionResult(
        false,
        false,
        null,
        'binding_mismatch',
      );
    }

    const signer =
      this.signers.get(
        task.signerKeyId,
      );

    if (
      !signer
      || (
        signer.accountId !== null
        && signer.accountId
          !== task.accountId
      )
    ) {      return admissionResult(
        false,
        false,
        null,
        'untrusted_signer',
      );
    }

    if (
      !verifyComputerTaskSignature(
        task,
        signer.publicKey,
      )
    ) {
      return admissionResult(
        false,
        false,
        null,
        'invalid_signature',
      );
    }

    const createdAtMs =
      Date.parse(task.createdAt);
    const expiresAtMs =
      Date.parse(task.expiresAt);

    if (
      !Number.isSafeInteger(createdAtMs)
      || !Number.isSafeInteger(expiresAtMs)
      || expiresAtMs <= trustedTimeMs
    ) {
      return admissionResult(
        false,
        false,
        null,
        'expired_task',
      );
    }

    if (
      createdAtMs
        > trustedTimeMs
          + this.maxClockSkewMs
    ) {
      return admissionResult(
        false,
        false,
        null,
        'future_task',
      );
    }

    const digest = fingerprint(task);

    if (!digest) {
      return admissionResult(
        false,
        false,
        null,
        'invalid_envelope',
      );
    }

    const existingTask =
      this.byTaskId.get(task.taskId);

    if (existingTask) {
      if (
        existingTask.digest === digest
        && existingTask.nonce
          === task.nonce
      ) {
        return admissionResult(
          true,
          true,
          existingTask.task,
          'duplicate',
        );
      }

      return admissionResult(
        false,
        false,
        null,
        'task_conflict',
      );
    }

    const existingNonce =
      this.byNonce.get(task.nonce);

    if (existingNonce) {
      return admissionResult(
        false,
        false,
        null,
        'nonce_replay',
      );
    }

    const record =
      Object.freeze({
        task,
        digest,
        nonce: task.nonce,
      });

    this.byTaskId.set(
      task.taskId,
      record,
    );
    this.byNonce.set(
      task.nonce,
      record,
    );

    return admissionResult(
      true,
      false,
      task,
      'accepted',
    );
  }


  restorePersistedTask(
    envelopeInput,
  ) {
    const task =
      parseComputerTaskEnvelope(
        envelopeInput,
      );

    if (!task) {
      return admissionResult(
        false,
        false,
        null,
        'invalid_envelope',
      );
    }

    if (
      task.accountId !== this.accountId
      || task.deviceId !== this.deviceId
    ) {
      return admissionResult(
        false,
        false,
        null,
        'binding_mismatch',
      );
    }

    const signer =
      this.signers.get(
        task.signerKeyId,
      );

    if (
      !signer
      || (
        signer.accountId !== null
        && signer.accountId
          !== task.accountId
      )
    ) {
      return admissionResult(
        false,
        false,
        null,
        'untrusted_signer',
      );
    }

    if (
      !verifyComputerTaskSignature(
        task,
        signer.publicKey,
      )
    ) {
      return admissionResult(
        false,
        false,
        null,
        'invalid_signature',
      );
    }

    const digest = fingerprint(task);

    if (!digest) {
      return admissionResult(
        false,
        false,
        null,
        'invalid_envelope',
      );
    }

    const existingTask =
      this.byTaskId.get(task.taskId);
    const existingNonce =
      this.byNonce.get(task.nonce);

    if (
      existingTask
      || existingNonce
    ) {
      const exact =
        existingTask
        && existingNonce === existingTask
        && existingTask.digest === digest
        && existingTask.nonce === task.nonce;

      return admissionResult(
        exact,
        exact,
        exact ? existingTask.task : null,
        exact
          ? 'duplicate'
          : existingTask
            ? 'task_conflict'
            : 'nonce_replay',
      );
    }

    const record =
      Object.freeze({
        task,
        digest,
        nonce: task.nonce,
      });

    this.byTaskId.set(
      task.taskId,
      record,
    );
    this.byNonce.set(
      task.nonce,
      record,
    );

    return admissionResult(
      true,
      false,
      task,
      'restored',
    );
  }

  get(taskId) {
    return (
      this.byTaskId.get(taskId)
        ?.task
      ?? null
    );
  }
}
