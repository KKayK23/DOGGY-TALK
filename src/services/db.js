/*
 * 音訊二進位儲存（IndexedDB "doggy-talk-media" 的 "media" store）。
 * 只存 Blob；中繼資料走 records.js（localStorage）。
 */
export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("doggy-talk-media", 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("media")) database.createObjectStore("media");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeMedia(key, blob) {
  if (!blob) return;
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("media", "readwrite");
    transaction.objectStore("media").put(blob, key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function getMedia(key) {
  const database = await openDatabase();
  const result = await new Promise((resolve, reject) => {
    const request = database.transaction("media", "readonly").objectStore("media").get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return result;
}

export async function deleteMedia(key) {
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("media", "readwrite");
    transaction.objectStore("media").delete(key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}
