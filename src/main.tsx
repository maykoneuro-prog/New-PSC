import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './firebase';

async function testConnection() {
  try {
    const config = await import('../firebase-applet-config.json');
    // Silent test for boot
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Fail silently on boot to avoid confusing debug logs for the user
  }
}
testConnection();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
