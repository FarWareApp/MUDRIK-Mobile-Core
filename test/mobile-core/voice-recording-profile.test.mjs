import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const profile = fs.readFileSync(
  'src/features/voice/VoiceRecordingProfile.ts',
  'utf8',
);
const controller = fs.readFileSync(
  'src/features/voice/hooks/useVoiceRecorderController.ts',
  'utf8',
);

test(
  'MUDRIK voice recording profile keeps a higher fidelity stable AAC baseline',
  () => {
    assert.match(
      profile,
      /RecordingPresets\.HIGH_QUALITY/,
    );
    assert.match(
      profile,
      /MUDRIK_VOICE_SAMPLE_RATE\s*=\s*48_000/,
    );
    assert.match(
      profile,
      /MUDRIK_VOICE_BIT_RATE\s*=\s*192_000/,
    );
    assert.match(
      profile,
      /sampleRate:\s*MUDRIK_VOICE_SAMPLE_RATE/,
    );
    assert.match(
      profile,
      /bitsPerSecond:\s*MUDRIK_VOICE_BIT_RATE/,
    );

    // Do not silently force Android voice processing. Input-source
    // tuning must remain a separately validated product decision.
    assert.doesNotMatch(
      profile,
      /audioSource:/,
    );

    assert.match(
      controller,
      /MUDRIK_VOICE_RECORDING_OPTIONS/,
    );
    assert.doesNotMatch(
      controller,
      /RecordingPresets\.HIGH_QUALITY/,
    );
  },
);
