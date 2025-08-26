'use client';

import React from 'react';

interface Props {
  counterId: number;
  counterName: string;
  servingNumber: number | null;
  waitingNumbers: number[]; // small preview (max 4)
  isEven?: boolean;
  minHeight?: number;
}

const shallowArrayEqual = (a: number[], b: number[]) => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

function CounterRowComponent({ counterId, counterName, servingNumber, waitingNumbers, isEven = false, minHeight = 80 }: Props) {
  return (
    <div
      className={`grid border-b border-white last:rounded-b-xl ${isEven ? 'bg-gray-300 bg-opacity-80' : 'bg-pink-100  bg-opacity-80'}`}
      style={{ minHeight, alignItems: 'center', gridTemplateColumns: '1.6fr 0.8fr 1fr' } as React.CSSProperties}
      role="row"
      aria-label={`Quầy ${counterId}`}
    >
      <div className="text-xl font-extrabold text-red-800 px-4 py-3 border-r border-white uppercase" style={{ fontSize: '1.1rem' }}>
        QUẦY {counterId} | {counterName}
      </div>

      <div className="text-5xl font-extrabold text-center text-red-800 px-4 py-3 border-r border-white">
        {servingNumber != null ? (
          <span className="inline-block">{servingNumber.toString()}</span>
        ) : (
          <span className="text-gray-400 text-xl font-bold">Chưa có số được phục vụ</span>
        )}
      </div>

      <div className="text-4xl font-extrabold text-center text-red-800 px-4 py-3">
        {waitingNumbers.length > 0 ? (
          <>
            {waitingNumbers.map((number, index) => (
              <span key={`waiting-${counterId}-${number}-${index}`}>{number}{index < waitingNumbers.length - 1 ? ', ' : ''}</span>
            ))}
            {waitingNumbers.length > 4 && <span className="text-base text-gray-500 font-normal"> ... </span>}
          </>
        ) : (
          <span className="text-gray-400 text-xl font-bold">Không có số đang chờ</span>
        )}
      </div>
    </div>
  );
}

// Memo with shallow props comparison (only re-render when relevant props change)
export default React.memo(CounterRowComponent, (prev, next) => {
  return (
    prev.counterId === next.counterId &&
    prev.counterName === next.counterName &&
    prev.servingNumber === next.servingNumber &&
    shallowArrayEqual(prev.waitingNumbers, next.waitingNumbers) &&
    prev.isEven === next.isEven &&
    prev.minHeight === next.minHeight
  );
});
