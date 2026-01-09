"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const UserInputForm_1 = require("./components/UserInputForm");
const ArchetypeDisplay_1 = require("./components/ArchetypeDisplay");
const LoadingSpinner_1 = require("./components/LoadingSpinner");
const ErrorMessage_1 = require("./components/ErrorMessage");
const SurveyView_1 = require("./components/SurveyView");
const SurveyResult_1 = require("./components/SurveyResult");
const geminiService_1 = require("./services/geminiService");
const constants_1 = require("./constants");
const App = () => {
    const [identifiedArchetype, setIdentifiedArchetype] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [showSurvey, setShowSurvey] = (0, react_1.useState)(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = (0, react_1.useState)(0);
    const [surveyAnswers, setSurveyAnswers] = (0, react_1.useState)({});
    const [surveyCompleted, setSurveyCompleted] = (0, react_1.useState)(false);
    const [averageScore, setAverageScore] = (0, react_1.useState)(null);
    const currentSurveyQuestions = (0, react_1.useMemo)(() => {
        if (identifiedArchetype && constants_1.SURVEY_QUESTIONS[identifiedArchetype.id]) {
            return constants_1.SURVEY_QUESTIONS[identifiedArchetype.id];
        }
        return [];
    }, [identifiedArchetype]);
    const handleIdentifyArchetype = (0, react_1.useCallback)((userGoal) => __awaiter(void 0, void 0, void 0, function* () {
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
            const archetypeGoalText = yield (0, geminiService_1.identifyArchetype)(userGoal);
            const matchedArchetype = constants_1.ARCHETYPES.find(arch => arch.goal === archetypeGoalText);
            if (matchedArchetype) {
                setIdentifiedArchetype(matchedArchetype);
            }
            else {
                console.error("No exact match for archetype goal. Gemini response:", archetypeGoalText);
                setError("The AI's response didn't match a known archetype. Please try rephrasing your goal or check the console for details.");
            }
        }
        catch (err) {
            console.error("Error identifying archetype:", err);
            setError(err instanceof Error ? `Error: ${err.message}` : "An unknown error occurred while identifying the archetype.");
        }
        finally {
            setIsLoading(false);
        }
    }), []);
    const handleStartSurvey = () => {
        setShowSurvey(true);
        setSurveyCompleted(false);
        setCurrentQuestionIndex(0);
        setSurveyAnswers({});
        setAverageScore(null);
    };
    const handleAnswerSurveyQuestion = (questionIndex, score) => {
        const newAnswers = Object.assign(Object.assign({}, surveyAnswers), { [questionIndex]: score });
        setSurveyAnswers(newAnswers);
        if (questionIndex < currentSurveyQuestions.length - 1) {
            setCurrentQuestionIndex(questionIndex + 1);
        }
        else {
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
    return (<div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 py-8 px-4 flex flex-col items-center">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-rose-400 to-lime-400 sm:text-5xl">
          AI Archetype Identifier
        </h1>
        {!showSurvey && !surveyCompleted && (<p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
            Tell us what you aim to achieve with AI, and we'll help you discover your current archetype.
          </p>)}
         {showSurvey && !surveyCompleted && identifiedArchetype && (<p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
            Please answer the following questions based on your confidence for the <span className="font-bold text-sky-300">{identifiedArchetype.displayName}</span> archetype.
          </p>)}
      </header>

      <main className="w-full max-w-2xl bg-white/5 backdrop-blur-md shadow-2xl rounded-xl p-6 md:p-8">
        {isLoading && <LoadingSpinner_1.LoadingSpinner />}
        {error && !isLoading && <ErrorMessage_1.ErrorMessage message={error}/>}
        
        {!isLoading && !error && !identifiedArchetype && !showSurvey && !surveyCompleted && (<UserInputForm_1.UserInputForm onSubmit={handleIdentifyArchetype} isLoading={isLoading}/>)}

        {!isLoading && !error && identifiedArchetype && !showSurvey && !surveyCompleted && (<div className="mt-2">
            <h2 className="text-2xl font-semibold text-gray-200 mb-4 text-center">Your AI Archetype:</h2>
            <ArchetypeDisplay_1.ArchetypeDisplay archetype={identifiedArchetype}/>
            <button onClick={handleStartSurvey} className="mt-8 w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500 transition duration-150 ease-in-out">
              Start Survey
            </button>
             <button onClick={handleStartOver} className="mt-4 w-full flex justify-center items-center py-2 px-4 border border-gray-500 rounded-lg shadow-sm text-sm font-medium text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-gray-400 transition duration-150 ease-in-out">
              Identify Different Archetype
            </button>
          </div>)}

        {showSurvey && !surveyCompleted && identifiedArchetype && currentSurveyQuestions.length > 0 && (<SurveyView_1.SurveyView question={currentSurveyQuestions[currentQuestionIndex]} questionNumber={currentQuestionIndex + 1} totalQuestions={currentSurveyQuestions.length} onAnswer={(score) => handleAnswerSurveyQuestion(currentQuestionIndex, score)}/>)}

        {surveyCompleted && averageScore !== null && identifiedArchetype && (<SurveyResult_1.SurveyResult averageScore={averageScore} archetypeName={identifiedArchetype.displayName} onRestart={handleStartOver}/>)}
      </main>
      
      <footer className="mt-12 text-center text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} AI Archetype Identifier. Powered by Gemini.</p>
      </footer>
    </div>);
};
exports.default = App;
