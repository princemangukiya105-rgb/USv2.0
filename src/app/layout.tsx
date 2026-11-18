import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UrjaSetu | National Electricity Consumer Services & Grievance Redressal Portal",
  description:
    "Official electricity consumer grievance redressal, outage reporting, and service tracking portal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
