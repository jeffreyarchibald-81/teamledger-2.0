import React from 'react';
import { motion } from 'framer-motion';
import { AIAnalysisResult } from '../types';
import AIAnalysis from './AIAnalysis';
import { SparklesIcon } from './icons';

/**
 * @interface AIAnalysisSectionProps
 * @description Defines the props for the AIAnalysisSection component.
 */
interface AIAnalysisSectionProps {
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
 * @description A component that acts as a wrapper for the AIAnalysis component,
 * handling the section title and passing down all necessary props.
 */
const AIAnalysisSection: React.FC<AIAnalysisSectionProps> = ({
    isUnlocked,
    onRunAnalysis,
    analysisResult,
    isAnalyzing,
    aiAnalysisError,
    onUnlockRequest,
    remainingAnalyses,
    resetTimeMessage,
}) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold flex items-center">
                    <SparklesIcon className="w-6 h-6 mr-3 text-brand-accent" />
                    AI-Powered Analysis
                </h2>
            </div>
            <div className="bg-brand-surface/50 p-6 rounded-lg border border-brand-border min-h-[250px] flex flex-col">
                <AIAnalysis
                    isUnlocked={isUnlocked}
                    onRunAnalysis={onRunAnalysis}
                    analysisResult={analysisResult}
                    isAnalyzing={isAnalyzing}
                    aiAnalysisError={aiAnalysisError}
                    onUnlockRequest={onUnlockRequest}
                    remainingAnalyses={remainingAnalyses}
                    resetTimeMessage={resetTimeMessage}
                />
            </div>
        </div>
    );
};

export default AIAnalysisSection;