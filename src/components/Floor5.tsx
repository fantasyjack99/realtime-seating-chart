import React from 'react';
import { Seat, DepartmentConfig } from '../types';
import { SeatCard } from './SeatCard';
import { departmentLayouts } from '../layouts';

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

export function Floor5({ seats, departments, isHardwareUnlocked, isEngineeringMode, onUpdateSeat, getSeat, onEditClick, onMouseEnter, onMouseLeave }: FloorProps) {
  const renderDepartmentGrid = (dept: string, left: number, top: number) => {
    const layout = departmentLayouts[dept];
    if (!layout) return null;

    const isCrossCol = dept.startsWith('Col');

    return (
      <div key={dept} style={{ position: 'absolute', left, top }} className="flex flex-col gap-0.5">
        <div className="flex flex-col gap-0.5">
          {layout.map((row, rowIndex) => {
            // Special handling for the cross seating arrangement
            if (isCrossCol && rowIndex === 4) {
              // Row 4 is empty, Row 5 and 6 are the 2x2 block
              // We will render all 3 rows as a cross shape here
              const seatTop = layout[5]?.[0];
              const seatRight = layout[5]?.[1];
              const seatLeft = layout[6]?.[0];
              const seatBottom = layout[6]?.[1];

              return (
                <div key="cross-block" className="relative w-[114px] h-[148px] mt-[30px]">
                  {/* Top Seat */}
                  {seatTop && (
                    <div className="absolute left-[29px] top-0 w-[56px] h-[48px]">
                      <SeatCard 
                        seat={getSeat(seatTop, '待補入', dept)} 
                        departments={departments}
                        isHardwareUnlocked={isHardwareUnlocked}
                        isEngineeringMode={isEngineeringMode}
                        onUpdate={onUpdateSeat}
                        onEditClick={onEditClick}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                      />
                    </div>
                  )}
                  {/* Left Seat */}
                  {seatLeft && (
                    <div className="absolute left-0 top-[50px] w-[56px] h-[48px]">
                      <SeatCard 
                        seat={getSeat(seatLeft, '待補入', dept)} 
                        departments={departments}
                        isHardwareUnlocked={isHardwareUnlocked}
                        isEngineeringMode={isEngineeringMode}
                        onUpdate={onUpdateSeat}
                        onEditClick={onEditClick}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                      />
                    </div>
                  )}
                  {/* Right Seat */}
                  {seatRight && (
                    <div className="absolute left-[58px] top-[50px] w-[56px] h-[48px]">
                      <SeatCard 
                        seat={getSeat(seatRight, '待補入', dept)} 
                        departments={departments}
                        isHardwareUnlocked={isHardwareUnlocked}
                        isEngineeringMode={isEngineeringMode}
                        onUpdate={onUpdateSeat}
                        onEditClick={onEditClick}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                      />
                    </div>
                  )}
                  {/* Bottom Seat */}
                  {seatBottom && (
                    <div className="absolute left-[29px] top-[100px] w-[56px] h-[48px]">
                      <SeatCard 
                        seat={getSeat(seatBottom, '待補入', dept)} 
                        departments={departments}
                        isHardwareUnlocked={isHardwareUnlocked}
                        isEngineeringMode={isEngineeringMode}
                        onUpdate={onUpdateSeat}
                        onEditClick={onEditClick}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                      />
                    </div>
                  )}
                </div>
              );
            }
            if (isCrossCol && (rowIndex === 5 || rowIndex === 6)) {
              return null; // Already rendered in row 4
            }

            return (
              <div key={rowIndex} className="flex gap-0.5">
                {row.map((seatId, colIndex) => {
                  if (!seatId) {
                    return <div key={`empty-${rowIndex}-${colIndex}`} className="w-[56px] h-[48px]" />;
                  }
                  const seat = getSeat(seatId, '待補入', dept);
                  return (
                    <div key={`${seat.Seat_ID}-${rowIndex}-${colIndex}`} className="w-[56px] h-[48px]">
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
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Static Elements */}
      <div className="absolute left-0 top-[100px] w-[60px] h-[200px] border-r border-b border-black flex items-center justify-center text-xs" style={{ writingMode: 'vertical-rl' }}>員工休息區</div>
      <div className="absolute left-0 top-[350px] w-[80px] h-[60px]">
        <SeatCard departments={departments} seat={getSeat('106會議室', '106會議室', '公共區域')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
      </div>
      <div className="absolute left-0 top-[410px] w-[80px] h-[60px]">
        <SeatCard departments={departments} seat={getSeat('107會議室', '107會議室', '公共區域')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
      </div>
      <div className="absolute left-0 top-[470px] w-[180px] h-[100px]">
        <SeatCard departments={departments} seat={getSeat('108多功能會議室', '108多功能會議室', '公共區域')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
      </div>
      
      {/* Top Row Static */}
      <div className="absolute left-[60px] top-0 w-[40px] h-[60px] border-r border-b border-black flex items-center justify-center text-[10px] text-center">哺(集)<br/>乳室</div>
      <div className="absolute left-[100px] top-0 w-[114px] h-[60px] border-r border-b border-black flex items-center justify-center text-[10px]">影印室</div>
      
      {/* Top Row Seats */}
      <div className="absolute left-[104px] top-0 w-[1390px] h-[60px] flex">
        <div className="flex-1 h-full flex">
          <div className="flex-1 h-full flex flex-col">
            <div className="flex-1 relative overflow-hidden"><SeatCard departments={departments} seat={getSeat('150-1', '待補入', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
            <div className="flex-1 relative overflow-hidden"><SeatCard departments={departments} seat={getSeat('150-2', '待補入', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
          </div>
          <div className="flex-1 h-full relative overflow-hidden"><SeatCard departments={departments} seat={getSeat('150-3', '待補入', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        </div>
        <div className="flex-1 h-full"><SeatCard departments={departments} seat={getSeat('601', '葉敏慧', '行政管理處')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        <div className="h-full" style={{ flex: '0 0 145px' }}><SeatCard departments={departments} seat={getSeat('105討論室', '會議室', '公共區域')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        <div className="flex-1 h-full"><SeatCard departments={departments} seat={getSeat('201', '丁心雅', '文化金融處')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        <div className="flex-1 h-full"><SeatCard departments={departments} seat={getSeat('116', '李又芳', '文化金融處')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        <div className="flex-1 h-full"><SeatCard departments={departments} seat={getSeat('113', '林雨欣', 'ESG影響力中心')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        <div className="flex-1 h-full"><SeatCard departments={departments} seat={getSeat('701', '林喜雯', '策略研究處')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        <div className="flex-1 h-full"><SeatCard departments={departments} seat={getSeat('501', '待補入', '全球市場處')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        <div className="flex-1 h-full"><SeatCard departments={departments} seat={getSeat('822', '胡文嘉', '全球市場處')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        <div className="flex-1 h-full"><SeatCard departments={departments} seat={getSeat('120', 'MICOL, JEAN-ROMAIN', '全球市場處')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        <div className="flex-1 h-full"><SeatCard departments={departments} seat={getSeat('801', '吳御曄', '全球市場處')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
      </div>
      <div className="absolute left-[1494px] top-0 w-[40px] h-[60px] border-r border-b border-black flex items-center justify-center text-[10px]">影印室</div>

      {/* Bottom Row */}
      <div className="absolute left-[548px] top-[480px] w-[56px] h-[48px]">
        <SeatCard departments={departments} seat={getSeat('621', '陳佳欣', '行政管理處')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
      </div>
      <div className="absolute left-[620px] top-[480px] w-[56px] h-[48px]">
        <SeatCard departments={departments} seat={getSeat('620', '謝竹婷', '行政管理處')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
      </div>
      
      <div className="absolute left-[548px] top-[540px] w-[128px] h-[48px] border border-black flex items-center justify-center text-[12px] font-bold">
        電梯
      </div>
      {renderDepartmentGrid('Col1', 100, 100)}
      {renderDepartmentGrid('Col2', 230, 100)}
      {renderDepartmentGrid('Col3', 360, 100)}
      {renderDepartmentGrid('Col4', 490, 100)}
      {renderDepartmentGrid('Col5', 620, 100)}
      {renderDepartmentGrid('Col6', 750, 100)}
      {renderDepartmentGrid('Col7', 880, 100)}
      {renderDepartmentGrid('Col8', 1010, 100)}
      {renderDepartmentGrid('Col9', 1140, 100)}
      {renderDepartmentGrid('Col10', 1270, 100)}
      {renderDepartmentGrid('Col11', 1400, 100)}

      {/* Headers for columns removed */}

      {/* Right Side (院本部) */}
      
      <div className="absolute left-[1560px] top-[0px] flex flex-col gap-0.5">
        <div className="flex gap-0.5">
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('809', '陳昱勳', '公共關係室')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('832', '劉子榮', '公共關係室')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('807', '林怡君', '公共關係室')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('E-PR-1', '待補入', '公共關係室')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        </div>
        <div className="flex gap-0.5">
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('810', '鄭伊庭', '公共關係室')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('805', '李嘉欣', '公共關係室')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('803', '楊子鋒', '公共關係室')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('E-PR-2', '待補入', '公共關係室')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        </div>
      </div>

      <div className="absolute left-[1790px] top-[0px] w-[172px] h-[96px]">
        <SeatCard departments={departments} seat={getSeat('104會議室', '104會議室', '公共區域')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
      </div>

      <div className="absolute left-[1970px] top-[0px] w-[112px] h-[96px]">
        <SeatCard departments={departments} seat={getSeat('101', '王敏惠', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
      </div>

      <div className="absolute left-[2090px] top-[0px] w-[112px] h-[96px]">
        <SeatCard departments={departments} seat={getSeat('100', '王時思', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
      </div>

      {/* Middle Grid */}
      <div className="absolute left-[1850px] top-[120px] flex flex-col gap-0.5">
        <div className="flex gap-0.5">
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('E-HQ-6', '待補入', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('E-HQ-7', '待補入', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        </div>
        <div className="flex gap-0.5">
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('112', '林昀', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('109', '董昱汝', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        </div>
        <div className="flex gap-0.5">
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('111', '楊斯淳', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('E-HQ-8', '待補入', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        </div>
      </div>

      {/* Right Grid */}
      <div className="absolute left-[2090px] top-[120px] flex flex-col gap-0.5">
        <div className="flex gap-0.5">
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('E-HQ-1', '待補入', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('E-HQ-2', '待補入', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        </div>
        <div className="flex gap-0.5">
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('E-HQ-3', '待補入', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('108', '張聖玉', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        </div>
        <div className="flex gap-0.5">
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('E-HQ-4', '待補入', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('E-HQ-5', '待補入', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        </div>
      </div>

      <div className="absolute left-[1850px] top-[280px] w-[112px] h-[96px]">
        <SeatCard departments={departments} seat={getSeat('101會議室', '101會議室', '公共區域')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
      </div>

      <div className="absolute left-[1966px] top-[280px] w-[56px] h-[96px] bg-white border border-black flex items-center justify-center text-[12px] font-bold">
        機房
      </div>

      <div className="absolute left-[2090px] top-[280px] w-[112px] h-[96px]">
        <SeatCard departments={departments} seat={getSeat('102', '楊中天', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
      </div>

      <div className="absolute left-[1850px] top-[386px] w-[112px] h-[96px]">
        <SeatCard departments={departments} seat={getSeat('102會議室', '102會議室', '公共區域')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
      </div>

      <div className="absolute left-[2090px] top-[386px] w-[112px] h-[96px]">
        <SeatCard departments={departments} seat={getSeat('103', '胡婷俐', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
      </div>

      <div className="absolute left-[1906px] top-[492px] w-[56px] h-[48px] bg-white border border-black flex items-center justify-center text-[10px] font-bold">
        庫房
      </div>

      <div className="absolute left-[2090px] top-[492px] w-[112px] h-[96px]">
        <SeatCard departments={departments} seat={getSeat('103會議室', '103會議室', '公共區域')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
      </div>
      
      <div className="absolute left-[1972px] top-[598px] flex flex-col gap-0.5">
        <div className="flex gap-0.5">
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('E-HQ-9', '待補入', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('E-HQ-10', '待補入', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('E-HQ-11', '待補入', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('E-HQ-12', '待補入', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        </div>
        <div className="flex gap-0.5">
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('E-HQ-13', '待補入', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('E-HQ-14', '待補入', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('E-HQ-15', '待補入', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
          <div className="w-[56px] h-[48px]"><SeatCard departments={departments} seat={getSeat('E-HQ-16', '待補入', '')} isHardwareUnlocked={isHardwareUnlocked} isEngineeringMode={isEngineeringMode} onUpdate={onUpdateSeat} onEditClick={onEditClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} /></div>
        </div>
      </div>
    </>
  );
}
