import React from 'react';
import { Seat } from '../types';
import { SeatCard } from './SeatCard';

interface FloorProps {
  seats: Seat[];
  isHardwareUnlocked: boolean;
  isEngineeringMode: boolean;
  onUpdateSeat: (seat: Seat) => void;
  getSeat: (id: string, defaultName?: string, dept?: string) => Seat;
  onEditClick: (seat: Seat, type: 'hardware' | 'engineering') => void;
}

export function Floor3({ seats, isHardwareUnlocked, isEngineeringMode, onUpdateSeat, getSeat, onEditClick }: FloorProps) {
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
                    isHardwareUnlocked={isHardwareUnlocked}
                    isEngineeringMode={isEngineeringMode}
                    onUpdate={onUpdateSeat}
                    onEditClick={onEditClick}
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
      {/* 財務室 - Left Column */}
      <div className="absolute left-[100px] top-[80px] w-[114px] h-[96px] bg-[#ffe6cc] border border-black flex flex-col items-center justify-center text-[12px] font-bold">
        <div>811</div>
        <div>林淑瑋</div>
        <div>主任</div>
      </div>

      {renderBlock([
        ['815', '819'],
        ['816', '818']
      ], 100, 180)}

      <div className="absolute left-[100px] top-[280px] w-[114px] h-[48px] bg-white border border-black flex flex-col items-center justify-center text-[10px] font-bold">
        <div>304會議室</div>
        <div>分機6304</div>
      </div>
      <div className="absolute left-[100px] top-[328px] w-[114px] h-[48px] bg-white border border-black flex flex-col items-center justify-center text-[10px] font-bold">
        <div>303會議室</div>
        <div>分機6303</div>
      </div>

      {/* 內容策進處 - Top Row */}
      {renderBlock([
        ['812', '813'],
        ['305', '311']
      ], 250, 80)}

      {renderBlock([
        ['309', '307'],
        ['328', '332']
      ], 400, 80)}

      {renderBlock([
        ['333', '310'],
        ['381', '3936']
      ], 550, 80)}

      {renderBlock([
        ['339', '380']
      ], 700, 80)}

      <div className="absolute left-[770px] top-[80px] w-[114px] h-[96px] bg-[#cce0ff] border border-black flex flex-col items-center justify-center text-[12px] font-bold">
        <div>303</div>
        <div>蘇韋菁</div>
        <div>處長</div>
      </div>

      {/* 內容策進處 - Second Row */}
      {renderBlock([
        ['317', '308'],
        ['369', '350']
      ], 250, 250)}

      {renderBlock([
        ['306', '331'],
        ['329', '325']
      ], 400, 250)}

      {renderBlock([
        ['3932', '3931'],
        ['3935', '383']
      ], 550, 250)}

      {renderBlock([
        ['320', '323'],
        ['313', '319']
      ], 700, 250)}

      {/* 內容策進處 - Bottom Right */}
      {renderBlock([
        ['382', '435', '315'],
        ['322', '384', '330']
      ], 700, 420)}

      {/* Other Rooms */}
      <div className="absolute left-[250px] top-[400px] w-[200px] h-[60px] bg-white border border-black flex items-center justify-center text-[12px] font-bold">
        影印室
      </div>
      <div className="absolute left-[250px] top-[460px] w-[200px] h-[60px] bg-white border border-black flex items-center justify-center text-[12px] font-bold">
        儲藏室
      </div>

      <div className="absolute left-[350px] top-[550px] w-[200px] h-[80px] bg-white border border-black flex flex-col items-center justify-center text-[12px] font-bold">
        <div>302會議室</div>
        <div>分機6302</div>
      </div>

      <div className="absolute left-[650px] top-[600px] w-[200px] h-[150px] bg-white border border-black flex flex-col items-center justify-center text-[12px] font-bold">
        <div>301會議室</div>
        <div>分機6301</div>
      </div>

      <div className="absolute left-[900px] top-[250px] w-[50px] h-[100px] bg-white border border-black flex items-center justify-center text-[12px] font-bold text-center">
        開放會<br/>議區
      </div>

      {/* Entrance Arrow */}
      <div className="absolute left-[450px] top-[700px] flex items-center gap-2">
        <span className="font-bold text-sm">主要入口</span>
        <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[15px] border-l-black border-b-[10px] border-b-transparent"></div>
        <div className="w-[100px] h-[2px] bg-black"></div>
      </div>
    </>
  );
}
