import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', isLoading, children, disabled, ...props }, ref) => {
    const baseClass = variant === 'icon' ? 'btn-icon' : 'btn';
    const variantClass = variant !== 'icon' ? `btn-${variant}` : '';
    
    return (
      <button
        ref={ref}
        className={`${baseClass} ${variantClass} ${className}`.trim()}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />}
        {!isLoading && children}
      </button>
    );
  }
);

Button.displayName = 'Button';
