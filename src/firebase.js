// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ⚠️ ใช้ config ชุดเดิมของคุณ แทนที่ตรงนี้ได้เลย
const firebaseConfig = {
  apiKey: "AIzaSyBzLZrBbtnUZABLEFgTh6SMcHcvZD4yrFM",
  authDomain: "avafarm-crm.firebaseapp.com",
  projectId: "avafarm-crm",
  storageBucket: "avafarm-crm.firebasestorage.app",
  messagingSenderId: "459409301906",
  appId: "1:459409301906:web:c44d18a5a539ebb911a14b",
  measurementId: "G-E4T5ZBCKBN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);