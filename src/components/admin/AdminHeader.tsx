import React from 'react';

interface AdminHeaderProps {
  adminInfo: {
    name: string;
    image?: string;
  };
}

/**
 * AdminHeader displays the admin's avatar and name in a premium styled header.
 */
export default function AdminHeader({ adminInfo }: AdminHeaderProps) {
  const { name, image } = adminInfo;
  return (
    <div className="flex items-center gap-4 mb-6 p-4 bg-white bg-opacity-80 backdrop-blur-md rounded-xl shadow-lg">
      <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-primary to-secondary">
        <img
          src={image ?? '/default-avatar.png'}
          alt="Admin avatar"
          className="w-full h-full object-cover"
        />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-800">স্বাগতম, {name}</h2>
        <p className="text-sm text-gray-500">অ্যাডমিন ড্যাশবোর্ডে স্বাগতম</p>
      </div>
    </div>
  );
}
