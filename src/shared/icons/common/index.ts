import { createIcon } from '../renderers';
import {
  cameraIconDefinition,
  copyIconDefinition,
  heartIconDefinition,
  helpIconDefinition,
  linkIconDefinition,
  locationIconDefinition,
  mapPinIconDefinition,
  starIconDefinition,
} from './definitions';

export const StarIcon = createIcon(starIconDefinition);
export const HeartIcon = createIcon(heartIconDefinition);
export const LocationIcon = createIcon(locationIconDefinition);
export const MapPinIcon = createIcon(mapPinIconDefinition);
export const CameraIcon = createIcon(cameraIconDefinition);
export const LinkIcon = createIcon(linkIconDefinition);
export const CopyIcon = createIcon(copyIconDefinition);
export const HelpIcon = createIcon(helpIconDefinition);

export {
  cameraIconDefinition,
  copyIconDefinition,
  heartIconDefinition,
  helpIconDefinition,
  linkIconDefinition,
  locationIconDefinition,
  mapPinIconDefinition,
  starIconDefinition,
};
