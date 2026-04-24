import { db } from './firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import cutoffsData from '../data/cutoffs.json';

export async function seedCutoffs() {
  const batch = writeBatch(db);
  const cutoffsCollection = collection(db, 'cutoffs');

  for (const cutoff of cutoffsData) {
    const cutoffDoc = doc(cutoffsCollection, cutoff.id);
    batch.set(cutoffDoc, {
      ...cutoff,
      exam: cutoff.course === 'MBBS' ? 'NEET' : 'JEE',
      year: 2023
    });
  }

  await batch.commit();
  console.log('Cutoffs seeded successfully');
}
