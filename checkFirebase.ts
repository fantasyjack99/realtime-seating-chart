import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function check() {
  const seatsSnapshot = await getDocs(collection(db, 'seats'));
  console.log(`Found ${seatsSnapshot.size} seats.`);
  
  if (seatsSnapshot.size < 100) {
    console.log('Deleting existing seats to re-seed...');
    for (const d of seatsSnapshot.docs) {
      await deleteDoc(doc(db, 'seats', d.id));
    }
  }
  process.exit(0);
}

check();
