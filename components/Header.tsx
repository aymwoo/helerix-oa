import React from 'react';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="h-20 flex items-center justify-between px-6 lg:px-8 bg-surface-light/80 backdrop-blur-md sticky top-0 z-20 border-b border-border-light">
      <div className="flex items-center gap-4">
        <button className="md:hidden text-text-muted hover:text-text-main">
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>
        {/* Page title removed per request */}
      </div>
      <div className="flex items-center gap-4">
        {/* Right side elements removed in previous steps */}
      </div>
    </header>
  );
};

export default Header;