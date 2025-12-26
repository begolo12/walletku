
import { GoogleGenAI } from "@google/genai";
import { Transaction, Wallet, Category } from "../types";

const getContextString = (transactions: Transaction[], wallets: Wallet[], categories: Category[]) => {
  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);
  const recent = transactions.slice(0, 15).map(t => {
    const cat = categories.find(c => c.id === t.categoryId)?.name;
    return `${t.date}: ${t.type} Rp${t.amount.toLocaleString()} (${cat} - ${t.note})`;
  }).join('; ');
  
  return `Total saldo pengguna: Rp${totalBalance.toLocaleString()}. Transaksi terakhir: ${recent}.`;
};

export const getFinancialAdvice = async (
  transactions: Transaction[],
  wallets: Wallet[],
  categories: Category[]
) => {
  // Inisialisasi tepat sebelum pemanggilan untuk memastikan API KEY terbaru terambil
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const context = getContextString(transactions, wallets, categories);

  const prompt = `
    Sebagai penasihat keuangan profesional, analisis data berikut: ${context}.
    Berikan 3 saran singkat dan praktis dalam Bahasa Indonesia untuk meningkatkan kesehatan finansial pengguna.
    Format: Langsung berikan 3 paragraf singkat.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Maaf, AI sedang mengalami gangguan. Pastikan API Key Anda sudah aktif dan terkonfigurasi di environment.";
  }
};

export const chatWithAI = async (
  message: string,
  history: any[],
  transactions: Transaction[],
  wallets: Wallet[],
  categories: Category[]
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const context = getContextString(transactions, wallets, categories);
  
  const systemInstruction = `Anda adalah SmartWallet AI, asisten keuangan yang cerdas. 
  Konteks finansial pengguna: ${context}. 
  Jawab pertanyaan pengguna tentang uang, tabungan, atau transaksi mereka dalam Bahasa Indonesia yang santai dan membantu. 
  Gunakan emoji agar ramah.`;

  try {
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { systemInstruction }
    });
    
    const response = await chat.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Chat Error:", error);
    return "Maaf, saya tidak bisa merespons saat ini.";
  }
};
