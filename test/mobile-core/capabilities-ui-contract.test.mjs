import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const screen = fs.readFileSync(
  'src/features/capabilities/CapabilitiesScreen.tsx',
  'utf8',
);
const overview = fs.readFileSync(
  'src/features/capabilities/capabilityOverview.ts',
  'utf8',
);
const integrationCard = fs.readFileSync(
  'src/features/capabilities/components/IntegrationCapabilityCard.tsx',
  'utf8',
);
const header = fs.readFileSync(
  'src/features/capabilities/components/CapabilitiesScreenHeader.tsx',
  'utf8',
);
const route = fs.readFileSync(
  'src/app/capabilities.tsx',
  'utf8',
);
const settings = fs.readFileSync(
  'src/features/settings/SettingsScreen.tsx',
  'utf8',
);
const catalog = fs.readFileSync(
  'src/core/localization/translationCatalog.ts',
  'utf8',
);
const translations = fs.readFileSync(
  'src/core/localization/capabilityTranslations.ts',
  'utf8',
);
const integrationCore = fs.readFileSync(
  'src/core/integrations/integrationCapability.ts',
  'utf8',
);
const intelligenceCore = fs.readFileSync(
  'src/core/intelligence/intelligenceProvider.ts',
  'utf8',
);

test(
  'capability map is derived from canonical core definitions instead of duplicated UI data',
  () => {
    assert.match(
      overview,
      /MUDRIK_CAPABILITIES/,
    );
    assert.match(
      overview,
      /MEMORY_CATEGORIES/,
    );
    assert.match(
      overview,
      /INTELLIGENCE_SERVICE_KINDS/,
    );
    assert.match(
      overview,
      /INTEGRATION_CAPABILITIES/,
    );
    assert.match(
      overview,
      /integrationCapabilityDefinition/,
    );

    assert.match(
      integrationCore,
      /export const INTEGRATION_CAPABILITIES/,
    );
    assert.match(
      intelligenceCore,
      /export const INTELLIGENCE_SERVICE_KINDS/,
    );
  },
);

test(
  'capability map remains read-only and cannot grant execution authority',
  () => {
    const combined =
      screen
      + overview
      + integrationCard;

    assert.doesNotMatch(
      combined,
      /authorizeCapability\s*\(/,
    );
    assert.doesNotMatch(
      combined,
      /grantCapability/,
    );
    assert.doesNotMatch(
      combined,
      /approveCommand/,
    );
    assert.doesNotMatch(
      combined,
      /executeCommand/,
    );
    assert.doesNotMatch(
      combined,
      /credentialRef/,
    );
    assert.doesNotMatch(
      combined,
      /grantsAuthority\s*:\s*true/,
    );

    assert.doesNotMatch(
      integrationCard,
      /<Pressable/,
    );
  },
);

test(
  'capability map uses premium surfaces and accessible navigation without glyph-only controls',
  () => {
    assert.match(
      screen,
      /PremiumHeroSurface/,
    );
    assert.match(
      screen,
      /InsetSurfaceCard/,
    );
    assert.match(
      screen,
      /CapabilityStatCard/,
    );
    assert.match(
      screen,
      /IntegrationCapabilityCard/,
    );
    assert.match(
      header,
      /accessibilityRole="button"/,
    );
    assert.match(
      header,
      /accessibilityRole="header"/,
    );
    assert.match(
      header,
      /minHeight:\s*70/,
    );
    assert.doesNotMatch(
      header,
      /[‹›←→]/u,
    );
  },
);

test(
  'settings exposes the capability map as a real routed surface',
  () => {
    assert.match(
      route,
      /CapabilitiesScreen/,
    );
    assert.match(
      settings,
      /router\.push\('\/capabilities'\)/,
    );
    assert.match(
      settings,
      /settingsCapabilitiesSection/,
    );
    assert.match(
      settings,
      /openCapabilities/,
    );
  },
);

test(
  'capability localization is feature-scoped and complete for all supported locales',
  () => {
    assert.match(
      catalog,
      /capabilityTranslations/,
    );
    assert.match(
      catalog,
      /CapabilityTranslationKey/,
    );

    for (const key of [
      'capabilitiesTitle',
      'capabilitiesHeroTitle',
      'capabilitiesDescription',
      'capabilitiesSecurity',
      'capabilitiesMemory',
      'capabilitiesIntelligence',
      'capabilitiesIntegrations',
      'settingsCapabilitiesTitle',
      'openCapabilities',
    ]) {
      const pattern = new RegExp(
        '^\\s*' + key + ':',
        'gm',
      );

      assert.equal(
        translations.match(pattern)?.length ?? 0,
        3,
        key + ' must exist in ar, de and en',
      );
    }
  },
);

test(
  'premium capability surfaces avoid unstable render-time behavior',
  () => {
    const combined =
      screen
      + overview
      + integrationCard;

    assert.doesNotMatch(
      combined,
      /Math\.random/,
    );
    assert.doesNotMatch(
      combined,
      /setInterval\s*\(/,
    );
    assert.doesNotMatch(
      combined,
      /setTimeout\s*\(/,
    );
    assert.doesNotMatch(
      combined,
      /useEffect\s*\(/,
    );
  },
);
