import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = '', glass = false, style }) => {
  return (
    <div className={`${glass ? 'glass-panel' : 'card'} ${className}`} style={style}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ title: React.ReactNode; action?: React.ReactNode }> = ({ title, action }) => {
  return (
    <div className="card-header flex items-center justify-between">
      <h3 className="card-title">{title}</h3>
      {action && <div>{action}</div>}
    </div>
  );
};
