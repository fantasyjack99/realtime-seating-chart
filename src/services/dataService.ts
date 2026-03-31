import { io } from 'socket.io-client';
import { Seat, DepartmentConfig, TitleConfig } from '../types';

const socket = io();

// State caches to immediately return data if requested before socket syncs
let currentSeats: Seat[] = [];
let currentDepartments: DepartmentConfig[] = [];
let currentLayout: any[] = [];
let currentTitleConfigs: TitleConfig[] = [];

socket.on('sync_seats', (seats: Seat[]) => { currentSeats = seats; });
socket.on('sync_departments', (deps: DepartmentConfig[]) => { currentDepartments = deps; });
socket.on('sync_layout', (layout: any[]) => { currentLayout = layout; });
socket.on('sync_title_configs', (configs: TitleConfig[]) => { currentTitleConfigs = configs; });

// Seats
export const getSeats = async (): Promise<Seat[]> => {
  return currentSeats;
};

export const subscribeToSeats = (callback: (seats: Seat[]) => void) => {
  socket.on('sync_seats', callback);
  if (currentSeats.length > 0) callback(currentSeats);
  return () => socket.off('sync_seats', callback);
};

export const updateSeat = async (seat: Seat) => {
  socket.emit('update_seat', seat);
};

export const updateSeatsBulk = async (oldDept: string, oldSect: string, newDept: string, newSect: string) => {
  socket.emit('update_seats_bulk', { oldDept, oldSect, newDept, newSect });
};

export const swapSeats = async (seatA: Seat, seatB: Seat) => {
  socket.emit('swap_seats', { seatA, seatB });
};

// Departments
export const getDepartments = async (): Promise<DepartmentConfig[]> => {
  return currentDepartments;
};

export const subscribeToDepartments = (callback: (deps: DepartmentConfig[]) => void) => {
  socket.on('sync_departments', callback);
  if (currentDepartments.length > 0) callback(currentDepartments);
  return () => socket.off('sync_departments', callback);
};

export const addDepartment = async (dep: Omit<DepartmentConfig, 'id'>) => {
  return new Promise((resolve) => {
    socket.emit('add_department', dep, (response: any) => {
      resolve(response);
    });
  });
};

export const updateDepartment = async (id: string, dep: Partial<DepartmentConfig>) => {
  socket.emit('update_department', { id, dep });
};

export const deleteDepartment = async (id: string) => {
  socket.emit('delete_department', id);
};

// Phone Directory Layout
export const getPhoneDirectoryLayout = async () => {
  return currentLayout;
};

export const subscribeToPhoneDirectoryLayout = (callback: (layout: any[]) => void) => {
  socket.on('sync_layout', callback);
  if (currentLayout.length > 0) callback(currentLayout);
  return () => socket.off('sync_layout', callback);
};

export const updatePhoneDirectoryLayout = async (layoutData: any[]) => {
  socket.emit('update_layout', layoutData);
};

// Title Configs
export const subscribeToTitleConfigs = (callback: (configs: TitleConfig[]) => void) => {
  socket.on('sync_title_configs', callback);
  if (currentTitleConfigs.length > 0) callback(currentTitleConfigs);
  return () => socket.off('sync_title_configs', callback);
};

export const updateTitleConfig = async (config: TitleConfig) => {
  socket.emit('update_title_config', config);
};
