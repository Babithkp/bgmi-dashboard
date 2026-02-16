'use client';

import { LayoutDashboard, Users, Trophy, Medal } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <aside className="w-16 bg-[#060911] border-r border-gray-800 flex flex-col items-center py-6">
      <div className="mb-8">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
          <Medal className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <Link
          href="/"
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isActive('/')
            ? 'bg-blue-500/10 text-blue-400'
            : 'text-gray-500 hover:bg-gray-800/50'
            }`}
        >
          <LayoutDashboard className="w-5 h-5" />
        </Link>

        <Link
          href="/teams-players"
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isActive('/teams-players')
            ? 'bg-blue-500/10 text-blue-400'
            : 'text-gray-500 hover:bg-gray-800/50'
            }`}
        >
          <Users className="w-5 h-5" />
        </Link>

        <Link
          href="/tournaments"
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isActive('/tournaments')
            ? 'bg-blue-500/10 text-blue-400'
            : 'text-gray-500 hover:bg-gray-800/50'
            }`}
        >
          <Trophy className="w-5 h-5" />
        </Link>
      </div>
    </aside>
  );
}
