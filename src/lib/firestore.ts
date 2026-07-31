import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseApp } from './firebase';

/* Split out of ./firebase.ts on purpose: sign-in is mandatory for every visitor, but cloud sync
   is opt-in and most never use it. Keeping Firestore behind its own module means the auth path
   doesn't drag the Firestore SDK into the chunk everyone downloads. */
export function firestore(): Firestore {
  return getFirestore(firebaseApp());
}
