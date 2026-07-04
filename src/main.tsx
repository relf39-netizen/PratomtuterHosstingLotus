import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// 🟢 ประกาศ process.env ให้พร้อมสำหรับ Browser Environment
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

// โหลด API Key จาก LocalStorage เข้าสู่ process.env ทันทีที่หน้าเว็บทำงาน
const savedKey = localStorage.getItem('MST_CUSTOM_GEMINI_KEY');
if (savedKey) {
  (window as any).process.env.API_KEY = savedKey;
}

const rootElement = document.getElementById('root');
if (rootElement) {
  // Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('SW registration failed:', err);
      });
    });
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}