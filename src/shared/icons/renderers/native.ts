import type { IconDefinition, IconElementDefinition, SharedIconProps } from '../types';

export type NativeIconRenderProps = Required<Pick<SharedIconProps, 'color' | 'size' | 'strokeWidth'>> &
  Pick<SharedIconProps, 'title'> & {
    definition: IconDefinition;
  };

export type NativeIconPrimitiveRenderer<TNode> = {
  Svg: (props: NativeIconRenderProps & { children: TNode[] }) => TNode;
  Circle: (props: IconElementDefinition['attrs']) => TNode;
  Line: (props: IconElementDefinition['attrs']) => TNode;
  Path: (props: IconElementDefinition['attrs']) => TNode;
  Polygon: (props: IconElementDefinition['attrs']) => TNode;
  Polyline: (props: IconElementDefinition['attrs']) => TNode;
  Rect: (props: IconElementDefinition['attrs']) => TNode;
};

export function createNativeIconRenderer<TNode>(primitives: NativeIconPrimitiveRenderer<TNode>) {
  return function renderNativeIcon(definition: IconDefinition, props: SharedIconProps = {}) {
    const renderProps: NativeIconRenderProps = {
      definition,
      size: props.size ?? 24,
      color: props.color ?? 'currentColor',
      strokeWidth: props.strokeWidth ?? 1.75,
      title: props.title,
    };

    const children = definition.elements.map((element) => {
      switch (element.tag) {
        case 'circle':
          return primitives.Circle(element.attrs);
        case 'line':
          return primitives.Line(element.attrs);
        case 'path':
          return primitives.Path(element.attrs);
        case 'polygon':
          return primitives.Polygon(element.attrs);
        case 'polyline':
          return primitives.Polyline(element.attrs);
        case 'rect':
          return primitives.Rect(element.attrs);
        default:
          return primitives.Path({});
      }
    });

    return primitives.Svg({ ...renderProps, children });
  };
}
