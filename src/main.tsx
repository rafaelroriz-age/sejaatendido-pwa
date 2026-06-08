import React from 'react';
import ReactDOM from 'react-dom/client';
import { initMercadoPago } from '@mercadopago/sdk-react';
import App from './App';
import './styles/global.css';

const mpPublicKey = import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined;
if (mpPublicKey && mpPublicKey !== 'YOUR_MP_PUBLIC_KEY_HERE') {
  initMercadoPago(mpPublicKey, { locale: 'pt-BR' });
}

if (import.meta.env.PROD && import.meta.env.VITE_MOCK === 'true') {
  throw new Error('VITE_MOCK=true não é permitido em produção.');
}

async function prepare() {
  if (import.meta.env.VITE_MOCK === 'true') {
    const { worker } = await import('./mocks/browser');
    return worker.start({
      onUnhandledRequest: 'bypass', // deixa passar requisições não mapeadas (ex: assets)
    });
  }
}

prepare().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
