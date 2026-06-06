import {
  Button as MuiButton,
  CircularProgress,
  type ButtonProps as MuiButtonProps,
} from '@mui/material';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'color' | 'size'
> & {
  icon?: ReactNode;
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const variantMap: Record<ButtonVariant, Pick<MuiButtonProps, 'color' | 'variant'>> = {
  danger: { color: 'error', variant: 'contained' },
  ghost: { color: 'primary', variant: 'text' },
  primary: { color: 'primary', variant: 'contained' },
  secondary: { color: 'secondary', variant: 'outlined' },
};

const sizeMap: Record<ButtonSize, MuiButtonProps['size']> = {
  lg: 'large',
  md: 'medium',
  sm: 'small',
};

export function Button({
  children,
  disabled,
  icon,
  loading = false,
  size = 'md',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  const mappedVariant = variantMap[variant];

  return (
    <MuiButton
      {...props}
      color={mappedVariant.color}
      disabled={disabled || loading}
      size={sizeMap[size]}
      startIcon={
        loading ? <CircularProgress color="inherit" size={16} /> : icon
      }
      type={type}
      variant={mappedVariant.variant}
    >
      {children}
    </MuiButton>
  );
}
