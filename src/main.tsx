import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Prevent mouse wheel from inadvertently changing values in number inputs
if (typeof window !== 'undefined') {
  document.addEventListener(
    'wheel',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
        target.blur();
      }
      if (
        document.activeElement &&
        document.activeElement.tagName === 'INPUT' &&
        (document.activeElement as HTMLInputElement).type === 'number'
      ) {
        (document.activeElement as HTMLElement).blur();
      }
    },
    { passive: true }
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

