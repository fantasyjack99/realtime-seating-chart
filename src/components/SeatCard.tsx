import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Seat } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SeatCardProps {
  seat: Seat;
  isHardwareUnlocked: boolean;
  isEngineeringMode: boolean;
  onUpdate: (seat: Seat) => void;
  onEditClick?: (seat: Seat, type: 'hardware' | 'engineering') => void;
}

const deptColors: Record<string, string> = {
  '協力工作區': 'bg-[#e6f0ff]',
  '行政管理處': 'bg-[#fce6ff]',
  '文化金融處': 'bg-[#f0e6ff]',
  '法務室': 'bg-[#d9b3ff]',
  'ESG影響力中心': 'bg-[#b3ffb3]',
  '策略研究處': 'bg-[#cce6ff]',
  '全球市場處': 'bg-[#e6ffcc]',
  '公共關係室': 'bg-[#fff2cc]',
  '院本部': 'bg-[#e6e6e6]',
  '財務室': 'bg-[#ffe6cc]',
  '內容策進處': 'bg-[#cce0ff]',
  '南部營運中心': 'bg-[#ffccb3]',
};

export function SeatCard({ seat, isHardwareUnlocked, isEngineeringMode, onUpdate, onEditClick }: SeatCardProps) {
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
    id: seat.Seat_ID,
    data: seat,
    disabled: seat.Is_Static === 1 || !isHardwareUnlocked,
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: seat.Seat_ID,
    data: seat,
    disabled: seat.Is_Static === 1,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const setRef = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  if (seat.Is_Static === 1) {
    return (
      <div className="w-full h-full bg-gray-200 border border-black flex flex-col items-center justify-center text-center p-0.5">
        <div className="text-[8px] text-black">{seat.Staff_Name}</div>
        <div className="text-[8px] text-black">{seat.Extension}</div>
      </div>
    );
  }

  const isEmpty = !seat.Staff_Name || seat.Staff_Name === '待補入' || seat.Staff_Name === '空位';
  const bgColor = isEmpty ? 'bg-white' : (deptColors[seat.Department] || 'bg-white');

  return (
    <div
      ref={setRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative w-full h-full border border-black flex flex-col items-center justify-center p-0.5",
        (isHardwareUnlocked || isEngineeringMode) ? "cursor-pointer" : "cursor-default",
        isHardwareUnlocked && "cursor-grab active:cursor-grabbing",
        bgColor,
        isDragging && "opacity-50 z-50 shadow-xl border-blue-500",
        isOver && "border-2 border-blue-500",
      )}
      onClick={(e) => {
        if (isEngineeringMode) {
          onEditClick?.(seat, 'engineering');
        } else if (isHardwareUnlocked) {
          onEditClick?.(seat, 'hardware');
        }
      }}
    >
      {/* Tooltip */}
      <div className="absolute hidden group-hover:flex flex-col z-[100] bg-gray-900 text-white text-[10px] p-2 rounded shadow-lg -top-20 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
        <div>人員姓名: {seat.Staff_Name}</div>
        <div>分機號碼: {seat.Extension || '無'}</div>
        <div>Port號碼: {seat.Port_ID || '無'}</div>
        <div>線號: {seat.Network_Jack || '無'}</div>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
      </div>

      <div className="font-bold text-[13px] text-black mt-1 truncate w-full text-center">
        {isEmpty ? '空位' : seat.Staff_Name}
      </div>

      <div className="text-[12px] text-black mt-0.5 px-0.5 rounded">
        {seat.Extension}
      </div>
    </div>
  );
}
