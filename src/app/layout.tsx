import "@/app/globals.css";
import { ThemeProvider } from "@/components/ui/themeProvider";
import { Toaster } from "react-hot-toast";
import ConditionalLayout from "@/components/conditionalLayout";
import { AuthProvider } from "@/contexts/AuthContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark" className="h-full">
      <body
        className="h-full overflow-hidden antialiased bg-[#0f172a] text-sm"
        style={{ WebkitFontSmoothing: "antialiased" }}
      >
        <ThemeProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#1e293b",
                color: "#fff",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: "13px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              },
              success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
            }}
          />
          <AuthProvider>
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}