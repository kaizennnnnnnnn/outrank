import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  DocumentData,
  QueryConstraint,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from './firebase';

// Typed document getter
export async function getDocument<T>(path: string, id: string): Promise<T | null> {
  const docRef = doc(db, path, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as T;
}

// Typed collection getter with query constraints
export async function getCollection<T>(
  path: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  const q = query(collection(db, path), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

// Create document with auto-ID
export async function createDocument(path: string, data: DocumentData): Promise<string> {
  const ref = await addDoc(collection(db, path), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

// Create document with specific ID
export async function setDocument(
  path: string,
  id: string,
  data: DocumentData,
  merge = false
): Promise<void> {
  await setDoc(doc(db, path, id), data, { merge });
}

// Update document fields
export async function updateDocument(
  path: string,
  id: string,
  data: Partial<DocumentData>
): Promise<void> {
  await updateDoc(doc(db, path, id), data);
}

// Delete document
export async function removeDocument(path: string, id: string): Promise<void> {
  await deleteDoc(doc(db, path, id));
}

// Realtime document listener
export function subscribeToDocument<T>(
  path: string,
  id: string,
  callback: (data: T | null) => void
): () => void {
  const docRef = doc(db, path, id);
  return onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback({ id: snapshot.id, ...snapshot.data() } as T);
  });
}

// Realtime collection listener
export function subscribeToCollection<T>(
  path: string,
  constraints: QueryConstraint[],
  callback: (data: T[]) => void
): () => void {
  const q = query(collection(db, path), ...constraints);
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
    callback(data);
  });
}

// Helper query builders
export { where, orderBy, limit, Timestamp, collection, doc, query };
