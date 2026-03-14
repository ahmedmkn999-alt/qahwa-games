// firebase.js - Firebase Realtime Database Integration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue, push, remove }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyA4kyqlEtpQ1Uw2j4IA8_Eh9gS6QijJEMk",
  authDomain: "qahwa-game-a76de.firebaseapp.com",
  databaseURL: "https://qahwa-game-a76de-default-rtdb.firebaseio.com",
  projectId: "qahwa-game-a76de",
  storageBucket: "qahwa-game-a76de.firebasestorage.app",
  messagingSenderId: "449752562946",
  appId: "1:449752562946:web:cf41c2af265710cf21d61b",
  measurementId: "G-XR0K3CCRDL"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

// Expose DB helpers globally so game.js can use them
window.DB = {

  // Create a new room
  async createRoom(roomCode, data) {
    await set(ref(db, `rooms/${roomCode}`), data);
  },

  // Get room once
  async getRoom(roomCode) {
    const snap = await get(ref(db, `rooms/${roomCode}`));
    return snap.exists() ? snap.val() : null;
  },

  // Update specific fields
  async updateRoom(roomCode, updates) {
    await update(ref(db, `rooms/${roomCode}`), updates);
  },

  // Update a player field
  async updatePlayer(roomCode, playerId, updates) {
    await update(ref(db, `rooms/${roomCode}/players/${playerId}`), updates);
  },

  // Listen to room changes (returns unsubscribe fn)
  listenRoom(roomCode, callback) {
    const roomRef = ref(db, `rooms/${roomCode}`);
    const unsub = onValue(roomRef, snap => {
      callback(snap.exists() ? snap.val() : null);
    });
    return unsub;
  },

  // Delete room
  async deleteRoom(roomCode) {
    await remove(ref(db, `rooms/${roomCode}`));
  },

  // Add player to room
  async addPlayerToRoom(roomCode, playerId, playerData) {
    await set(ref(db, `rooms/${roomCode}/players/${playerId}`), playerData);
  },

  // Remove player from room
  async removePlayer(roomCode, playerId) {
    await remove(ref(db, `rooms/${roomCode}/players/${playerId}`));
  }
};

console.log("✅ Firebase connected - qahwa-game");
