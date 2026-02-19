import { initializeApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

// Replace these values with your actual Firebase project configuration
// from the Firebase Console -> Project Settings -> General -> Your Apps

// Safely access import.meta.env to avoid errors if it's undefined
// We cast to any to avoid TypeScript errors, and default to empty object if undefined
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

let db: Firestore | null = null;
let auth: Auth | null = null;

// Initialize Firebase only if config is present
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        console.log("Firebase initialized successfully");
    } catch (error) {
        console.error("Error initializing Firebase:", error);
    }
} else {
    console.warn("Firebase config missing. Running in LocalStorage mode.");
}

export { db, auth };
