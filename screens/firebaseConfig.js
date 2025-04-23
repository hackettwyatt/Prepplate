import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore'; 


const firebaseConfig = {
  apiKey: "AIzaSyBsp41GXJchBuaPAAW_Hmr2xiQD3ptVnkE",
  authDomain: "react-native-78c36.firebaseapp.com",
  projectId: "react-native-78c36",
  storageBucket: "react-native-78c36.firebasestorage.app",
  messagingSenderId: "270716893577",
  appId: "1:270716893577:web:d82d5dff3d1dcd22bb0958",
  measurementId: "G-LXCQQGWXFY"
};

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); 
}

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

