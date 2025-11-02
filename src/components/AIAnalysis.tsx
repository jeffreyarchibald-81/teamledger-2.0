import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIAnalysisResult } from '../types';
import { SparklesIcon, LightBulbIcon, CheckCircleIcon, ExclamationTriangleIcon } from './icons';

/**
 * @interface AIAnalysisProps
 * @description Defines the props for the AIAnalysis component.
 */
interface AIAnalysisProps {
    /** Flag indicating if the AI analysis feature is unlocked. */
    isUnlocked: boolean;
    /** Callback function to trigger the AI analysis process. */
    onRunAnalysis: () => Promise<void>; // Updated to reflect async nature
    /** The result of the AI analysis, or null if not yet run or in progress. */
    analysisResult: AIAnalysisResult | null;
    /** Flag indicating if the analysis is currently in progress. */
    isAnalyzing: boolean;
    /** Optional error message from the AI analysis API call. */
    aiAnalysisError: string | null;
    /** Callback to open the unlock modal if the feature is locked. */
    onUnlockRequest: () => void;
    /** The number of remaining analyses for the day. */
    remainingAnalyses: number;
    /** Message indicating when the daily analysis limit resets. */
    resetTimeMessage: string;
}

/**
 * @description A component that provides an AI-powered analysis of the user's organizational structure.
 * It manages the UI for different states: locked, initial, loading, and results.
 * It now receives daily usage limits and reset time from props.
 */
const AIAnalysis: React.FC<AIAnalysisProps> = ({ isUnlocked, onRunAnalysis, analysisResult, isAnalyzing, aiAnalysisError, onUnlockRequest, remainingAnalyses, resetTimeMessage }) => {

    /** Renders the content of the analysis card based on the current state. */
    const renderContent = () => {
        if (isAnalyzing) return <LoadingState />;
        if (aiAnalysisError) return <ErrorState errorMessage={aiAnalysisError} onTryAgain={onRunAnalysis} />;
        if (analysisResult) return <ResultsDisplay result={analysisResult} onRerun={onRunAnalysis} remaining={remainingAnalyses} resetTimeMessage={resetTimeMessage} />;
        return <InitialState onAnalyze={onRunAnalysis} remaining={remainingAnalyses} resetTimeMessage={resetTimeMessage} />;
    };

    return (
        <div className="relative flex-grow flex flex-col items-center justify-center h-full"> {/* Added flex flex-col items-center justify-center h-full for centering */}
            {isUnlocked ? renderContent() : <LockedState onUnlockRequest={onUnlockRequest} />}
        </div>
    );
};

// --- Child Components for Different States ---

/** A dummy analysis result used for the blurred background of the locked state. */
const dummyAnalysis: AIAnalysisResult = {
    strengths: ["Strong leadership team with clear reporting lines.", "High utilization in development indicates strong project demand.", "Healthy profit margins on senior roles suggest effective pricing."],
    risks_opportunities: ["Creative Director has a wide span of control, risking bottleneck.", "Opportunity to add a mid-level PM to support Client Services.", "Consider a dedicated QA role to improve development workflow."],
    key_observations: ["Development department is the largest portion of salary cost.", "Client services has lowest average salary but high growth potential.", "2:1 ratio of individual contributors to management."]
};

/** @description The UI state shown when the AI analysis feature is locked. */
const LockedState: React.FC<{ onUnlockRequest: () => void; }> = ({ onUnlockRequest }) => (
    <div className="relative cursor-pointer w-full h-full" onClick={onUnlockRequest}> {/* Added w-full h-full */}
        <div className="blur-sm select-none pointer-events-none" aria-hidden="true">
            <div className="grid md:grid-cols-3 gap-6">
                <AnalysisCard title="Strengths" icon={CheckCircleIcon} items={dummyAnalysis.strengths} iconColor="text-white" />
                <AnalysisCard title="Risks & Opportunities" icon={ExclamationTriangleIcon} items={dummyAnalysis.risks_opportunities} iconColor="text-white" />
                <AnalysisCard title="Key Observations" icon={LightBulbIcon} items={dummyAnalysis.key_observations} iconColor="text-white" />
            </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-black/60 rounded-lg p-4">
            <SparklesIcon className="w-8 h-8 text-brand-accent mb-3" />
            <h3 className="text-lg font-bold text-white">Unlock Actionable Insights</h3>
            <p className="text-gray-300 mt-1 max-w-xs">See AI-powered strengths, risks, and opportunities for your team structure.</p>
        </div>
    </div>
);

/** @description The initial UI state before an analysis has been run. */
const InitialState: React.FC<{onAnalyze: () => void; remaining: number; resetTimeMessage: string}> = ({ onAnalyze, remaining, resetTimeMessage }) => {
    const hasAnalysesLeft = remaining > 0;
    const buttonText = !hasAnalysesLeft ? "Daily Limit Reached" : remaining === 1 ? "Run Analysis (1 left)" : "Run Analysis";

    return (
        <div className="text-center w-full"> {/* Removed flex flex-col items-center justify-center flex-grow, added w-full */}
            <h3 className="text-lg font-semibold text-white">Get instant insights on your org chart</h3>
            <p className="text-gray-300 mt-2 max-w-md mx-auto">Have a custom-trained AI analyze your team's structure, costs, and profitability to find strengths, risks, and opportunities.</p>
            <motion.button 
                onClick={onAnalyze} disabled={!hasAnalysesLeft}
                className="mt-6 bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-bold py-2 px-5 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: hasAnalysesLeft ? 1.05 : 1 }} whileTap={{ scale: hasAnalysesLeft ? 0.95 : 1 }}
            >
                {buttonText}
            </motion.button>
             {!hasAnalysesLeft && resetTimeMessage && <p className="text-sm text-gray-400 mt-3">{resetTimeMessage}</p>}
        </div>
    );
};

/** @description The UI state shown while the analysis is in progress. */
const LoadingState: React.FC = () => (
    <div role="status" className="text-center w-full"> {/* Removed flex flex-col items-center justify-center flex-grow, added w-full */}
        <motion.div
            aria-label="Loading analysis"
            animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 border-4 border-t-brand-accent border-gray-700 rounded-full mx-auto"
        />
        <p className="mt-4 text-gray-400">Analyzing your org chart...</p>
        <p className="text-sm text-gray-400">This may take a moment.</p>
    </div>
);

/** @description The UI state for displaying an error during analysis. */
const ErrorState: React.FC<{ errorMessage: string; onTryAgain: () => void }> = ({ errorMessage, onTryAgain }) => (
    <div role="alert" className="text-center w-full"> {/* Removed flex flex-col items-center justify-center flex-grow, added w-full */}
        <ExclamationTriangleIcon className="w-10 h-10 text-red-500 mb-3" />
        <h3 className="text-lg font-semibold text-white">Analysis Failed</h3>
        <p className="text-red-400 mt-2 max-w-md mx-auto">{errorMessage}</p>
        <motion.button 
            onClick={onTryAgain}
            className="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-lg transition-colors duration-200"
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        >
            Try Again
        </motion.button>
    </div>
);

/** @description The UI state for displaying the analysis results. */
const ResultsDisplay: React.FC<{result: AIAnalysisResult; onRerun: () => void; remaining: number; resetTimeMessage: string}> = ({ result, onRerun, remaining, resetTimeMessage }) => {
    const hasAnalysesLeft = remaining > 0;
    const buttonText = !hasAnalysesLeft ? "Daily Limit Reached" : remaining === 1 ? "Re-analyze Chart (1 left)" : "Re-analyze Chart";
    
    return (
    <div aria-live="polite" className="flex flex-col w-full h-full"> {/* Changed flex-grow to w-full h-full */}
        <div className="grid md:grid-cols-3 gap-6 flex-grow">
            <AnalysisCard title="Strengths" icon={CheckCircleIcon} items={result.strengths} iconColor="text-white" />
            <AnalysisCard title="Risks & Opportunities" icon={ExclamationTriangleIcon} items={result.risks_opportunities} iconColor="text-white" />
            <AnalysisCard title="Key Observations" icon={LightBulbIcon} items={result.key_observations} iconColor="text-white" />
        </div>
         <div className="text-center mt-8">
            <motion.button 
                onClick={onRerun} disabled={!hasAnalysesLeft}
                className="text-brand-accent hover:text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ y: hasAnalysesLeft ? -2 : 0 }} whileTap={{ y: hasAnalysesLeft ? 0 : 0 }}
            >
                {buttonText}
            </motion.button>
            {!hasAnalysesLeft && resetTimeMessage && <p className="text-sm text-gray-400 mt-2">{resetTimeMessage}</p>}
        </div>
    </div>
    );
};

/** @description A reusable card component to display a list of analysis points. */
interface AnalysisCardProps {
    title: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    items: string[];
    iconColor: string;
}
const AnalysisCard: React.FC<AnalysisCardProps> = ({ title, icon: Icon, items, iconColor }) => (
    <motion.div 
        className="bg-gray-900/50 p-4 rounded-lg border border-brand-border h-full"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
    >
        <div className="flex items-center mb-3">
            <Icon className={`w-6 h-6 mr-3 ${iconColor}`} />
            <h4 className="font-semibold text-white">{title}</h4>
        </div>
        <ul className="space-y-2 list-disc list-inside text-gray-300 text-sm leading-relaxed font-medium">
            {items.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
    </motion.div>
);

export default AIAnalysis;