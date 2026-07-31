import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { firebaseApp } from './firebase';

/* Split out of ./firebase.ts on purpose: sign-in is mandatory for every visitor, but cloud sync
   is opt-in and most never use it. Keeping Firestore behind its own module means the auth path
   doesn't drag the Firestore SDK into the chunk everyone downloads. */
let instance: Firestore | undefined;

export function firestore(): Firestore {
  /* Persistent cache so a preference changed in a tunnel is queued and flushed on reconnect
     rather than dropped. initializeFirestore throws if called twice, hence the singleton. */
  if (!instance) {
    instance = initializeFirestore(firebaseApp(), {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  }
  return instance;
}
