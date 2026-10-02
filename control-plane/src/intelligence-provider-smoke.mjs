import {
  OpenAIResponsesAdapter,
} from './openai-responses-adapter.mjs';

function required(name) {
  const value = process.env[name];

  if (
    typeof value !== 'string'
    || value.trim().length === 0
  ) {
    throw new Error(
      'missing_' + name,
    );
  }

  return value.trim();
}

async function main() {
  let apiKey;
  let model;

  try {
    apiKey =
      required('OPENAI_API_KEY');
    model =
      required('MUDRIK_OPENAI_MODEL');
  } catch {
    process.stdout.write(
      'MUDRIK_PROVIDER_SMOKE missing_configuration\n',
    );
    return;
  }

  const adapter =
    new OpenAIResponsesAdapter({
      providerRef:
        'provider_openai_1111111111111111',
      modelRef:
        'model_general_1111111111111111',
      apiModel: model,
      credentialRef:
        'secret_ref_openai_primary',
      credentialResolver:
        async () => apiKey,
    });

  const result =
    await adapter.invoke({
      streaming: false,
      inputText:
        'Reply with exactly the word OK.',
      maxOutputTokens: 16,
    });

  apiKey = null;

  if (!result.ok) {
    process.stdout.write(
      'MUDRIK_PROVIDER_SMOKE failed code='
      + result.code
      + ' status='
      + String(result.status ?? 'none')
      + '\n',
    );
    return;
  }

  process.stdout.write(
    'MUDRIK_PROVIDER_SMOKE ok model='
    + model
    + '\n',
  );
}

main().catch(() => {
  process.stdout.write(
    'MUDRIK_PROVIDER_SMOKE failed code=unexpected_exception status=none\n',
  );
});
