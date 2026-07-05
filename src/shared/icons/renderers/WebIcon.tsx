/* eslint-disable react-refresh/only-export-components */
import { forwardRef } from 'react';
import type { SVGProps } from 'react';
import type { IconDefinition, SharedIconProps } from '../types';

export type IconProps = SharedIconProps & Omit<SVGProps<SVGSVGElement>, 'color'>;

export type WebIconProps = IconProps & {
  definition: IconDefinition;
};

export function WebIcon({
  definition,
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.75,
  title,
  children,
  ...svgProps
}: WebIconProps) {
  const titleId = title ? `${definition.name}-title` : undefined;

  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-labelledby={titleId}
      fill="none"
      focusable="false"
      height={size}
      role={title ? 'img' : undefined}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox={definition.viewBox ?? '0 0 24 24'}
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...svgProps}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {definition.elements.map((element, index) => {
        const Element = element.tag;
        return <Element key={`${definition.name}-${element.tag}-${index}`} {...element.attrs} />;
      })}
      {children}
    </svg>
  );
}

export function createIcon(definition: IconDefinition) {
  const Icon = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
    <WebIcon ref={ref} definition={definition} {...props} />
  ));

  Icon.displayName = definition.name;
  return Icon;
}
