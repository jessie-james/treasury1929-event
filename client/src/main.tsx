import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// DEVELOPMENT-ONLY: Auto-reload on file changes via SSE
if (import.meta.env.DEV) {
  const eventSource = new EventSource('/__dev/reload');
  eventSource.onmessage = (event) => {
    if (event.type === 'reload') {
      console.log('🔄 File changes detected, reloading page...');
      window.location.reload();
    }
  };
  eventSource.addEventListener('connected', () => {
    console.log('✅ SSE auto-reload connected');
  });
  eventSource.onerror = (error) => {
    console.log('❌ SSE auto-reload connection error:', error);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
