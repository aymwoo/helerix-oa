import type { Metadata } from 'next';
import './globals.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

export const metadata: Metadata = {
  title: 'Helerix 教研管理平台',
  description: '专业的教研员管理与 AI 辅助分析系统',
};

import { ToastProvider } from '../components/ToastContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
      </head>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
