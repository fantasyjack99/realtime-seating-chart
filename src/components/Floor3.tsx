import React from 'react';
import { Seat, DepartmentConfig } from '../types';
import { SeatCard } from './SeatCard';

interface FloorProps {
  seats: Seat[];
  departments: DepartmentConfig[];
  isHardwareUnlocked: boolean;
  isEngineeringMode: boolean;
  onUpdateSeat: (seat: Seat) => void;
  getSeat: (id: string, defaultName?: string, dept?: string) => Seat;
  onEditClick: (seat: Seat, type: 'hardware' | 'engineering') => void;
  onMouseEnter?: (seatId: string) => void;
  onMouseLeave?: () => void;
}

export function Floor3({ seats, departments, isHardwareUnlocked, isEngineeringMode, onUpdateSeat, getSeat, onEditClick, onMouseEnter, onMouseLeave }: FloorProps) {
  // Helper to render a 2x2 or 2xN block
  const renderBlock = (seatIds: (string | null)[][], left: number, top: number, dept: string = '') => {
    return (
      <div 
        className="absolute flex gap-2"
        style={{ left: `${left}px`, top: `${top}px` }}
      >
        {seatIds.map((col, colIdx) => (
          <div key={`col-${colIdx}`} className="flex flex-col gap-0.5">
            {col.map((seatId, rowIdx) => {
              if (seatId === null) {
                return <div key={`empty-${colIdx}-${rowIdx}`} className="w-[56px] h-[48px]" />;
              }
              const seat = getSeat(seatId, '待補入', dept);
              return (
                <div key={seatId} className="w-[56px] h-[48px]">
                  <SeatCard 
                    seat={seat} 
                    departments={departments}
                    isHardwareUnlocked={isHardwareUnlocked}
                    isEngineeringMode={isEngineeringMode}
                    onUpdate={onUpdateSeat}
                    onEditClick={onEditClick}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Boundary Line */}
      <svg className="absolute left-[-4px] top-[-4px] w-[1000px] h-[800px] pointer-events-none z-0 overflow-visible">
        <path 
          d="M 0 0 L 780 0 L 780 166 L 864 166 L 864 684 L 250 684 L 250 459 L 150 459 L 150 312 L 0 312 Z" 
          fill="none" 
          stroke="black" 
          strokeWidth="3" 
        />
      </svg>

      {/* 財務室 - Left Column */}
      <div className="absolute left-[-4px] top-[-4px] w-[114px] h-[96px] bg-[#ffe6cc] border border-black flex flex-col items-center justify-center text-[12px] font-bold">
        <div>811</div>
        <div>林淑瑋</div>
        <div>主任</div>
      </div>

      {renderBlock([
        ['815', '819'],
        ['816', '818']
      ], -4, 96)}

      <div className="absolute left-[-4px] top-[196px] w-[114px] h-[48px] bg-white border border-black flex flex-col items-center justify-center text-[10px] font-bold">
        <div>304會議室</div>
        <div>分機6304</div>
      </div>
      <div className="absolute left-[-4px] top-[244px] w-[114px] h-[48px] bg-white border border-black flex flex-col items-center justify-center text-[10px] font-bold">
        <div>303會議室</div>
        <div>分機6303</div>
      </div>

      {/* 內容策進處 - Top Row */}
      {renderBlock([
        ['812', '813'],
        ['305', '311']
      ], 146, -4)}

      {renderBlock([
        ['309', '307'],
        ['328', '332']
      ], 296, -4)}

      {renderBlock([
        ['333', '310'],
        ['381', '3936']
      ], 446, -4)}

      {renderBlock([
        ['339', '380']
      ], 596, -4)}

      <div className="absolute left-[666px] top-[-4px] w-[114px] h-[96px] bg-[#cce0ff] border border-black flex flex-col items-center justify-center text-[12px] font-bold">
        <div>303</div>
        <div>蘇韋菁</div>
        <div>處長</div>
      </div>

      {/* 內容策進處 - Second Row */}
      {renderBlock([
        ['317', '308'],
        ['369', '350']
      ], 146, 166)}

      {renderBlock([
        ['306', '331'],
        ['329', '325']
      ], 296, 166)}

      {renderBlock([
        ['3932', '3931'],
        ['3935', '383']
      ], 446, 166)}

      {renderBlock([
        ['320', '323'],
        ['313', '319']
      ], 596, 166)}

      {/* 內容策進處 - Bottom Right */}
      {renderBlock([
        ['382', '435', '315'],
        ['322', '384', '330']
      ], 596, 336)}

      {/* Other Rooms */}
      <div className="absolute left-[146px] top-[316px] w-[200px] h-[60px] bg-white border border-black flex items-center justify-center text-[12px] font-bold">
        影印室
      </div>
      <div className="absolute left-[146px] top-[376px] w-[200px] h-[60px] bg-white border border-black flex items-center justify-center text-[12px] font-bold">
        儲藏室
      </div>

      <div className="absolute left-[246px] top-[466px] w-[200px] h-[80px] bg-white border border-black flex flex-col items-center justify-center text-[12px] font-bold">
        <div>302會議室</div>
        <div>分機6302</div>
      </div>

      <div className="absolute left-[546px] top-[516px] w-[200px] h-[150px] bg-white border border-black flex flex-col items-center justify-center text-[12px] font-bold">
        <div>301會議室</div>
        <div>分機6301</div>
      </div>

      <div className="absolute left-[796px] top-[166px] w-[50px] h-[100px] bg-white border border-black flex items-center justify-center text-[12px] font-bold text-center">
        開放會<br/>議區
      </div>

      {/* Entrance Arrow */}
      <div className="absolute left-[346px] top-[616px] flex items-center gap-2">
        <span className="font-bold text-sm">主要入口</span>
        <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[15px] border-l-black border-b-[10px] border-b-transparent"></div>
        <div className="w-[100px] h-[2px] bg-black"></div>
      </div>
    </>
  );
}
