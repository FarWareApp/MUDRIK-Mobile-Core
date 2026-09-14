import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const contract = fs.readFileSync(
  'src/contracts/ProjectRepository.ts',
  'utf8',
);
const repository = fs.readFileSync(
  'src/features/projects/storage/SQLiteProjectRepository.ts',
  'utf8',
);
const detailController = fs.readFileSync(
  'src/features/projects/hooks/useProjectDetailController.ts',
  'utf8',
);
const listController = fs.readFileSync(
  'src/features/projects/hooks/useProjectsController.ts',
  'utf8',
);

test(
  'project repository exposes one atomic details update operation',
  () => {
    assert.match(
      contract,
      /updateDetails\(\s*id:\s*string,\s*name:\s*string,\s*description:\s*string,\s*updatedAt:\s*number,/s,
    );
    assert.match(repository, /async updateDetails\(/);
    assert.match(
      repository,
      /UPDATE projects\s+SET\s+name = \?,\s+description = \?,\s+updated_at = \?\s+WHERE id = \?/s,
    );
  },
);

test(
  'project detail saves name and description through the atomic repository operation',
  () => {
    assert.match(
      detailController,
      /projectRepository\.updateDetails\(/,
    );
    assert.doesNotMatch(
      detailController,
      /projectRepository\s*\.\s*rename\(/,
    );
    assert.doesNotMatch(
      detailController,
      /projectRepository\s*\.\s*updateDescription\(/,
    );
  },
);

test(
  'project mutations update local state without full reload churn',
  () => {
    assert.match(listController, /mutationInFlightRef/);
    assert.match(detailController, /mutationInFlightRef/);
    assert.doesNotMatch(listController, /await load\(\)/);
    assert.doesNotMatch(detailController, /await load\(\)/);
    assert.match(listController, /setProjects\(/);
    assert.match(detailController, /setLinkedConversationIds\(/);
  },
);

test(
  'project controllers expose typed failures instead of user-facing English copy',
  () => {
    for (const source of [
      listController,
      detailController,
    ]) {
      assert.doesNotMatch(source, /Unable to /);
      assert.doesNotMatch(source, /Project name cannot be empty/);
    }

    assert.match(listController, /ProjectListErrorCode/);
    assert.match(detailController, /ProjectDetailErrorCode/);
  },
);
