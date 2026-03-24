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
}

export interface DepartmentConfig {
  id: string;
  department: string;
  section: string;
  color: string;
}
