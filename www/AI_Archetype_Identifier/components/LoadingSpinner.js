"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadingSpinner = void 0;
const react_1 = __importDefault(require("react"));
const LoadingSpinner = () => {
    return (<div className="flex justify-center items-center py-8" role="status" aria-label="Loading...">
      <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin-custom"></div>
      <span className="sr-only">Loading...</span>
    </div>);
};
exports.LoadingSpinner = LoadingSpinner;
