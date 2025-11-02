import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Position, PositionInput, PositionUpdate, TreeNode, AIAnalysisResult } from '../types';
import { initialData } from '../initialData';
import { useAuth } from '../auth';
import { calculateFinancials, processPositions } from '../utils/financialUtils';
import {
  POSITIONS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  MAX_HISTORY_SIZE,
  DEFAULT_BENEFITS_PERCENT,
  DEFAULT_OVERHEAD_PERCENT,
  DEFAULT_WORK_WEEK_HOURS,
  ANNUAL_BILLABLE_WEEKS,
  ANALYSIS_LIMIT_KEY,
  AI_DAILY_ANALYSIS_LIMIT,
} from '../constants';

/**
 * @interface UseOrgChartReturn
 * @description Defines the shape of the object returned by the useOrgChart hook.
 * This makes it clear what state and functions are exposed to consuming components.
 */
export interface UseOrgChartReturn {
  // Core Data
  positions: Position[];
  tree: TreeNode[];
  
  // Financial Settings
  benefitsInput: string;
  setBenefitsInput: (value: string) => void;
  overheadInput: string;
  setOverheadInput: (value: string) => void;
  workWeekHoursInput: string;
  setWorkWeekHoursInput: (value: string) => void;
  globalRate: string;
  setGlobalRate: (value: string) => void;
  globalUtilization: string;
  setGlobalUtilization: (value: string) => void;
  handleApplyGlobalRate: () => void;
  handleApplyGlobalUtilization: () => void;

  // Data Manipulation Actions
  addPosition: (positionInput: PositionInput) => void;
  updatePosition: (positionUpdate: PositionUpdate) => void;
  deletePosition: (id: string) => void;
  deleteAllPositions: () => void;
  loadSampleData: () => void;
  handleUndo: () => void;
  canUndo: boolean;

  // UI State & Actions related to data
  isShowingSampleData: boolean;
  setIsShowingSampleData: (value: boolean) => void;
  isSampleNoticeVisible: boolean;
  setIsSampleNoticeVisible: (value: boolean) => void;
  autosaveStatus: 'idle' | 'saving' | 'saved' | 'disabled';

  // AI Analysis State & Actions
  aiAnalysis: AIAnalysisResult | null;
  isAnalyzing: boolean;
  aiAnalysisError: string | null;
  handleRunAnalysis: () => Promise<void>;
  remainingAnalyses: number;
  resetTimeMessage: string;
}

/**
 * @description A custom hook that encapsulates all core state and logic for the
 * organizational chart, its financial calculations, data persistence, undo history,
 * and AI analysis integration.
 * @returns {UseOrgChartReturn} An object containing all necessary state and functions.
 */
export const useOrgChart = (): UseOrgChartReturn => {
  const { isUnlocked } = useAuth();

  // --- Financial Settings ---
  const [benefitsPercent, setBenefitsPercent] = useState(DEFAULT_BENEFITS_PERCENT);
  const [overheadPercent, setOverheadPercent] = useState(DEFAULT_OVERHEAD_PERCENT);
  const [workWeekHours, setWorkWeekHours] = useState(DEFAULT_WORK_WEEK_HOURS);

  // Local state for debounced settings inputs
  const [benefitsInput, setBenefitsInput] = useState(String(benefitsPercent));
  const [overheadInput, setOverheadInput] = useState(String(overheadPercent));
  const [workWeekHoursInput, setWorkWeekHoursInput] = useState(String(workWeekHours));
  
  // State for "Global Overwrites"
  const [globalRate, setGlobalRate] = useState('');
  const [globalUtilization, setGlobalUtilization] = useState('');

  // --- Core Positions Data ---
  const [positions, setPositions] = useState<Position[]>(() => {
    // 1. Check for data in URL parameters (for sharing).
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    if (data) {
        try {
            const decodedData = atob(data);
            const parsedPositions = processPositions(JSON.parse(decodedData));
            if (Array.isArray(parsedPositions) && parsedPositions.every(p => 'id' in p && 'role' in p)) {
                window.history.replaceState({}, '', window.location.pathname); // Clean URL after loading
                return parsedPositions;
            }
        } catch (error) {
            console.error("Failed to parse positions from URL, checking localStorage.", error);
        }
    }

    // 2. If no URL data, check local storage (for persistence).
    try {
        const savedPositions = window.localStorage.getItem(POSITIONS_STORAGE_KEY);
        if (savedPositions) {
            const parsed = processPositions(JSON.parse(savedPositions));
            if (Array.isArray(parsed) && parsed.length >= 0) {
                return parsed;
            }
        }
    } catch (error) {
        console.error("Failed to load positions from localStorage, loading sample data.", error);
    }
    
    // 3. If nothing else, load initial sample data.
    return initialData.map(p => {
        const financials = calculateFinancials(
            { salary: p.salary, rate: p.rate, utilization: p.utilization, roleType: p.roleType },
            1 + DEFAULT_BENEFITS_PERCENT / 100,
            DEFAULT_OVERHEAD_PERCENT / 100,
            DEFAULT_WORK_WEEK_HOURS * ANNUAL_BILLABLE_WEEKS
        );
        return { ...p, ...financials };
    });
  });

  // --- UI & State related to data ---
  const [isShowingSampleData, setIsShowingSampleData] = useState(false);
  const [isSampleNoticeVisible, setIsSampleNoticeVisible] = useState(false);
  const [history, setHistory] = useState<Position[][]>([]);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'disabled'>('idle');
  const isInitialLoad = useRef(true); // Prevents autosave/recalc on first render

  // --- AI Analysis State ---
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);
  const [remainingAnalyses, setRemainingAnalyses] = useState(AI_DAILY_ANALYSIS_LIMIT);
  const [resetTimeMessage, setResetTimeMessage] = useState('');

  // --- Derived State & Memos ---
  const benefitsMultiplier = useMemo(() => 1 + benefitsPercent / 100, [benefitsPercent]);
  const overheadMultiplier = useMemo(() => overheadPercent / 100, [overheadPercent]);
  const annualBillableHours = useMemo(() => workWeekHours * ANNUAL_BILLABLE_WEEKS, [workWeekHours]);

  /** Memoized hierarchical tree structure derived from the flat `positions` array. */
  const tree = useMemo(() => {
    const buildTree = (items: Position[], parentId: string | null = null, depth = 0): TreeNode[] => {
      return items
        .filter(item => item.managerId === parentId)
        .map(item => ({
          ...item,
          depth,
          children: buildTree(items, item.id, depth + 1),
        }));
    };
    return buildTree(positions);
  }, [positions]);

  // --- Effects ---

  /** Loads global settings from local storage on initial app load. */
  useEffect(() => {
    try {
        const savedSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (savedSettings) {
            const { benefitsPercent, overheadPercent, workWeekHours } = JSON.parse(savedSettings);
            const bp = benefitsPercent !== undefined ? benefitsPercent : DEFAULT_BENEFITS_PERCENT;
            const op = overheadPercent !== undefined ? overheadPercent : DEFAULT_OVERHEAD_PERCENT;
            const wwh = workWeekHours !== undefined ? workWeekHours : DEFAULT_WORK_WEEK_HOURS;
            setBenefitsPercent(bp);
            setOverheadPercent(op);
            setWorkWeekHours(wwh);
            setBenefitsInput(String(bp));
            setOverheadInput(String(op));
            setWorkWeekHoursInput(String(wwh));
        }
    } catch (error) {
        console.error("Failed to load settings from localStorage", error);
    }
  }, []);

  /** Debounces updates to the global financial settings to improve INP. */
  useEffect(() => {
    const handler = setTimeout(() => {
      const newBenefits = parseFloat(benefitsInput);
      const newOverhead = parseFloat(overheadInput);
      const newWorkWeek = parseFloat(workWeekHoursInput);
      if (!isNaN(newBenefits) && newBenefits !== benefitsPercent) setBenefitsPercent(newBenefits);
      if (!isNaN(newOverhead) && newOverhead !== overheadPercent) setOverheadPercent(newOverhead);
      if (!isNaN(newWorkWeek) && newWorkWeek !== workWeekHours) setWorkWeekHours(newWorkWeek);
    }, 500);
    return () => clearTimeout(handler);
  }, [benefitsInput, overheadInput, workWeekHoursInput]);

  /** Determines if the sample data notice should be shown on initial load. */
  useEffect(() => {
    const savedPositions = window.localStorage.getItem(POSITIONS_STORAGE_KEY);
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    // If there's no saved data and no data from the URL, we're showing the sample data.
    if (!savedPositions && !data) {
        setIsShowingSampleData(true);
        setIsSampleNoticeVisible(true);
    }
  }, []);

  /** Handles autosaving of positions and settings to local storage when they change. */
  useEffect(() => {
    // Skip autosave on the very first render cycle.
    if (isInitialLoad.current) {
        setAutosaveStatus(isUnlocked ? 'saved' : 'disabled');
        isInitialLoad.current = false;
        return;
    }

    // Autosave is a premium feature.
    if (!isUnlocked) {
        setAutosaveStatus('disabled');
        return;
    }

    setAutosaveStatus('saving');

    // Debounce the save operation to avoid excessive writes.
    const handler = setTimeout(() => {
        try {
            const settingsToSave = JSON.stringify({ benefitsPercent, overheadPercent, workWeekHours });
            window.localStorage.setItem(SETTINGS_STORAGE_KEY, settingsToSave);
            window.localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(positions));
            setAutosaveStatus('saved');
        } catch (error) {
            console.error("Failed to save to localStorage", error);
            // Optionally set an 'error' status here.
        }
    }, 1000);

    return () => clearTimeout(handler);
  }, [positions, benefitsPercent, overheadPercent, workWeekHours, isUnlocked]);

  /** Recalculates financial data for all positions whenever global settings change. */
  useEffect(() => {
    // Do not run on initial load if we already have calculated data from storage.
    if (isInitialLoad.current) return;

    setPositions(currentPositions =>
        currentPositions.map(p => {
            const financials = calculateFinancials(p, benefitsMultiplier, overheadMultiplier, annualBillableHours);
            return { ...p, ...financials };
        })
    );
  }, [benefitsMultiplier, overheadMultiplier, annualBillableHours]);

  /** Effect to check and set the remaining analysis count from local storage. */
  useEffect(() => {
    if (!isUnlocked) return;

    try {
        const storedData = window.localStorage.getItem(ANALYSIS_LIMIT_KEY);
        if (storedData) {
            const { count, timestamp } = JSON.parse(storedData);
            const today = new Date().toDateString();
            const lastAnalysisDay = new Date(timestamp).toDateString();

            // If the last analysis was on a different day, reset the count.
            if (today !== lastAnalysisDay) {
                window.localStorage.removeItem(ANALYSIS_LIMIT_KEY);
                setRemainingAnalyses(AI_DAILY_ANALYSIS_LIMIT);
            } else {
                setRemainingAnalyses(Math.max(0, AI_DAILY_ANALYSIS_LIMIT - count));
            }
        } else {
            setRemainingAnalyses(AI_DAILY_ANALYSIS_LIMIT);
        }
    } catch (error) {
        console.error("Failed to read analysis limit from localStorage", error);
        setRemainingAnalyses(AI_DAILY_ANALYSIS_LIMIT);
    }
  }, [isUnlocked]);

  /** Effect to calculate and display the time until the daily limit resets. */
  useEffect(() => {
      let timer: number | null = null;
      if (remainingAnalyses <= 0) {
          const calculateResetTime = () => {
              const now = new Date();
              const tomorrow = new Date(now);
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(0, 0, 0, 0); // Midnight tomorrow
              
              const diffMs = tomorrow.getTime() - now.getTime();
              if (diffMs <= 0) { // If past midnight, reset.
                  setRemainingAnalyses(AI_DAILY_ANALYSIS_LIMIT);
                  setResetTimeMessage('');
                  if (timer) window.clearInterval(timer);
                  return;
              }

              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              setResetTimeMessage(`Resets in ${diffHours}h ${diffMinutes}m`);
          };
          
          calculateResetTime();
          timer = window.setInterval(calculateResetTime, 1000 * 30); // Update every 30 seconds
          
          return () => { if (timer) window.clearInterval(timer); };
      }
  }, [remainingAnalyses]);


  // --- Data Manipulation Functions ---

  /** Saves the current state to history for the undo feature. */
  const saveStateForUndo = useCallback((currentState: Position[]) => {
    setHistory(prev => {
        const newHistory = [...prev, currentState];
        // Prune the history to prevent it from growing indefinitely.
        if (newHistory.length > MAX_HISTORY_SIZE) {
            return newHistory.slice(newHistory.length - MAX_HISTORY_SIZE);
        }
        return newHistory;
    });
  }, []);

  /** Adds a new position to the state. */
  const addPosition = (positionInput: PositionInput) => {
    saveStateForUndo(positions);
    const financials = calculateFinancials(positionInput, benefitsMultiplier, overheadMultiplier, annualBillableHours);
    const newPosition: Position = {
      id: crypto.randomUUID(),
      ...positionInput,
      ...financials,
    };
    setPositions([...positions, newPosition]);
    setIsShowingSampleData(false);
    setIsSampleNoticeVisible(false);
  };

  /** Updates an existing position in the state. */
  const updatePosition = useCallback((positionUpdate: PositionUpdate) => {
    saveStateForUndo(positions);
    setPositions(currentPositions => currentPositions.map(p => {
      if (p.id === positionUpdate.id) {
        const updatedFullPosition: Position = { 
          ...p, 
          ...positionUpdate,
          ...(positionUpdate.roleType === 'nonBillable' ? { rate: 0, utilization: 0 } : {})
        };
        const financials = calculateFinancials(updatedFullPosition, benefitsMultiplier, overheadMultiplier, annualBillableHours);
        return { ...updatedFullPosition, ...financials };
      }
      return p;
    }));
    setIsShowingSampleData(false);
    setIsSampleNoticeVisible(false);
  }, [benefitsMultiplier, overheadMultiplier, annualBillableHours, positions, saveStateForUndo]);

  /** Deletes a position and re-parenting its children. */
  const deletePosition = (id: string) => {
    saveStateForUndo(positions);
    setPositions(prev => {
        const positionToDelete = prev.find(p => p.id === id);
        if (!positionToDelete) return prev;
        
        const parentId = positionToDelete.managerId;
        const updatedPositions = prev.filter(p => p.id !== id)
          .map(p => p.managerId === id ? { ...p, managerId: parentId } : p);

        return updatedPositions;
    });
    setIsShowingSampleData(false);
    setIsSampleNoticeVisible(false);
  };

  /** Clears all positions from the chart. */
  const deleteAllPositions = () => {
    saveStateForUndo(positions);
    setPositions([]);
    setIsShowingSampleData(false);
    setIsSampleNoticeVisible(false);
  };

  /** Loads the default sample data into the application. */
  const loadSampleData = () => {
    saveStateForUndo(positions);
    const recalculatedSampleData = initialData.map(p => {
        const financials = calculateFinancials(
            { salary: p.salary, rate: p.rate, utilization: p.utilization, roleType: p.roleType },
            benefitsMultiplier,
            overheadMultiplier,
            annualBillableHours
        );
        return { ...p, ...financials };
    });
    setPositions(recalculatedSampleData);
    setIsShowingSampleData(true);
    setIsSampleNoticeVisible(true);
    window.history.pushState({}, '', window.location.pathname); // Clear URL params if any
  };

  /** Applies a global billable rate to all applicable roles. */
  const handleApplyGlobalRate = () => {
    const rateValue = parseFloat(globalRate);
    if (isNaN(rateValue)) return;
    
    saveStateForUndo(positions);
    setPositions(currentPositions =>
        currentPositions.map(p => {
            const updatedPos = p.roleType === 'billable' ? { ...p, rate: rateValue } : p;
            const financials = calculateFinancials(updatedPos, benefitsMultiplier, overheadMultiplier, annualBillableHours);
            return { ...updatedPos, ...financials };
        })
    );
    setGlobalRate('');
  };

  /** Applies a global utilization percentage to all applicable roles. */
  const handleApplyGlobalUtilization = () => {
    const utilValue = parseFloat(globalUtilization);
    if (isNaN(utilValue)) return;

    saveStateForUndo(positions);
    setPositions(currentPositions =>
        currentPositions.map(p => {
            const updatedPos = p.roleType === 'billable' ? { ...p, utilization: utilValue } : p;
            const financials = calculateFinancials(updatedPos, benefitsMultiplier, overheadMultiplier, annualBillableHours);
            return { ...updatedPos, ...financials };
        })
    );
    setGlobalUtilization('');
  };

  /** Reverts the `positions` state to the most recent entry in the history. */
  const handleUndo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setPositions(lastState);
    setHistory(prev => prev.slice(0, prev.length - 1));
  };
  const canUndo = history.length > 0;

  /** Handles the AI analysis request, including daily limits and error handling. */
  const handleRunAnalysis = async () => {
    if (!isUnlocked) {
        // This function should be called after a check for isUnlocked has been made.
        // The component calling this should handle the unlock request.
        console.warn("Attempted to run AI analysis while locked.");
        return;
    }
    if (remainingAnalyses <= 0) {
        console.warn("Attempted to run AI analysis, but daily limit reached.");
        return;
    }

    setIsAnalyzing(true);
    setAiAnalysis(null);
    setAiAnalysisError(null);

    try {
        const storedData = window.localStorage.getItem(ANALYSIS_LIMIT_KEY);
        let currentCount = 0;
        if (storedData) {
            const { count, timestamp } = JSON.parse(storedData);
            if (new Date().toDateString() === new Date(timestamp).toDateString()) {
                currentCount = count;
            }
        }
        const newCount = currentCount + 1;
        window.localStorage.setItem(ANALYSIS_LIMIT_KEY, JSON.stringify({ count: newCount, timestamp: Date.now() }));
        setRemainingAnalyses(AI_DAILY_ANALYSIS_LIMIT - newCount);

        const positionsWithReportCount = positions.map(p => ({
            ...p,
            directReports: positions.filter(r => r.managerId === p.id).length
        }));

        const dataForAnalysis = {
            positions: positionsWithReportCount.map(({ id, managerId, ...rest }) => rest), // Omit IDs for privacy/simplicity
            settings: {
                benefitsPercent,
                overheadPercent,
                workWeekHours,
                annualBillableWeeks: ANNUAL_BILLABLE_WEEKS,
            }
        };

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataForAnalysis }),
        });

        if (!response.ok) {
            let errorDetails = `API request failed with status ${response.status}`;
            const rawResponseText = await response.text(); 
            try {
                const errorData = JSON.parse(rawResponseText);
                errorDetails = errorData.error || errorData.details || JSON.stringify(errorData);
            } catch (jsonParseError) {
                errorDetails = `Server returned an unexpected response (status ${response.status}). Details: "${rawResponseText.substring(0, 150)}..."`;
            }
            throw new Error(errorDetails);
        }
        
        const analysisResult = await response.json() as AIAnalysisResult;
        setAiAnalysis(analysisResult);

    } catch (error) {
        console.error("AI analysis failed:", error);
        setAiAnalysisError(error instanceof Error ? error.message : "An unknown error occurred during analysis.");
    } finally {
        setIsAnalyzing(false);
    }
  };


  return {
    positions,
    tree,
    benefitsInput,
    setBenefitsInput,
    overheadInput,
    setOverheadInput,
    workWeekHoursInput,
    setWorkWeekHoursInput,
    globalRate,
    setGlobalRate,
    globalUtilization,
    setGlobalUtilization,
    handleApplyGlobalRate,
    handleApplyGlobalUtilization,
    addPosition,
    updatePosition,
    deletePosition,
    deleteAllPositions,
    loadSampleData,
    handleUndo,
    canUndo,
    isShowingSampleData,
    setIsShowingSampleData,
    isSampleNoticeVisible,
    setIsSampleNoticeVisible,
    autosaveStatus,
    aiAnalysis,
    isAnalyzing,
    aiAnalysisError,
    handleRunAnalysis,
    remainingAnalyses,
    resetTimeMessage,
  };
};