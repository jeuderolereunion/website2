import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
 
const firebaseConfig = {
  apiKey: "AIzaSyAhSznkVo1QDuSQ3csMGQN57EdwGUPHzeM",
  authDomain: "jdr-reunion-e5a17.firebaseapp.com",
  projectId: "jdr-reunion-e5a17",
  storageBucket: "jdr-reunion-e5a17.firebasestorage.app",
  messagingSenderId: "1026446311409",
  appId: "1:1026446311409:web:5df23d58b16bc4ce16ce50",
  measurementId: "G-1TLYEBHDGD",
};
 
const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);