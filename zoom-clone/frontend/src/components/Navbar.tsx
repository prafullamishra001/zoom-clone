'use client';

import { Video, Bell, Settings, User } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="bg-blue-600 rounded-xl p-2">
                <Video className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">ZoomClone</span>
            </div>
          </div>

          {/* Right side items */}
          <div className="flex items-center gap-2">
            <button className="text-gray-500 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <Bell className="h-5 w-5" />
            </button>
            <button className="text-gray-500 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <Settings className="h-5 w-5" />
            </button>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold shadow-md">
              <User className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
