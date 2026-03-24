import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function seed() {
  const dbPath = path.join(process.cwd(), 'data', 'seats.db');
  if (!fs.existsSync(dbPath)) {
    console.log('SQLite database not found. Skipping seed.');
    return;
  }

  const sqliteDb = new Database(dbPath);
  
  try {
    const seatsSnapshot = await getDocs(collection(db, 'seats'));
    if (seatsSnapshot.empty) {
      console.log('Seeding seats to Firebase...');
      const seats = sqliteDb.prepare('SELECT * FROM seats').all();
      for (const seat of seats as any[]) {
        await setDoc(doc(db, 'seats', seat.Seat_ID), seat);
      }
      console.log(`Seeded ${seats.length} seats.`);
    } else {
      console.log('Seats already exist in Firebase. Skipping.');
    }

    const depsSnapshot = await getDocs(collection(db, 'departments'));
    if (depsSnapshot.empty) {
      console.log('Seeding departments to Firebase...');
      const deps = sqliteDb.prepare('SELECT * FROM departments').all();
      for (const dep of deps as any[]) {
        await setDoc(doc(collection(db, 'departments')), {
          department: dep.department,
          section: dep.section,
          color: dep.color
        });
      }
      console.log(`Seeded ${deps.length} departments.`);
    } else {
      console.log('Departments already exist in Firebase. Skipping.');
    }

    const layoutSnapshot = await getDocs(collection(db, 'phone_directory_layout'));
    if (layoutSnapshot.empty) {
      console.log('Seeding phone directory layout to Firebase...');
      const layout = sqliteDb.prepare('SELECT * FROM phone_directory_layout').all();
      for (const item of layout as any[]) {
        await setDoc(doc(collection(db, 'phone_directory_layout')), {
          column_index: item.column_index,
          department: item.department,
          sort_order: item.sort_order
        });
      }
      console.log(`Seeded ${layout.length} layout items.`);
    } else {
      console.log('Phone directory layout already exists in Firebase. Skipping.');
    }
    
    console.log('Seeding complete.');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    sqliteDb.close();
    process.exit(0);
  }
}

seed();
