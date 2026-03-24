import { collection, doc, getDocs, onSnapshot, setDoc, updateDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Seat, DepartmentConfig } from '../types';

// Seats
export const getSeats = async (): Promise<Seat[]> => {
  const snapshot = await getDocs(collection(db, 'seats'));
  return snapshot.docs.map(doc => doc.data() as Seat);
};

export const subscribeToSeats = (callback: (seats: Seat[]) => void) => {
  return onSnapshot(collection(db, 'seats'), (snapshot) => {
    const seats = snapshot.docs.map(doc => doc.data() as Seat);
    callback(seats);
  });
};

export const updateSeat = async (seat: Seat) => {
  const seatRef = doc(db, 'seats', seat.Seat_ID);
  await setDoc(seatRef, seat, { merge: true });
};

export const updateSeatsBulk = async (oldDept: string, oldSect: string, newDept: string, newSect: string) => {
  const q = query(collection(db, 'seats'), where('Department', '==', oldDept), where('Section', '==', oldSect));
  const snapshot = await getDocs(q);
  
  const batch = writeBatch(db);
  snapshot.docs.forEach((document) => {
    batch.update(document.ref, { Department: newDept, Section: newSect });
  });
  
  await batch.commit();
};

export const swapSeats = async (seatA: Seat, seatB: Seat) => {
  const batch = writeBatch(db);
  
  const refA = doc(db, 'seats', seatA.Seat_ID);
  const refB = doc(db, 'seats', seatB.Seat_ID);
  
  batch.update(refA, {
    Staff_Name: seatA.Staff_Name,
    Title: seatA.Title,
    Extension: seatA.Extension,
    Department: seatA.Department,
    Section: seatA.Section
  });
  
  batch.update(refB, {
    Staff_Name: seatB.Staff_Name,
    Title: seatB.Title,
    Extension: seatB.Extension,
    Department: seatB.Department,
    Section: seatB.Section
  });
  
  await batch.commit();
};

// Departments
export const getDepartments = async (): Promise<DepartmentConfig[]> => {
  const snapshot = await getDocs(collection(db, 'departments'));
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any as DepartmentConfig));
};

export const subscribeToDepartments = (callback: (deps: DepartmentConfig[]) => void) => {
  return onSnapshot(collection(db, 'departments'), (snapshot) => {
    const deps = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any as DepartmentConfig));
    callback(deps);
  });
};

export const addDepartment = async (dep: Omit<DepartmentConfig, 'id'>) => {
  const newRef = doc(collection(db, 'departments'));
  await setDoc(newRef, { ...dep, id: newRef.id });
  return { ...dep, id: newRef.id };
};

export const updateDepartment = async (id: string, dep: Partial<DepartmentConfig>) => {
  const ref = doc(db, 'departments', id);
  await updateDoc(ref, dep);
};

export const deleteDepartment = async (id: string) => {
  const ref = doc(db, 'departments', id);
  await deleteDoc(ref);
};

// Phone Directory Layout
export const getPhoneDirectoryLayout = async () => {
  const snapshot = await getDocs(collection(db, 'phone_directory_layout'));
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
};

export const subscribeToPhoneDirectoryLayout = (callback: (layout: any[]) => void) => {
  return onSnapshot(collection(db, 'phone_directory_layout'), (snapshot) => {
    const layout = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    callback(layout);
  });
};

export const updatePhoneDirectoryLayout = async (layoutData: any[]) => {
  const batch = writeBatch(db);
  
  // Clear existing layout
  const snapshot = await getDocs(collection(db, 'phone_directory_layout'));
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  // Add new layout
  layoutData.forEach(item => {
    const newRef = doc(collection(db, 'phone_directory_layout'));
    batch.set(newRef, { ...item, id: newRef.id });
  });
  
  await batch.commit();
};
