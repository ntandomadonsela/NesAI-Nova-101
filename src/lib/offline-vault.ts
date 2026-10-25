export type OfflineResource = {
  id: string;
  title: string;
  file_url: string;
  academic_level: string;
  faculty_or_curriculum: string;
  subject_or_module: string;
  document_type: string;
  year: number;
  file: Blob;
  saved_at: string;
};

const DATABASE_NAME = "nesai-vault-offline";
const STORE_NAME = "resources";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open offline study storage."));
  });
}

export async function listOfflineResources(): Promise<OfflineResource[]> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as OfflineResource[]);
      request.onerror = () =>
        reject(request.error ?? new Error("Could not read saved study files."));
    });
  } finally {
    database.close();
  }
}

export async function saveOfflineResource(
  resource: Omit<OfflineResource, "file" | "saved_at">,
  file: Blob,
): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction
        .objectStore(STORE_NAME)
        .put({ ...resource, file, saved_at: new Date().toISOString() });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Could not save this file for offline study."));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Offline save was cancelled."));
    });
  } finally {
    database.close();
  }
}

export async function removeOfflineResource(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Could not remove the saved file."));
    });
  } finally {
    database.close();
  }
}
