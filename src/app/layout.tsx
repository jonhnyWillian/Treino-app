import "@/app/globals.css";
import NavWrapper from "@/components/navWrapper";
import { ThemeProvider } from "@/components/themeProvider";
import { Toaster } from "react-hot-toast";
// 🔴 GOOGLE TEMPORARIAMENTE DESABILITADO - descomentar quando configurar NEXT_PUBLIC_GOOGLE_CLIENT_ID
// import { GoogleOAuthProvider } from "@react-oauth/google";
import AuthGuard from "@/components/authGuard";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 🔴 GOOGLE TEMPORARIAMENTE DESABILITADO
  // const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  const toasterConfig = (
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
  );

  const appContent = (
    <div className="app-wrapper relative min-h-screen overflow-x-hidden">
      <AuthGuard>
        <NavWrapper>
          {children}
        </NavWrapper>
      </AuthGuard>
    </div>
  );

  return (
    <html lang="pt-BR" data-theme="dark">
      <body className="min-h-screen antialiased">
        {/* 🔴 GOOGLE TEMPORARIAMENTE DESABILITADO
        <GoogleOAuthProvider clientId={googleClientId}>
          {toasterConfig}
          {appContent}
        </GoogleOAuthProvider>
        */}

        {/* ✅ SEM GOOGLE - remover este bloco ao reativar o Google */}
        <ThemeProvider>
          {toasterConfig}
          {appContent}
        </ThemeProvider>
        {/* fim do bloco sem Google */}

      </body>
    </html>
  );
}
