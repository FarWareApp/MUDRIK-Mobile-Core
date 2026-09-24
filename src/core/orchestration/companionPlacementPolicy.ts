import {
  parseDisplayLayoutSnapshot,
} from './displayLayoutContract';

import type {
  DisplayLayoutSnapshot,
  ReservedDisplayRegion,
} from './displayLayoutContract';

import type {
  CompanionPlacement,
} from './deviceMediaIntent';

export type CompanionPlacementDecision = Readonly<{
  placement: CompanionPlacement | null;
  x: number | null;
  y: number | null;
  animate: boolean;
  automaticMovement: boolean;
  reason:
    | 'preferred_selected'
    | 'current_kept'
    | 'safe_reposition'
    | 'minimal_fallback'
    | 'hidden'
    | 'invalid_layout';
  requiresVisionAuthority: false;
}>;

type Rect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

const SPATIAL_PLACEMENTS: readonly CompanionPlacement[] = [
  'bottom_right',
  'bottom_left',
  'top_right',
  'top_left',
  'center_right',
  'center_left',
];

function result(
  placement: CompanionPlacement | null,
  x: number | null,
  y: number | null,
  animate: boolean,
  automaticMovement: boolean,
  reason: CompanionPlacementDecision['reason'],
): CompanionPlacementDecision {
  return Object.freeze({
    placement,
    x,
    y,
    animate,
    automaticMovement,
    reason,
    requiresVisionAuthority: false,
  });
}

function placementRect(
  layout: DisplayLayoutSnapshot,
  placement: CompanionPlacement,
): Rect | null {
  if (
    placement === 'minimal'
    || placement === 'hidden'
  ) {
    return null;
  }

  const horizontalRoom =
    layout.viewportWidth
    - layout.companionWidth;
  const verticalRoom =
    layout.viewportHeight
    - layout.companionHeight;

  const margin = Math.max(
    0,
    Math.min(
      16,
      Math.floor(
        horizontalRoom / 2,
      ),
      Math.floor(
        verticalRoom / 2,
      ),
    ),
  );

  let x: number;
  let y: number;

  switch (placement) {
    case 'top_left':
      x = margin;
      y = margin;
      break;
    case 'top_right':
      x =
        horizontalRoom
        - margin;
      y = margin;
      break;
    case 'bottom_left':
      x = margin;
      y =
        verticalRoom
        - margin;
      break;
    case 'bottom_right':
      x =
        horizontalRoom
        - margin;
      y =
        verticalRoom
        - margin;
      break;
    case 'center_left':
      x = margin;
      y =
        Math.floor(
          verticalRoom / 2,
        );
      break;
    case 'center_right':
      x =
        horizontalRoom
        - margin;
      y =
        Math.floor(
          verticalRoom / 2,
        );
      break;
    default:
      return null;
  }

  return Object.freeze({
    x,
    y,
    width:
      layout.companionWidth,
    height:
      layout.companionHeight,
  });
}

function overlaps(
  rect: Rect,
  region: ReservedDisplayRegion,
): boolean {
  return !(
    rect.x + rect.width
      <= region.x
    || region.x + region.width
      <= rect.x
    || rect.y + rect.height
      <= region.y
    || region.y + region.height
      <= rect.y
  );
}

function isSafePlacement(
  layout: DisplayLayoutSnapshot,
  placement: CompanionPlacement,
): boolean {
  const rect =
    placementRect(
      layout,
      placement,
    );

  if (!rect) {
    return (
      placement === 'minimal'
      || placement === 'hidden'
    );
  }

  return !layout.reservedRegions.some(
    (region) =>
      overlaps(rect, region),
  );
}

function chooseSpatialPlacement(
  layout: DisplayLayoutSnapshot,
): CompanionPlacement | null {
  for (
    const placement
    of SPATIAL_PLACEMENTS
  ) {
    if (
      isSafePlacement(
        layout,
        placement,
      )
    ) {
      return placement;
    }
  }

  return null;
}

export function decideCompanionPlacement(
  layoutInput: unknown,
): CompanionPlacementDecision {
  const layout =
    parseDisplayLayoutSnapshot(
      layoutInput,
    );

  if (!layout) {
    return result(
      null,
      null,
      null,
      false,
      false,
      'invalid_layout',
    );
  }

  if (
    layout.preferredPlacement
      === 'hidden'
  ) {
    return result(
      'hidden',
      null,
      null,
      false,
      layout.currentPlacement
        !== 'hidden',
      'hidden',
    );
  }

  if (
    layout.preferredPlacement
      === 'minimal'
  ) {
    return result(
      'minimal',
      null,
      null,
      false,
      layout.currentPlacement
        !== 'minimal',
      'minimal_fallback',
    );
  }

  if (
    layout.preferredPlacement
    && isSafePlacement(
      layout,
      layout.preferredPlacement,
    )
  ) {
    const rect =
      placementRect(
        layout,
        layout.preferredPlacement,
      )!;

    const changed =
      layout.currentPlacement
        !== layout.preferredPlacement;

    return result(
      layout.preferredPlacement,
      rect.x,
      rect.y,
      changed
        && !layout.reducedMotion,
      changed,
      'preferred_selected',
    );
  }

  if (
    layout.currentPlacement
    && isSafePlacement(
      layout,
      layout.currentPlacement,
    )
  ) {
    if (
      layout.currentPlacement
        === 'hidden'
    ) {
      return result(
        'hidden',
        null,
        null,
        false,
        false,
        'current_kept',
      );
    }

    if (
      layout.currentPlacement
        === 'minimal'
    ) {
      return result(
        'minimal',
        null,
        null,
        false,
        false,
        'current_kept',
      );
    }

    const rect =
      placementRect(
        layout,
        layout.currentPlacement,
      )!;

    return result(
      layout.currentPlacement,
      rect.x,
      rect.y,
      false,
      false,
      'current_kept',
    );
  }

  const next =
    chooseSpatialPlacement(
      layout,
    );

  if (!next) {
    return result(
      'minimal',
      null,
      null,
      false,
      layout.currentPlacement
        !== 'minimal',
      'minimal_fallback',
    );
  }

  const rect =
    placementRect(
      layout,
      next,
    )!;

  const changed =
    layout.currentPlacement
      !== next;

  return result(
    next,
    rect.x,
    rect.y,
    changed
      && !layout.reducedMotion,
    changed,
    'safe_reposition',
  );
}
