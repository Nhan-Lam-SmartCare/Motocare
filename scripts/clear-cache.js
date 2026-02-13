// ========================================
// CLEAR ALL CACHE - Chạy trong Browser Console
// ========================================

// Bước 1: Clear localStorage và sessionStorage
localStorage.clear();
sessionStorage.clear();

// Bước 2: Clear tất cả IndexedDB (TanStack Query cache)
if (window.indexedDB) {
  indexedDB.databases().then((databases) => {
    databases.forEach((db) => {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
        console.log(`🗑️ Deleted IndexedDB: ${db.name}`);
      }
    });
  });
}

// Bước 3: Clear Service Worker cache nếu có
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
      console.log('🗑️ Unregistered Service Worker');
    });
  });
}

// Bước 4: Clear browser cache và reload
if ('caches' in window) {
  caches.keys().then((names) => {
    names.forEach((name) => {
      caches.delete(name);
    });
    console.log('🗑️ Cleared all caches');
  });
}

console.log('✅ All cache cleared! Reloading...');

// Bước 5: Hard reload
setTimeout(() => {
  window.location.reload(true);
}, 500);
