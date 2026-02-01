// Firebase configuration for Lumina app
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyChN9Mi5SMmhOdiaYvoYE75p2NvLjGMZjo",
  authDomain: "lumina-40bfb.firebaseapp.com",
  projectId: "lumina-40bfb",
  storageBucket: "lumina-40bfb.firebasestorage.app",
  messagingSenderId: "236558238455",
  appId: "1:236558238455:web:4a07e44725f3469ac589f2",
  measurementId: "G-D8430HVC09"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;
