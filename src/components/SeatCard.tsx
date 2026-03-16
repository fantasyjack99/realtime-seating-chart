import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Seat, DepartmentConfig } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SeatCardProps {
  seat: Seat;
  departments: DepartmentConfig[];
  isHardwareUnlocked: boolean;
  isEngineeringMode: boolean;
  onUpdate: (seat: Seat) => void;
  onEditClick?: (seat: Seat, type: 'hardware' | 'engineering') => void;
  onMouseEnter?: (seatId: string) => void;
  onMouseLeave?: () => void;
}

export function SeatCard({ seat, departments, isHardwareUnlocked, isEngineeringMode, onUpdate, onEditClick, onMouseEnter, onMouseLeave }: SeatCardProps) {
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
  
  const depConfig = departments.find(d => d.department === seat.Department && d.section === seat.Section) 
                 || departments.find(d => d.department === seat.Department);
  
  const bgColor = isEmpty ? '#ffffff' : (depConfig?.color || '#ffffff');

  return (
    <div
      ref={setRef}
      id={`seat-${seat.Seat_ID}`}
      style={{ ...style, backgroundColor: bgColor }}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative w-full h-full border border-black flex flex-col items-center justify-center p-0.5",
        (isHardwareUnlocked || isEngineeringMode) ? "cursor-pointer" : "cursor-default",
        isHardwareUnlocked && "cursor-grab active:cursor-grabbing",
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
      onMouseEnter={() => onMouseEnter?.(seat.Seat_ID)}
      onMouseLeave={() => onMouseLeave?.()}
    >
      {seat.hasPendingChange && (
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full border border-white z-10 shadow-sm animate-pulse"></div>
      )}
      {/* Tooltip */}
      <div className="absolute hidden group-hover:flex flex-col z-[100] bg-gray-900 text-white text-[10px] p-2 rounded shadow-lg bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
        {seat.hasPendingChange && seat.pendingNewSeat && (
          <div className="mb-2 pb-2 border-b border-gray-700 text-blue-400 font-bold">
            暫存變更為: {seat.pendingNewSeat.Staff_Name} ({seat.pendingNewSeat.Extension || '無'})
          </div>
        )}
        <div>人員姓名: {seat.Staff_Name}</div>
        <div>分機號碼: {seat.Extension || '無'}</div>
        <div>處室: {seat.Department || '無'}</div>
        <div>組別: {seat.Section || '無'}</div>
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
