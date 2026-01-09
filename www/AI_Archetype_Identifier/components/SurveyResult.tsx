
import React from 'react';

interface SurveyResultProps {
  averageScore: number;
  archetypeName: string;
  onRestart: () => void;
}

export const SurveyResult: React.FC<SurveyResultProps> = ({ averageScore, archetypeName, onRestart }) => {
  return (
    <div className="text-center py-6 px-4 bg-slate-700/50 border border-slate-600 rounded-xl shadow-xl">
      <h2 className="text-2xl font-semibold text-gray-200 mb-3">Survey Completed!</h2>
      <p className="text-lg text-gray-300 mb-1">
        For the <span className="font-bold text-sky-300">{archetypeName}</span> archetype:
      </p>
      <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-lime-400 my-4">
        {averageScore.toFixed(2)} / 5
      </p>
      <p className="text-lg text-gray-300 mb-6">
        This is your average confidence score based on your answers.
      </p>
      <button
        onClick={onRestart}
        className="w-full max-w-xs mx-auto flex justify-center items-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 transition duration-150 ease-in-out"
      >
        Start Over
      </button>
    </div>
  );
};
