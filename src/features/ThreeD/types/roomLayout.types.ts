export type RoomUnit = 'm';

export type BlueprintPoint = {
  id: string;
  x: number;
  y: number;
};

export type BlueprintWall = {
  id: string;
  startPointId: string;
  endPointId: string;
  height: number;
  thickness: number;
  type?: 'WALL';
};

export type DoorSwingDirection = 'IN_LEFT' | 'IN_RIGHT';

export type DoorOpening = {
  height: number;
  id: string;
  offset: number;
  swingDirection: DoorSwingDirection;
  type: 'DOOR';
  wallId: string;
  width: number;
};

export type WindowOpening = {
  height: number;
  id: string;
  offset: number;
  sillHeight: number;
  type: 'WINDOW';
  wallId: string;
  width: number;
};

export type WallOpening = {
  height: number;
  id: string;
  offset: number;
  type: 'OPENING';
  wallId: string;
  width: number;
};

export type RoomOpeningItem = DoorOpening | WindowOpening | WallOpening;

export type SelectedRoomItem =
  | { id: string; type: 'wall' }
  | { id: string; type: 'door' }
  | { id: string; type: 'window' }
  | { id: string; type: 'opening' };

export type RoomMaterialSelection = {
  fallbackColor: string;
  id: string;
  label: string;
  textureUrl?: string;
  type: 'floor' | 'wall' | 'wallpaper';
};

export type RoomLayoutState = {
  unit: RoomUnit;
  wallHeight: number;
  wallThickness: number;
  doors: DoorOpening[];
  floorMaterialId: string;
  openings: WallOpening[];
  wallMaterialId: string;
  windows: WindowOpening[];
  points: BlueprintPoint[];
  walls: BlueprintWall[];
};

export type MaterialSwatch = {
  color: string;
  id: string;
  name: string;
};

export type RoomMaterialSwatches = {
  flooring?: MaterialSwatch[];
  wallPaint: MaterialSwatch[];
};

export type BlueprintTool =
  | 'home'
  | 'select'
  | 'draw'
  | 'add-box'
  | 'l-shape'
  | 'door'
  | 'window'
  | 'opening'
  | 'ceiling'
  | 'hide-labels'
  | 'save';
