
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { Wallet, Transaction, Category, User } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyD_y9O33AW8WrBycjYe-XJOvsMRUAT5--k",
  authDomain: "aplikasi-dompet.firebaseapp.com",
  projectId: "aplikasi-dompet",
  storageBucket: "aplikasi-dompet.firebasestorage.app",
  messagingSenderId: "549945275040",
  appId: "1:549945275040:web:086d5e70ad7c6d0b514fc5",
  measurementId: "G-RMQ5LHZL63"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Data Listeners
export const listenToData = (username: string, collectionName: string, callback: (data: any[]) => void) => {
  const q = query(collection(db, collectionName), where("owner", "==", username));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(items);
  });
};

// User Auth Mockup with Firestore
export const authenticateUser = async (username: string, pass: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(db, "users", username));
  if (userDoc.exists()) {
    const data = userDoc.data() as User;
    if (data.password === pass) return data;
  }
  return null;
};

// Persistence Helpers
export const saveData = async (username: string, collectionName: string, data: any) => {
  if (data.id) {
    const { id, ...rest } = data;
    await updateDoc(doc(db, collectionName, id), { ...rest, owner: username });
  } else {
    await addDoc(collection(db, collectionName), { ...data, owner: username });
  }
};

export const updateWalletBalance = async (walletId: string, newBalance: number) => {
  await updateDoc(doc(db, "wallets", walletId), { balance: newBalance });
};
