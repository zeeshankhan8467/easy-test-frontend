import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

