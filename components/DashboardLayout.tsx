import React, { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="h-screen w-full bg-white bg-cover bg-center" style={{ backgroundImage: "url('/bg.png')" }}>
      <div className="w-full max-w-md h-screen bg-white flex flex-col rounded-none md:rounded-xl overflow-hidden relative">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;
