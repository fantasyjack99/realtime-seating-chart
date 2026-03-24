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

export function SouthCenter({ seats, departments, isHardwareUnlocked, isEngineeringMode, onUpdateSeat, getSeat, onEditClick, onMouseEnter, onMouseLeave }: FloorProps) {
  const renderSeat = (id: string, left: number, top: number, dept: string = '南部營運中心') => {
    const seat = getSeat(id, '待補入', dept);
    return (
      <div 
        key={id} 
        className="absolute w-[56px] h-[48px]"
        style={{ left: `${left}px`, top: `${top}px` }}
      >
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
  };

  return (
    <div className="relative w-[2000px] h-[1000px] bg-white">
      {/* Grid background for alignment (optional, but helps matching) */}
      <div className="absolute inset-0 pointer-events-none opacity-5" style={{ 
        backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}></div>

      {/* Chairman's Office */}
      <div className="absolute left-[40px] top-[230px] w-[180px] h-[260px] bg-[#cccccc] border-2 border-black flex flex-col items-center justify-center text-[18px] font-bold z-10">
        <div>董事長</div>
        <div>辦公室</div>
      </div>

      {/* 4001 Office Area */}
      <div className="absolute left-[40px] top-[490px] w-[180px] h-[160px] bg-[#f27d26] border-2 border-black flex flex-col items-center justify-center z-10">
        <div className="text-center font-bold">
          <div className="text-sm">4001</div>
          <div className="text-lg">吳商平</div>
          <div className="text-sm font-normal">主任</div>
        </div>
        {/* Invisible seat for functionality */}
        <div className="absolute inset-0 opacity-0">
          <SeatCard departments={departments} seat={getSeat('4001', '吳商平', '南部營運中心')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
        </div>
      </div>

      {/* Top Left Seats (L-shape and vertical) */}
      {renderSeat('S2', 160, 18)}
      {renderSeat('S3', 104, 66)}
      {renderSeat('S4', 160, 66)}

      {renderSeat('S6', 280, 18)}
      {renderSeat('S7', 280, 66)}

      {/* Middle Seat Blocks (Next to Chairman) */}
      {/* Block A */}
      {renderSeat('S9', 224, 280)}
      {renderSeat('4005', 280, 280)}
      {renderSeat('S10', 224, 368)}
      {renderSeat('4003', 280, 368)}
      {renderSeat('S29', 224, 456)}

      {/* Block B */}
      {renderSeat('4021', 400, 280)}
      {renderSeat('S11', 456, 280)}
      {renderSeat('4006', 400, 368)}
      {renderSeat('S12', 456, 368)}

      {/* Block C (Left of meeting room) */}
      {renderSeat('S13', 400, 100)}
      {renderSeat('S14', 456, 100)}

      {/* Meeting Room Area */}
      <div className="absolute left-[530px] top-[100px] w-[120px] h-[400px] bg-white border-2 border-black flex flex-col items-center justify-center text-[16px] font-bold z-10">
        <div>會議室</div>
        <div>分機4020</div>
      </div>

      {/* Above Meeting Room: 事務區 */}
      <div className="absolute left-[530px] top-[30px] w-[180px] h-[60px] bg-white border-2 border-black flex items-center justify-center text-[14px] font-bold z-10">
        事務區
      </div>

      {/* Right of Meeting Room: 儲藏間, 接待區 */}
      <div className="absolute left-[650px] top-[90px] w-[60px] h-[90px] bg-white border-2 border-black flex items-center justify-center text-[12px] font-bold z-10">
        儲藏間
      </div>
      <div className="absolute left-[650px] top-[180px] w-[60px] h-[210px] bg-white border-2 border-black flex items-center justify-center text-[12px] font-bold z-10">
        接待區
      </div>

      {/* Right Side: Multi-function area and more seats */}
      <div className="absolute left-[850px] top-[180px] w-[200px] h-[40px] flex items-center justify-center text-[18px] font-bold">
        多功能活動區
      </div>

      {/* Top Right Seats */}
      {/* Block 1 */}
      {renderSeat('S15', 770, 50)}
      {renderSeat('S16', 826, 50)}
      {renderSeat('S17', 770, 98)}
      {renderSeat('S18', 826, 98)}

      {/* Block 2 */}
      {renderSeat('S19', 950, 50)}
      {renderSeat('S20', 1006, 50)}
      {renderSeat('S21', 950, 98)}
      {renderSeat('S22', 1006, 98)}

      {/* Bottom Right Seats (3x2 block) */}
      {renderSeat('S23', 830, 280)}
      {renderSeat('S24', 886, 280)}
      {renderSeat('S25', 942, 280)}
      {renderSeat('S26', 830, 368)}
      {renderSeat('S27', 886, 368)}
      {renderSeat('S28', 942, 368)}

      {/* Entrance Arrows */}
      <div className="absolute left-[730px] top-[510px] flex flex-col items-center gap-2">
        <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-b-[20px] border-b-black"></div>
        <span className="font-bold text-lg">主要入口</span>
      </div>

      <div className="absolute left-[350px] top-[650px] flex items-center gap-2">
        <span className="font-bold text-lg">入口</span>
      </div>
      
      {/* Walls/Lines to match the image structure */}
      <div className="absolute left-[40px] top-[650px] w-[300px] h-[4px] bg-black"></div>
      <div className="absolute left-[400px] top-[520px] w-[4px] h-[134px] bg-black"></div>
      <div className="absolute left-[400px] top-[520px] w-[380px] h-[4px] bg-black"></div>
      <div className="absolute left-[850px] top-[520px] w-[350px] h-[4px] bg-black"></div>
    </div>
  );
}
