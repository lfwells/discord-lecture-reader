"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SurveyView = void 0;
const react_1 = __importDefault(require("react"));
const constants_1 = require("../constants");
const SurveyView = ({ question, questionNumber, totalQuestions, onAnswer, }) => {
    return (<div className="space-y-6 text-gray-200">
      <div className="text-center mb-2">
        <p className="text-sm font-medium text-gray-400">
          Question {questionNumber} of {totalQuestions}
        </p>
      </div>
      <p className="text-lg font-medium leading-relaxed text-center" aria-live="polite">{question}</p>
      <div className="mt-6 space-y-3 sm:space-y-0 sm:flex sm:flex-col sm:items-center">
        {constants_1.LIKERT_OPTIONS.map((option) => (<button key={option.value} onClick={() => onAnswer(option.value)} className="w-full sm:w-3/4 md:w-2/3 lg:w-1/2 flex items-center justify-center text-left p-3 my-1.5 bg-slate-700/60 border border-slate-600 rounded-lg hover:bg-sky-700/80 focus:bg-sky-600/80 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-150 ease-in-out group" aria-label={`${option.text}, Score ${option.value}`}>
            <span className="text-base font-medium text-gray-200 group-hover:text-white">{option.text}</span>
          </button>))}
      </div>
    </div>);
};
exports.SurveyView = SurveyView;
