import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const extension = file.name.split('.').pop();
  const storageRef = ref(storage, `avatars/${userId}/avatar.${extension}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export async function uploadProofImage(
  userId: string,
  logId: string,
  file: File
): Promise<string> {
  const extension = file.name.split('.').pop();
  const storageRef = ref(storage, `proofs/${userId}/${logId}/proof.${extension}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export async function uploadLeagueAvatar(leagueId: string, file: File): Promise<string> {
  const extension = file.name.split('.').pop();
  const storageRef = ref(storage, `leagues/${leagueId}/avatar.${extension}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}
