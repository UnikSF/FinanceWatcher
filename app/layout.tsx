import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "FinanceWatcher",
  description: "Personal expense tracking, budgets and AI propositions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <Sidebar />
          {/* pt-16 clears the fixed mobile top bar; desktop gets the sidebar margin */}
          <main className="px-4 py-6 pt-16 md:ml-60 md:px-8 md:py-8 md:pt-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
