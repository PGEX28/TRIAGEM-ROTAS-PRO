import React from 'react';
import { Card } from '../ui/Card';

interface StopSummaryProps {
  stops: any[];
}

export const StopSummary: React.FC<StopSummaryProps> = ({ stops }) => {
  return (
    <div className="flex flex-col gap-2">
      {stops.map(stop => (
        <Card key={stop.id} style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
          <div className="flex justify-between items-center">
            <div>
              <span style={{ fontWeight: 600 }}>Parada #{stop.stop_number}</span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
                {stop.address?.street}, {stop.address?.number}
              </p>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
              {stop.package_count}
            </div>
          </div>
        </Card>
      ))}
      
      {stops.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
          Nenhuma parada registrada ainda.
        </div>
      )}
    </div>
  );
};
