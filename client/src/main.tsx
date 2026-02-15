import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ChatWidget from './components/ChatWidget.tsx'

const chatRoot = document.getElementById('chat-root');
if (chatRoot) {
  createRoot(chatRoot).render(
    <StrictMode>
      <ChatWidget />
    </StrictMode>,
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
