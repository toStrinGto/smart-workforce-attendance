/**
 * main.tsx
 * 应用程序的入口文件。
 * 负责将 React 根组件 (App) 挂载到 HTML 的 DOM 节点上，并引入全局样式 (index.css)。
 */
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
