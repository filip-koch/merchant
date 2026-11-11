/**
 * Low-level transactional IndexedDB adapter with PWA durable persistence support.
 * Engineered for high-speed asynchronous I/O and resilient persistence on iOS and Android.
 */

const DB_NAME = 'merchant_db_v2'
const DB_VERSION = 1
const STORE_NAME = 'entities'

let dbInstance = null
let dbOpenPromise = null

/**
 * Opens or retrieves the shared IndexedDB connection.
 * @returns {Promise<IDBDatabase>}
 */
export function getDbConnection() {
  if (dbInstance) {
    return Promise.resolve(dbInstance)
  }

  if (dbOpenPromise) {
    return dbOpenPromise
  }

  dbOpenPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB není na tomto zařízení podporováno.'))
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => {
      dbInstance = request.result
      dbInstance.onversionchange = () => {
        dbInstance.close()
        dbInstance = null
      }
      resolve(dbInstance)
    }

    request.onerror = () => {
      dbOpenPromise = null
      reject(
        request.error || new Error('Nepodařilo se otevřít IndexedDB databázi.')
      )
    }

    request.onblocked = () => {
      console.warn(
        'Otevření IndexedDB databáze bylo zablokováno jinou záložkou.'
      )
    }
  })

  return dbOpenPromise
}

/**
 * Retrieves a record by key.
 * @template T
 * @param {string} key
 * @returns {Promise<T|null>}
 */
export async function idbGet(key) {
  try {
    const db = await getDbConnection()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(key)

      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn(`[IDB] get('${key}') selhalo, čtu z localStorage:`, error)
    const fallback = localStorage.getItem(`idb_fallback_${key}`)
    return fallback ? JSON.parse(fallback) : null
  }
}

/**
 * Saves or updates a record by key.
 * @template T
 * @param {string} key
 * @param {T} value
 * @returns {Promise<void>}
 */
export async function idbSet(key, value) {
  try {
    const db = await getDbConnection()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.put({ key, value, updatedAt: Date.now() })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      tx.onabort = () =>
        reject(tx.error || new Error('Transakce byla přerušena.'))
    })
  } catch (error) {
    console.warn(`[IDB] set('${key}') selhalo, ukládám do fallbacku:`, error)
    try {
      localStorage.setItem(`idb_fallback_${key}`, JSON.stringify(value))
    } catch {
      // Storage quota exceeded or disabled
    }
  }
}

/**
 * Deletes a record by key.
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function idbDelete(key) {
  try {
    const db = await getDbConnection()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn(`[IDB] delete('${key}') selhalo:`, error)
    localStorage.removeItem(`idb_fallback_${key}`)
  }
}

/**
 * Clears all records from the entities store.
 * @returns {Promise<void>}
 */
export async function idbClear() {
  try {
    const db = await getDbConnection()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('[IDB] clear() selhalo:', error)
  } finally {
    // Also clean up any fallback keys in localStorage
    Object.keys(localStorage)
      .filter((k) => k.startsWith('idb_fallback_'))
      .forEach((k) => localStorage.removeItem(k))
  }
}

/**
 * Requests durable PWA persistence from the browser StorageManager.
 * Prevents iOS Safari and Android from evicting app data under disk pressure.
 * @returns {Promise<boolean>} True if persistent storage was granted
 */
export async function requestStoragePersistence() {
  if (
    typeof navigator !== 'undefined' &&
    navigator.storage &&
    navigator.storage.persist
  ) {
    try {
      const isPersisted = await navigator.storage.persist()
      return isPersisted
    } catch (e) {
      console.warn('Nepodařilo se vyžádat trvalé úložiště:', e)
      return false
    }
  }
  return false
}

/**
 * Checks current storage durability and quota.
 * @returns {Promise<{ isPersisted: boolean, quota?: number, usage?: number }>}
 */
export async function checkStorageStatus() {
  const result = { isPersisted: false, quota: 0, usage: 0 }
  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      if (navigator.storage.persisted) {
        result.isPersisted = await navigator.storage.persisted()
      }
      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate()
        result.quota = estimate.quota || 0
        result.usage = estimate.usage || 0
      }
    } catch (e) {
      console.warn('Chyba při zjišťování stavu úložiště:', e)
    }
  }
  return result
}
