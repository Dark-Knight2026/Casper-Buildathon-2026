import { Outlet } from 'react-router-dom';
import LandingHeader from '@/components/LandingHeader';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
}
