export const metadata = {
  title: 'AI Финансист Ustabor',
  description: 'Анализ банковских выписок с помощью AI',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, background: '#0a0a0f' }}>{children}</body>
    </html>
  );
}