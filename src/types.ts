export interface Seat {
  Seat_ID: string;
  Staff_Name: string;
  Title?: string;
  Extension: string;
  Port_ID: string;
  Network_Jack: string;
  Department: string;
  Section?: string;
  Is_Static: number;
  hasPendingChange?: boolean;
  pendingNewSeat?: Seat;
  isActing?: boolean;
  isDefaultDept?: boolean;
}

export interface DepartmentConfig {
  id: string;
  department: string;
  section: string;
  color: string;
}

export interface TitleConfig {
  id: string;
  title: string;
  weight: number;
  showTitle: boolean;
}
