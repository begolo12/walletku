import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD_y9033AW8WBrYcjYe-XJOvsMRUAT5--k",
  authDomain: "aplikasi-dompet.firebaseapp.com",
  projectId: "aplikasi-dompet",
  storageBucket: "aplikasi-dompet.firebasestorage.app",
  messagingSenderId: "549945275040",
  appId: "1:549945275040:web:086d5e70ad7c6d0b514fc5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
