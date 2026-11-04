import './globals.css'

export const metadata = { title: 'Aslan Fast Food · Pedidos', description: 'El sabor que ruge' }

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800;900&family=Yellowtail&family=Oswald:wght@500;700&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  )
}
