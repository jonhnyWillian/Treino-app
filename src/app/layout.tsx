import "@/app/globals.css";
import NavWrapper from "@/components/navWrapper";
import { Toaster } from "react-hot-toast";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AuthGuard from "@/components/authGuard";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  return (
    <html lang="pt-BR">
      <body
        className="
          bg-slate-950
          text-white 
          min-h-screen 
          antialiased
        "
      >
        <GoogleOAuthProvider clientId={googleClientId}>
          <Toaster 
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#fff',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '14px',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          {/* Conteúdo principal com container App-first */}
          <div className="app-wrapper bg-gradient-to-b from-[#0b1220] via-[#070c16] to-[#050812] relative overflow-x-hidden min-h-screen">
            <AuthGuard>
              <NavWrapper>
                {children}
              </NavWrapper>
            </AuthGuard>
          </div>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}