
import React from 'react';
import type { Archetype } from '../types';

interface ArchetypeDisplayProps {
  archetype: Archetype;
}

const iconMap: Record<string, React.ReactNode> = {
  task_expeditor: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-sky-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  capability_enhancer: (
     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-lime-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  ),
  process_integrator: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-amber-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
  organizational_transformer: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-rose-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  ),
  foundational_innovator: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-fuchsia-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 12L17.437 9.154a4.5 4.5 0 00-3.09-3.09L11.5 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L18.25 12zM12.75 18.25L11.937 15.406a4.5 4.5 0 00-3.09-3.09L6 11.5l.813 2.846a4.5 4.5 0 003.09 3.09L12.75 18.25z" />
    </svg>
  ),
};


export const ArchetypeDisplay: React.FC<ArchetypeDisplayProps> = ({ archetype }) => {
  const icon = iconMap[archetype.id] || (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  );

  return (
    <div className="bg-gradient-to-br from-slate-700/70 to-slate-800/70 border border-slate-600 shadow-2xl rounded-xl p-6 transform transition-all duration-500 hover:scale-[1.02]">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 p-2 bg-slate-600/50 rounded-full">{icon}</div>
        <div>
          <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-rose-300 to-lime-300">
            {archetype.displayName}
          </h3>
          <blockquote className="mt-2 text-sm italic text-gray-400 border-l-4 border-sky-500 pl-3 py-1">
            "{archetype.goal}"
          </blockquote>
        </div>
      </div>
      <p className="mt-4 text-gray-300 leading-relaxed">
        {archetype.description}
      </p>
    </div>
  );
};
