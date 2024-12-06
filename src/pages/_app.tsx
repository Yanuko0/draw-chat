import "../styles/globals.css";
import type { AppProps } from "next/app";
import { LanguageProvider } from '../contexts/LanguageContext';
import { performanceMonitor } from '../config/firebase';
import { useEffect } from 'react';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // 每小時重置效能指標
    const interval = setInterval(() => {
      performanceMonitor.reset();
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <LanguageProvider>
      <Component {...pageProps} />
    </LanguageProvider>
  );
}
