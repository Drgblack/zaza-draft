export const metadata = { title: "Zaza Draft", description: "Parent Comment Helper" }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{fontFamily: "system-ui, sans-serif", margin: 0, padding: 24}}>
        {children}
      </body>
    </html>
  )
}
