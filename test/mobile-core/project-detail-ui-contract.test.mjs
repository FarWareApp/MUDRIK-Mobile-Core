import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const detail = fs.readFileSync(
  'src/features/projects/ProjectDetailScreen.tsx',
  'utf8',
);
const header = fs.readFileSync(
  'src/features/projects/components/ProjectDetailHeader.tsx',
  'utf8',
);
const state = fs.readFileSync(
  'src/features/projects/components/ProjectDetailState.tsx',
  'utf8',
);
const sectionHeader = fs.readFileSync(
  'src/features/projects/components/ProjectSectionHeader.tsx',
  'utf8',
);
const attachments = fs.readFileSync(
  'src/features/projects/components/ProjectAttachmentList.tsx',
  'utf8',
);
const attachmentKindIcon = fs.readFileSync(
  'src/features/projects/components/ProjectAttachmentKindIcon.tsx',
  'utf8',
);
const removeIcon = fs.readFileSync(
  'src/features/projects/components/ProjectRemoveIcon.tsx',
  'utf8',
);
const conversations = fs.readFileSync(
  'src/features/projects/components/ProjectConversationList.tsx',
  'utf8',
);
const checkIcon = fs.readFileSync(
  'src/features/projects/components/ProjectSelectionCheckIcon.tsx',
  'utf8',
);
const backIcon = fs.readFileSync(
  'src/features/projects/components/ProjectBackIcon.tsx',
  'utf8',
);
const editIcon = fs.readFileSync(
  'src/features/projects/components/ProjectEditIcon.tsx',
  'utf8',
);
const controller = fs.readFileSync(
  'src/features/projects/hooks/useProjectDetailController.ts',
  'utf8',
);

test(
  'project detail screen keeps orchestration separate from visual controls',
  () => {
    assert.match(detail, /ProjectDetailHeader/);
    assert.match(detail, /ProjectDetailState/);
    assert.match(detail, /ProjectSectionHeader/);
    assert.match(detail, /ProjectAttachmentList/);
    assert.match(detail, /ProjectConversationList/);
    assert.match(detail, /ProjectEditorModal/);
    assert.match(detail, /getProjectDetailErrorTranslationKey/);
    assert.doesNotMatch(detail, /\bPressable\b/);
    assert.doesNotMatch(detail, /ActivityIndicator/);
  },
);

test(
  'project detail header uses stable glyph-free primitives with RTL back geometry',
  () => {
    assert.match(header, /ProjectBackIcon/);
    assert.match(header, /ProjectEditIcon/);
    assert.match(header, /isRTL/);
    assert.match(header, /motion\.press\.subtleScale/);
    assert.match(header, /width:\s*44/);
    assert.match(header, /height:\s*44/);
    assert.doesNotMatch(header, /[‹✎]/u);
    assert.match(backIcon, /scaleX:\s*-1/);

    for (const icon of [backIcon, editIcon]) {
      assert.doesNotMatch(icon, /<Text\b/);
      assert.match(
        icon,
        /importantForAccessibility="no-hide-descendants"/,
      );
    }
  },
);

test(
  'project file rows avoid font glyphs and keep accessible removal targets',
  () => {
    assert.match(attachments, /ProjectAttachmentKindIcon/);
    assert.match(attachments, /ProjectRemoveIcon/);
    assert.match(attachments, /width:\s*44/);
    assert.match(attachments, /height:\s*44/);
    assert.match(attachments, /motion\.press\.subtleScale/);
    assert.doesNotMatch(attachments, /[▧▶▤×]/u);
    assert.doesNotMatch(attachmentKindIcon, /<Text\b/);
    assert.doesNotMatch(removeIcon, /<Text\b/);
  },
);

test(
  'project conversation rows keep semantic RTL spacing and linked archived visibility',
  () => {
    assert.match(conversations, /new Set\(linkedIds\)/);
    assert.match(conversations, /ProjectSelectionCheckIcon/);
    assert.match(conversations, /marginEnd:\s*spacing\.md/);
    assert.doesNotMatch(conversations, /marginRight:/);
    assert.doesNotMatch(conversations, /✓/u);
    assert.match(conversations, /projectArchivedConversationLabel/);
    assert.doesNotMatch(checkIcon, /<Text\b/);
    assert.match(controller, /selectProjectConversations/);
  },
);

test(
  'project detail state and section actions use accessible stable presentation',
  () => {
    assert.match(state, /accessibilityRole="progressbar"/);
    assert.match(state, /accessibilityLiveRegion/);
    assert.match(state, /minHeight:\s*44/);
    assert.doesNotMatch(state, /errorMessage/);
    assert.match(sectionHeader, /actionIcon\?: ReactNode/);
    assert.match(sectionHeader, /minHeight:\s*44/);
    assert.match(sectionHeader, /motion\.press\.subtleScale/);
    assert.match(detail, /actionIcon=/);
    assert.doesNotMatch(detail, /actionText=\{`\+ /);
  },
);

test(
  'project detail controller owns picker concurrency and cleanup semantics',
  () => {
    assert.match(controller, /beginMutation\(\)/);
    assert.match(controller, /attachmentPicker\.pickMedia\(\)/);
    assert.match(controller, /attachmentPicker\.pickDocuments\(\)/);
    assert.match(controller, /attachmentPicker\.takePhoto\(\)/);
    assert.match(controller, /cleanup-after-remove-failed/);
    assert.match(controller, /'warning'/);
    assert.match(controller, /setError\('add-file-failed'\)/);
    assert.match(controller, /setError\('conversation-update-failed'\)/);
    assert.match(controller, /setConversations\(\(current\) =>/);
  },
);
