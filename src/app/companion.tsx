import React from 'react';

import {
  appServices,
} from '../core/composition/AppServices';

import {
  CompanionScreen,
} from '../features/companion/CompanionScreen';

export default function CompanionRoute() {
  return (
    <CompanionScreen
      repository={
        appServices.companionRepository
      }
    />
  );
}
