// The user's saved files (Your designs), in this browser's IndexedDB: one record per file, path ->
// text. Until 2026-11 they were one localStorage entry, and its ~5 MB filled up after 8 or 9
// self-contained design files (each carries the generator, ~240 KB). Those move over on first use;
// where IndexedDB can't be opened, localStorage stays the store. Nothing leaves the browser.
const DB_NAME = "open-mouthpiece";
const FILES = "files";
const OLD_KEY = "open-mouthpiece-files-v1"; // localStorage: {"path": {"text": ...}}

type Files = Record<string, string>;

const FULL = "This browser's storage is full or blocked, so the file can't be saved here. Use Download to keep a copy.";

const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
const finished = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error);
  });

function readOld(): Files {
  try {
    const s = JSON.parse(localStorage.getItem(OLD_KEY) ?? "{}") as Record<string, { text?: unknown }>;
    return Object.fromEntries(
      Object.entries(s).flatMap(([p, f]) => (f && typeof f.text === "string" ? [[p, f.text]] : [])),
    );
  } catch {
    return {};
  }
}
function writeOld(files: Files) {
  try {
    localStorage.setItem(
      OLD_KEY,
      JSON.stringify(Object.fromEntries(Object.entries(files).map(([p, text]) => [p, { text }]))),
    );
  } catch {
    throw new Error(FULL);
  }
}

// The files saved in localStorage go over in one transaction; the old entry is removed only once
// that has committed (if it fails, they stay there and are still read, under the IndexedDB ones).
// They replace a copy of the same name: a tab still on the old app saves there after the move.
async function moveOld(db: IDBDatabase) {
  const old = readOld();
  if (!Object.keys(old).length) return;
  try {
    const tx = db.transaction(FILES, "readwrite");
    const store = tx.objectStore(FILES);
    for (const [p, text] of Object.entries(old)) store.put(text, p);
    await finished(tx);
    localStorage.removeItem(OLD_KEY);
  } catch {
    // left in localStorage
  }
}

// Opened at whatever version it has; a database without the files store (made by something else
// on this site) gets it in an upgrade to the next version.
const openAt = (version?: number) =>
  new Promise<IDBDatabase | null>((resolve) => {
    try {
      const r = indexedDB.open(DB_NAME, version);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains(FILES)) r.result.createObjectStore(FILES);
      };
      r.onsuccess = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains(FILES)) {
          db.close();
          resolve(version ? null : openAt(db.version + 1));
          return;
        }
        db.onversionchange = () => db.close();
        resolve(db);
      };
      r.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
let opened: Promise<IDBDatabase | null> | null = null;
const openDb = () =>
  (opened ??= openAt().then(async (db) => {
    if (db) await moveOld(db);
    return db;
  }));

export async function readFiles(): Promise<Files> {
  const db = await openDb();
  const files = readOld(); // empty once moved
  if (!db) return files;
  try {
    const tx = db.transaction(FILES, "readonly");
    const store = tx.objectStore(FILES);
    const [keys, texts] = await Promise.all([request(store.getAllKeys()), request(store.getAll())]);
    keys.forEach((k, i) => {
      if (typeof texts[i] === "string") files[String(k)] = texts[i];
    });
  } catch {
    // only the ones left in localStorage
  }
  return files;
}

export async function writeFile(path: string, text: string) {
  const db = await openDb();
  if (!db) return writeOld({ ...readOld(), [path]: text });
  try {
    const tx = db.transaction(FILES, "readwrite");
    tx.objectStore(FILES).put(text, path);
    await finished(tx);
  } catch {
    throw new Error(FULL);
  }
}

export async function deleteFile(path: string) {
  const db = await openDb();
  const old = readOld();
  if (path in old) {
    delete old[path];
    writeOld(old);
  }
  if (!db) return;
  const tx = db.transaction(FILES, "readwrite");
  tx.objectStore(FILES).delete(path);
  await finished(tx);
}
