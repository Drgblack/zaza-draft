import "./globals.css";
import "./globals.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";
import { Toaster } from 'react-hot-toast';

import "./globals.css";
export const metadata = { title: "Zaza Draft", description: "Parent Comment Helper" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{fontFamily: "system-ui, sans-serif", margin: 0, padding: 24}}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  )
}

