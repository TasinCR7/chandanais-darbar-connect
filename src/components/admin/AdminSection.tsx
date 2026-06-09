import React from 'react';

interface AdminSectionProps {
  title: string;
  children: React.ReactNode;
}

/**
 * AdminSection provides a consistent padded, glass‑morphism container for each admin tab.
 */
export default function AdminSection({ title, children }: AdminSectionProps) {
  return (
    <section className="bg-white bg-opacity-80 backdrop-blur-md rounded-xl shadow-md p-6 border border-gold/20">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">{title}</h2>
      {children}
    </section>
  );
}
