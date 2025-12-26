import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export const addTransaction = async (data: any) => {
  await addDoc(collection(db, "transactions"), {
    ...data,
    createdAt: serverTimestamp(),
  });
};

export const getTransactions = async () => {
  const snapshot = await getDocs(collection(db, "transactions"));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
};
