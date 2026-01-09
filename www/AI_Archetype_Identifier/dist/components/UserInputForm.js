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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserInputForm = void 0;
const react_1 = __importStar(require("react"));
const UserInputForm = ({ onSubmit, isLoading }) => {
    const [goal, setGoal] = (0, react_1.useState)('');
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!goal.trim())
            return;
        onSubmit(goal);
    };
    return (<form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="userGoal" className="block text-sm font-medium text-gray-300 mb-1">
          Describe your AI-related goal:
        </label>
        <textarea id="userGoal" name="userGoal" rows={4} className="block w-full p-3 bg-gray-700/50 text-gray-200 border border-gray-600 rounded-lg shadow-sm focus:ring-sky-500 focus:border-sky-500 transition duration-150 ease-in-out placeholder-gray-400" placeholder="e.g., I want to automate repetitive data entry tasks, or I want to understand how AI can revolutionize my industry..." value={goal} onChange={(e) => setGoal(e.target.value)} disabled={isLoading}/>
      </div>
      <div>
        <button type="submit" disabled={isLoading || !goal.trim()} className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition duration-150 ease-in-out group">
          {isLoading ? (<>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Identifying...
            </>) : (<>
            Identify My Archetype
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 ml-2 opacity-70 group-hover:opacity-100 transition-opacity">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd"/>
            </svg>
            </>)}
        </button>
      </div>
    </form>);
};
exports.UserInputForm = UserInputForm;
