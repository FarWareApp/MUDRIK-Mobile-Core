import type {
  CompanionPlacement,
} from './deviceMediaIntent';

export type ReservedRegionImportance =
  | 'important'
  | 'critical';

export type ReservedDisplayRegion = Readonly<{
  regionId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  importance: ReservedRegionImportance;
}>;

export type DisplayLayoutSnapshot = Readonly<{
  viewportWidth: number;
  viewportHeight: number;
  companionWidth: number;
  companionHeight: number;
  currentPlacement: CompanionPlacement | null;
  preferredPlacement: CompanionPlacement | null;
  reducedMotion: boolean;
  reservedRegions: readonly ReservedDisplayRegion[];
  grantsScreenCaptureAuthority: false;
}>;

const LAYOUT_KEYS = new Set([
  'viewportWidth',
  'viewportHeight',
  'companionWidth',
  'companionHeight',
  'currentPlacement',
  'preferredPlacement',
  'reducedMotion',
  'reservedRegions',
]);

const REGION_KEYS = new Set([
  'regionId',
  'x',
  'y',
  'width',
  'height',
  'importance',
]);

const PLACEMENTS: readonly CompanionPlacement[] = [
  'top_left',
  'top_right',
  'bottom_left',
  'bottom_right',
  'center_left',
  'center_right',
  'minimal',
  'hidden',
];

const REGION_ID =
  /^region_[a-z0-9][a-z0-9_-]{7,63}$/;

const MAX_DIMENSION =
  16_384;

function isSafeIntegerBetween(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= minimum
    && value <= maximum
  );
}

function parsePlacement(
  value: unknown,
): CompanionPlacement | null | undefined {
  if (value === null) {
    return null;
  }

  if (
    typeof value === 'string'
    && PLACEMENTS.includes(
      value as CompanionPlacement,
    )
  ) {
    return value as CompanionPlacement;
  }

  return undefined;
}

function parseRegion(
  input: unknown,
  viewportWidth: number,
  viewportHeight: number,
): ReservedDisplayRegion | null {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length !== REGION_KEYS.size
    || Object.keys(record).some(
      (key) => !REGION_KEYS.has(key),
    )
    || typeof record.regionId !== 'string'
    || !REGION_ID.test(record.regionId)
    || !isSafeIntegerBetween(
      record.x,
      0,
      viewportWidth,
    )
    || !isSafeIntegerBetween(
      record.y,
      0,
      viewportHeight,
    )
    || !isSafeIntegerBetween(
      record.width,
      1,
      viewportWidth,
    )
    || !isSafeIntegerBetween(
      record.height,
      1,
      viewportHeight,
    )
    || record.x + record.width
      > viewportWidth
    || record.y + record.height
      > viewportHeight
    || (
      record.importance !== 'important'
      && record.importance !== 'critical'
    )
  ) {
    return null;
  }

  return Object.freeze({
    regionId: record.regionId,
    x: record.x,
    y: record.y,
    width: record.width,
    height: record.height,
    importance:
      record.importance,
  });
}

export function parseDisplayLayoutSnapshot(
  input: unknown,
): DisplayLayoutSnapshot | null {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length !== LAYOUT_KEYS.size
    || Object.keys(record).some(
      (key) => !LAYOUT_KEYS.has(key),
    )
    || !isSafeIntegerBetween(
      record.viewportWidth,
      1,
      MAX_DIMENSION,
    )
    || !isSafeIntegerBetween(
      record.viewportHeight,
      1,
      MAX_DIMENSION,
    )
    || !isSafeIntegerBetween(
      record.companionWidth,
      1,
      record.viewportWidth,
    )
    || !isSafeIntegerBetween(
      record.companionHeight,
      1,
      record.viewportHeight,
    )
    || typeof record.reducedMotion
      !== 'boolean'
    || !Array.isArray(
      record.reservedRegions,
    )
    || record.reservedRegions.length > 32
  ) {
    return null;
  }

  const currentPlacement =
    parsePlacement(
      record.currentPlacement,
    );
  const preferredPlacement =
    parsePlacement(
      record.preferredPlacement,
    );

  if (
    currentPlacement === undefined
    || preferredPlacement === undefined
  ) {
    return null;
  }

  const reservedRegions:
    ReservedDisplayRegion[] = [];
  const seen = new Set<string>();

  for (
    const raw
    of record.reservedRegions
  ) {
    const region =
      parseRegion(
        raw,
        record.viewportWidth,
        record.viewportHeight,
      );

    if (
      !region
      || seen.has(region.regionId)
    ) {
      return null;
    }

    seen.add(region.regionId);
    reservedRegions.push(region);
  }

  return Object.freeze({
    viewportWidth:
      record.viewportWidth,
    viewportHeight:
      record.viewportHeight,
    companionWidth:
      record.companionWidth,
    companionHeight:
      record.companionHeight,
    currentPlacement,
    preferredPlacement,
    reducedMotion:
      record.reducedMotion,
    reservedRegions:
      Object.freeze(
        reservedRegions,
      ),
    grantsScreenCaptureAuthority:
      false,
  });
}
