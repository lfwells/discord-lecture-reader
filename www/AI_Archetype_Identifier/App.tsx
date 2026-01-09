
import React, { useState, useCallback, useMemo } from 'react';
import { UserInputForm } from './components/UserInputForm';
import { ArchetypeDisplay } from './components/ArchetypeDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { SurveyView } from './components/SurveyView';
import { SurveyResult } from './components/SurveyResult';
import { identifyArchetype as callGeminiToIdentifyArchetype } from './services/geminiService';
import { ARCHETYPES, SURVEY_QUESTIONS } from './constants';
import type { Archetype, SurveyAnswers } from './types';

const App: React.FC = () => {
  const [identifiedArchetype, setIdentifiedArchetype] = useState<Archetype | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [showSurvey, setShowSurvey] = useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [surveyAnswers, setSurveyAnswers] = useState<SurveyAnswers>({});
  const [surveyCompleted, setSurveyCompleted] = useState<boolean>(false);
  const [averageScore, setAverageScore] = useState<number | null>(null);

  const currentSurveyQuestions = useMemo(() => {
    if (identifiedArchetype && SURVEY_QUESTIONS[identifiedArchetype.id]) {
      return SURVEY_QUESTIONS[identifiedArchetype.id];
    }
    return [];
  }, [identifiedArchetype]);

  const handleIdentifyArchetype = useCallback(async (userGoal: string) => {
    setIsLoading(true);
    setError(null);
    setIdentifiedArchetype(null);
    setShowSurvey(false);
    setSurveyCompleted(false);
    setCurrentQuestionIndex(0);
    setSurveyAnswers({});
    setAverageScore(null);

    if (!process.env.API_KEY) {
      setError("API Key is not configured. Please ensure the API_KEY environment variable is set.");
      setIsLoading(false);
      return;
    }

    if (!userGoal.trim()) {
      setError("Please describe your goal.");
      setIsLoading(false);
      return;
    }

    try {
      const archetypeGoalText = await callGeminiToIdentifyArchetype(userGoal);
      const matchedArchetype = ARCHETYPES.find(arch => arch.goal === archetypeGoalText);

      if (matchedArchetype) {
        setIdentifiedArchetype(matchedArchetype);
      } else {
        console.error("No exact match for archetype goal. Gemini response:", archetypeGoalText);
        setError("The AI's response didn't match a known archetype. Please try rephrasing your goal or check the console for details.");
      }
    } catch (err) {
      console.error("Error identifying archetype:", err);
      setError(err instanceof Error ? `Error: ${err.message}` : "An unknown error occurred while identifying the archetype.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleStartSurvey = () => {
    setShowSurvey(true);
    setSurveyCompleted(false);
    setCurrentQuestionIndex(0);
    setSurveyAnswers({});
    setAverageScore(null);
  };

  const handleAnswerSurveyQuestion = (questionIndex: number, score: number) => {
    const newAnswers = { ...surveyAnswers, [questionIndex]: score };
    setSurveyAnswers(newAnswers);

    if (questionIndex < currentSurveyQuestions.length - 1) {
      setCurrentQuestionIndex(questionIndex + 1);
    } else {
      // Calculate average score
      const totalScore = Object.values(newAnswers).reduce((sum, val) => sum + val, 0);
      const avg = totalScore / currentSurveyQuestions.length;
      setAverageScore(avg);
      setSurveyCompleted(true);
      setShowSurvey(false); 
    }
  };
  
  const handleStartOver = () => {
    setIdentifiedArchetype(null);
    setIsLoading(false);
    setError(null);
    setShowSurvey(false);
    setCurrentQuestionIndex(0);
    setSurveyAnswers({});
    setSurveyCompleted(false);
    setAverageScore(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 py-8 px-4 flex flex-col items-center">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-rose-400 to-lime-400 sm:text-5xl">
          AI Archetype Identifier
        </h1>
        {!showSurvey && !surveyCompleted && (
          <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
            Tell us what you aim to achieve with AI, and we'll help you discover your current archetype.
          </p>
        )}
         {showSurvey && !surveyCompleted && identifiedArchetype && (
          <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
            Please answer the following questions based on your confidence for the <span className="font-bold text-sky-300">{identifiedArchetype.displayName}</span> archetype.
          </p>
        )}
      </header>

      <main className="w-full max-w-2xl bg-white/5 backdrop-blur-md shadow-2xl rounded-xl p-6 md:p-8">
        {isLoading && <LoadingSpinner />}
        {error && !isLoading && <ErrorMessage message={error} />}
        
        {!isLoading && !error && !identifiedArchetype && !showSurvey && !surveyCompleted && (
          <UserInputForm onSubmit={handleIdentifyArchetype} isLoading={isLoading} />
        )}

        {!isLoading && !error && identifiedArchetype && !showSurvey && !surveyCompleted && (
          <div className="mt-2">
            <h2 className="text-2xl font-semibold text-gray-200 mb-4 text-center">Your AI Archetype:</h2>
            <ArchetypeDisplay archetype={identifiedArchetype} />
            <button
              onClick={handleStartSurvey}
              className="mt-8 w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500 transition duration-150 ease-in-out"
            >
              Start Survey
            </button>
             <button
              onClick={handleStartOver}
              className="mt-4 w-full flex justify-center items-center py-2 px-4 border border-gray-500 rounded-lg shadow-sm text-sm font-medium text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-gray-400 transition duration-150 ease-in-out"
            >
              Identify Different Archetype
            </button>
          </div>
        )}

        {showSurvey && !surveyCompleted && identifiedArchetype && currentSurveyQuestions.length > 0 && (
          <SurveyView
            question={currentSurveyQuestions[currentQuestionIndex]}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={currentSurveyQuestions.length}
            onAnswer={(score) => handleAnswerSurveyQuestion(currentQuestionIndex, score)}
          />
        )}

        {surveyCompleted && averageScore !== null && identifiedArchetype &&(
          <SurveyResult 
            averageScore={averageScore} 
            archetypeName={identifiedArchetype.displayName}
            onRestart={handleStartOver} 
           />
        )}
      </main>
      
      <footer className="mt-12 text-center text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} AI Archetype Identifier. Powered by Gemini.</p>
      </footer>
    </div>
  );
};

export default App;
