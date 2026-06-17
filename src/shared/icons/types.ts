export type IconElementName = 'circle' | 'line' | 'path' | 'polygon' | 'polyline' | 'rect';

export type IconElementAttributes = {
  cx?: number | string;
  cy?: number | string;
  d?: string;
  height?: number | string;
  points?: string;
  r?: number | string;
  rx?: number | string;
  ry?: number | string;
  width?: number | string;
  x?: number | string;
  x1?: number | string;
  x2?: number | string;
  y?: number | string;
  y1?: number | string;
  y2?: number | string;
};

export type IconElementDefinition = {
  tag: IconElementName;
  attrs: IconElementAttributes;
};

export type IconDefinition = {
  name: string;
  viewBox?: string;
  elements: IconElementDefinition[];
};

export type SharedIconProps = {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  title?: string;
};

export const path = (d: string): IconElementDefinition => ({ tag: 'path', attrs: { d } });

export const circle = (cx: number | string, cy: number | string, r: number | string): IconElementDefinition => ({
  tag: 'circle',
  attrs: { cx, cy, r },
});

export const line = (
  x1: number | string,
  y1: number | string,
  x2: number | string,
  y2: number | string,
): IconElementDefinition => ({ tag: 'line', attrs: { x1, y1, x2, y2 } });

export const polyline = (points: string): IconElementDefinition => ({ tag: 'polyline', attrs: { points } });

export const polygon = (points: string): IconElementDefinition => ({ tag: 'polygon', attrs: { points } });

export const rect = (
  x: number | string,
  y: number | string,
  width: number | string,
  height: number | string,
  rx?: number | string,
): IconElementDefinition => ({ tag: 'rect', attrs: { x, y, width, height, rx } });

export const defineIcon = (name: string, elements: IconElementDefinition[], viewBox = '0 0 24 24'): IconDefinition => ({
  name,
  viewBox,
  elements,
});
