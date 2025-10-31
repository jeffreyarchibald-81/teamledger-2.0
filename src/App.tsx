import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { Position, PositionInput, PositionUpdate, TreeNode, AIAnalysisResult } from './types';
import { initialData } from './initialData';
import SummaryTable from './components/SummaryTable';
import PositionEditor from './components/PositionEditor';
import OrgChart from './components/OrgChart';
import OrgChartListView from './components/OrgChartListView';
import AIAnalysis from './components/AIAnalysis';
import { useAuth } from './auth';
import StickyHeader from './components/StickyHeader';
import CookieConsent from './components/CookieConsent';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import MobileNotice from './components/MobileNotice';
import { calculateFinancials, processPositions } from './utils/financialUtils';
import {
  PlusIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  PhotoIcon,
  TrashIcon,
  SparklesIcon,
  CheckCircleIcon,
  XIcon,
} from './components/icons';

import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import HelpModal from './components/HelpModal';
import UnlockModal from './components/UnlockModal';
import ExportModal from './components/ExportModal';
import SuccessToast from './components/SuccessToast';

import {
  POSITIONS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  MAX_HISTORY_SIZE,
  DEFAULT_BENEFITS_PERCENT,
  DEFAULT_OVERHEAD_PERCENT,
  DEFAULT_WORK_WEEK_HOURS,
  ANNUAL_BILLABLE_WEEKS,
} from './constants';
import { useAccessibilityModal } from './hooks/useAccessibilityModal';

/**
 * @description The main component for the TeamLedger application.
 * Manages all application state, including positions, financial settings, UI state (modals, views),
 * and handles all data manipulation logic (add, update, delete positions).
 */
const App: React.FC = () => {
  // --- State Management ---
  
  // Authentication state from context. `isUnlocked` controls access to premium features.
  const { isUnlocked } = useAuth();

  // Global financial settings. These are used in the `calculateFinancials` function.
  const [benefitsPercent, setBenefitsPercent] = useState(DEFAULT_BENEFITS_PERCENT);
  const [overheadPercent, setOverheadPercent] = useState(DEFAULT_OVERHEAD_PERCENT);
  const [workWeekHours, setWorkWeekHours] = useState(DEFAULT_WORK_WEEK_HOURS);

  // Local state for debounced settings inputs to improve INP.
  const [benefitsInput, setBenefitsInput] = useState(String(benefitsPercent));
  const [overheadInput, setOverheadInput] = useState(String(overheadPercent));
  const [workWeekHoursInput, setWorkWeekHoursInput] = useState(String(workWeekHours));
  
  // State for the "Global Overwrites" feature in settings.
  const [globalRate, setGlobalRate] = useState('');
  const [globalUtilization, setGlobalUtilization] = useState('');

  // State for the undo functionality. Stores previous versions of the positions array.
  const [history, setHistory] = useState<Position[][]>([]);
  
  // Core application data: the array of all positions.
  // Initialized from URL params, localStorage, or sample data as a fallback.
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
        // Explicitly pass properties to match calculateFinancials signature
        const financials = calculateFinancials(
            { salary: p.salary, rate: p.rate, utilization: p.utilization, roleType: p.roleType },
            1 + DEFAULT_BENEFITS_PERCENT / 100,
            DEFAULT_OVERHEAD_PERCENT / 100,
            DEFAULT_WORK_WEEK_HOURS * ANNUAL_BILLABLE_WEEKS
        );
        return { ...p, ...financials };
    });
  });
  
  // --- UI State ---
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [newPositionParentId, setNewPositionParentId] = useState<string | null>(null);
  const [chartView, setChartView] = useState<'tree' | 'list'>('tree');
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<Position | null>(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showUnlockToast, setShowUnlockToast] = useState(false);
  const [isStickyHeaderVisible, setIsStickyHeaderVisible] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null); // New state for API error
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'disabled'>('idle');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isShowingSampleData, setIsShowingSampleData] = useState(false);
  const [isSampleNoticeVisible, setIsSampleNoticeVisible] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  
  // --- Refs for DOM elements ---
  const orgChartRef = useRef<HTMLDivElement>(null);
  const orgStructureRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true); // Prevents autosave on the very first render.
  
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

  /** Attaches a scroll listener to show/hide the sticky header. */
  useEffect(() => {
    const handleScroll = () => {
        if (logoRef.current) {
            const { bottom } = logoRef.current.getBoundingClientRect();
            setIsStickyHeaderVisible(bottom <= 0);
        }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /** Manages the visibility of the "Unlock Successful" toast notification. */
  useEffect(() => {
    if (showUnlockToast) {
        const timer = setTimeout(() => setShowUnlockToast(false), 5000);
        return () => clearTimeout(timer);
    }
  }, [showUnlockToast]);

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
        // Merge the existing position with the update to ensure all required financial fields are present
        const updatedFullPosition: Position = { 
          ...p, 
          ...positionUpdate,
          // Ensure rate and utilization are 0 for nonBillable roles if roleType is changed
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

  /** Deletes a position and re-parents its children. */
  const deletePosition = (id: string) => {
    saveStateForUndo(positions);
    setPositions(prev => {
        const positionToDelete = prev.find(p => p.id === id);
        if (!positionToDelete) return prev;
        
        const parentId = positionToDelete.managerId;
        // Filter out the deleted position and update managerId for its direct reports.
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
    setIsDeleteAllConfirmOpen(false);
    setIsShowingSampleData(false);
    setIsSampleNoticeVisible(false);
  };

  /** Loads the default sample data into the application. */
  const loadSampleData = () => {
    saveStateForUndo(positions);
    const recalculatedSampleData = initialData.map(p => {
        // Explicitly pass properties to match calculateFinancials signature
        const financials = calculateFinancials(
            { salary: p.salary, rate: p.rate, utilization: p.utilization, roleType: p.roleType },
            benefitsMultiplier,
            overheadMultiplier,
            annualBillableHours
        );
        return { ...p, ...financials };
    });
    setPositions(recalculatedSampleData);
    setIsActionMenuOpen(false);
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
    setIsActionMenuOpen(false);
  };

  // --- UI Event Handlers ---

  const handleOpenEditorForNew = (managerId: string | null) => {
    setEditingPosition(null);
    setDuplicateSource(null);
    setNewPositionParentId(managerId);
    setIsEditorOpen(true);
  };
  
  const handleAddRootRole = () => handleOpenEditorForNew(null);
  
  const handleEditPosition = (position: Position) => {
    setEditingPosition(position);
    setDuplicateSource(null);
    setIsEditorOpen(true);
  };

  const handleDuplicatePosition = (position: Position) => {
    setEditingPosition(null);
    setDuplicateSource(position);
    setIsEditorOpen(true);
  };

  /** Callback for the PositionEditor to save data and close the modal. */
  const handleSavePosition = (positionData: PositionInput | PositionUpdate) => {
    if ('id' in positionData) {
      updatePosition(positionData as PositionUpdate);
    } else {
      addPosition(positionData as PositionInput);
    }
    // Reset editor state
    setIsEditorOpen(false);
    setEditingPosition(null);
    setNewPositionParentId(null);
    setDuplicateSource(null);
  };
  
  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingPosition(null);
    setDuplicateSource(null);
  };

  /** Generates a shareable link and CSV data for export. */
  const handleExport = (): { link: string; csv: string } => {
    // CSV generation
    const headers = ['Role', 'Salary', 'Total Salary', 'Overhead Cost', 'Rate', 'Utilization', 'Revenue', 'Profit'];
    const headerKeys: (keyof Position)[] = ['role', 'salary', 'totalSalary', 'overheadCost', 'rate', 'utilization', 'revenue', 'profit'];
    const csvRows = [
        headers.join(','),
        ...positions.map(pos => 
            headerKeys.map(header => {
                const value = pos[header];
                if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
                return value;
            }).join(',')
        )
    ];
    // Add totals row to CSV
    const totals = positions.reduce((acc, pos) => ({
        salary: acc.salary + pos.salary,
        totalSalary: acc.totalSalary + pos.totalSalary,
        overheadCost: acc.overheadCost + pos.overheadCost,
        revenue: acc.revenue + pos.revenue,
        profit: acc.profit + pos.profit,
    }), { salary: 0, totalSalary: 0, overheadCost: 0, revenue: 0, profit: 0 });
    const totalsRow = ['Totals', totals.salary, totals.totalSalary, totals.overheadCost, '', '', totals.revenue, totals.profit].join(',');
    csvRows.push(totalsRow);
    const csvContent = csvRows.join('\n');
    
    // Shareable link generation
    const dataString = JSON.stringify(positions);
    const encodedData = btoa(dataString);
    const link = `${window.location.origin}${window.location.pathname}?data=${encodedData}`;

    return { link, csv: csvContent };
  };
  
  /** Handles downloading the org chart as a PNG image. */
  const handleDownloadPng = async () => {
    if (!orgChartRef.current) {
        console.error("Org chart element not found for PNG export.");
        return;
    }
    const element = orgChartRef.current;
    const canvas = await html2canvas(element, {
        backgroundColor: '#161B22',
        scale: 2, // Higher scale for better resolution
        useCORS: true,
        // Ensure the canvas captures the full scrollable area of the chart
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
    });
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'org-chart.png';
    link.href = image;
    link.click();
  };

  /** Wrapper to handle export click, checking for unlock status. */
  const handleExportClick = () => {
    setIsActionMenuOpen(false);
    if (isUnlocked) {
        setIsExportModalOpen(true);
    } else {
        setIsUnlockModalOpen(true);
    }
  };

  /** Handles the AI analysis request. */
  const handleRunAnalysis = async () => {
    if (!isUnlocked) {
        setIsUnlockModalOpen(true);
        return;
    }

    setIsAnalyzing(true);
    setAiAnalysis(null);
    setAiAnalysisError(null); // Clear any previous errors

    try {
        // Augment data with direct report counts for better analysis.
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
            const errorData = await response.json();
            throw new Error(errorData.error || `API request failed with status ${response.status}`);
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

  /** Smooth scroll handler for the "Get Started" button. */
  const handleGetStartedClick = () => {
    if (orgStructureRef.current) {
        // The sticky header is 64px (h-16). We add extra space for better visual alignment.
        const headerOffset = 80;
        const elementPosition = orgStructureRef.current.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
  };

  // --- Animation Variants ---
  const mainContainerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  // --- Render ---
  return (
    <div className="min-h-screen text-gray-200 p-4 sm:p-6 lg:p-8">
      {/* The sticky header is rendered conditionally when the user scrolls past the main header. */}
      <AnimatePresence>
        {isStickyHeaderVisible && (
            <StickyHeader
                isUnlocked={isUnlocked}
                isActionMenuOpen={isActionMenuOpen}
                setIsActionMenuOpen={setIsActionMenuOpen}
                onExportClick={handleExportClick}
                onLoadSampleData={loadSampleData}
                onAddRootRole={handleAddRootRole}
                onDeleteAll={() => setIsDeleteAllConfirmOpen(true)}
                onSignInClick={() => setIsUnlockModalOpen(true)}
                autosaveStatus={autosaveStatus}
                onUndo={handleUndo}
                canUndo={history.length > 0}
            />
        )}
      </AnimatePresence>
      <div className="max-w-7xl mx-auto">
        {/* --- Hero/Header Section --- */}
        <header className="text-center" style={{ margin: '2rem 0 6rem 0' }}>
            <div ref={logoRef} className="font-parkinsans" style={{ fontSize: '1.5rem', marginBottom: '4.5rem' }}>
                <span className="text-brand-accent">Team</span><span className="text-white">Ledger</span>
            </div>
            <h1 className="font-bold text-white max-w-4xl mx-auto text-4xl sm:text-5xl lg:text-[3.35rem] leading-[1.15] sm:leading-[1.15]">
              Plan your growth confidently with a smarter organizational structure chart maker.
            </h1>
            <p className="text-gray-300 mt-4 max-w-3xl mx-auto" style={{ fontSize: '1.15rem' }}>
                TeamLedger is a free org chart and financial forecasting tool that combines team structure and financial data. Model your growth, see the impact of every role, and get AI-powered insights to operate with confidence.
            </p>
            <div className="mt-8">
                <motion.button
                    onClick={handleGetStartedClick}
                    className="bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-bold py-3 px-8 rounded-lg transition-colors duration-200 text-lg shadow-soft-glow"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Get Started
                </motion.button>
            </div>
        </header>

        {/* --- Main Content --- */}
        <motion.main 
          id="main-content"
          className="space-y-12"
          variants={mainContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* --- Organizational Structure Section --- */}
          <motion.div variants={itemVariants} ref={orgStructureRef}>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-semibold">Organizational Structure</h2>
                {/* View switcher: Tree vs. List */}
                <div role="tablist" aria-label="Chart view" className="flex items-center rounded-lg bg-brand-surface p-1 border border-brand-border">
                  <button role="tab" aria-selected={chartView === 'tree'} onClick={() => setChartView('tree')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${chartView === 'tree' ? 'bg-brand-accent/80 text-gray-900' : 'text-gray-400 hover:bg-gray-700'}`}>Tree</button>
                  <button role="tab" aria-selected={chartView === 'list'} onClick={() => setChartView('list')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${chartView === 'list' ? 'bg-brand-accent/80 text-gray-900' : 'text-gray-400 hover:bg-gray-700'}`}>List</button>
                </div>
              </div>
              <button
                onClick={() => setIsHelpModalOpen(true)}
                className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                aria-label="How to use this section"
              >
                  <QuestionMarkCircleIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="bg-brand-surface/50 p-4 rounded-lg border border-brand-border overflow-x-auto relative min-h-[200px]">
              {isShowingSampleData && isSampleNoticeVisible && (
                <div className="absolute top-5 right-5 bg-yellow-900/60 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg text-sm max-w-xs shadow-lg backdrop-blur-sm z-10">
                  <button
                      onClick={() => setIsSampleNoticeVisible(false)}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-yellow-800 hover:bg-yellow-700 transition-colors"
                      aria-label="Dismiss notice"
                  >
                      <XIcon className="w-4 h-4 text-yellow-200" />
                  </button>
                  <p>
                    This is a sample org chart. Customize it, or{' '}
                    <button
                      onClick={() => setIsDeleteAllConfirmOpen(true)}
                      className="font-semibold underline hover:text-white transition-colors"
                    >
                      delete it to start from scratch
                    </button>
                    .
                  </p>
                </div>
              )}
              {/* Animated switch between Tree and List views */}
              <AnimatePresence mode="wait">
                  <motion.div
                      key={chartView}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                  >
                  {tree.length > 0 ? (
                    <>
                    {chartView === 'tree' ? (
                      <OrgChart 
                        tree={tree}
                        onAddSubordinate={handleOpenEditorForNew}
                        onEdit={handleEditPosition}
                        onDelete={deletePosition}
                        onDuplicate={handleDuplicatePosition}
                        captureRef={orgChartRef}
                      />
                    ) : (
                      <OrgChartListView
                        tree={tree}
                        onAddSubordinate={handleOpenEditorForNew}
                        onEdit={handleEditPosition}
                        onDelete={deletePosition}
                        onDuplicate={handleDuplicatePosition}
                      />
                    )}
                    </>
                  ) : (
                      // Empty state for the org chart
                      <div className="text-center text-gray-400 py-12 flex flex-col items-center">
                          <InformationCircleIcon className="w-16 h-16 text-gray-600 mb-4" />
                          <h3 className="text-lg font-semibold text-white">Your organizational chart is empty.</h3>
                          <p className="mt-2 max-w-sm">Create your first position to get started. A CEO or Founder is a great place to begin.</p>
                          <motion.button 
                              onClick={handleAddRootRole}
                              className="mt-6 bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-bold py-2 px-5 rounded-lg transition-colors duration-200 flex items-center"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                          >
                              <PlusIcon className="w-5 h-5 mr-2" />
                              Add First Role
                          </motion.button>
                      </div>
                  )}
                  </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
          
          {/* --- Financial Breakdown Section --- */}
          <motion.div variants={itemVariants}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Financial Breakdown</h2>
              <motion.button
                  onClick={() => setIsSettingsOpen(prev => !prev)}
                  aria-expanded={isSettingsOpen}
                  aria-controls="financial-settings-panel"
                  className="bg-brand-surface hover:bg-gray-800/60 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center border border-brand-border"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
              >
                  Settings
                  <motion.div animate={{ rotate: isSettingsOpen ? 180 : 0 }}>
                      <ChevronDownIcon className="w-5 h-5 ml-2 -mr-1" />
                  </motion.div>
              </motion.button>
            </div>
            {/* Collapsible settings panel */}
            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  id="financial-settings-panel"
                  initial={{ maxHeight: 0, opacity: 0 }}
                  animate={{ maxHeight: '800px', opacity: 1, transition: { opacity: { duration: 0.3, delay: 0.1 } } }}
                  exit={{ maxHeight: 0, opacity: 0, transition: { opacity: { duration: 0.2 } } }}
                  className="overflow-hidden"
                >
                  <div className="bg-brand-surface/50 p-6 rounded-lg border border-brand-border mb-4">
                    <h3 className="text-lg font-semibold mb-4 text-white">Global Financial Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                      
                      {/* --- Multipliers --- */}
                      <div>
                        <label htmlFor="benefits-percent" className="block text-sm font-medium text-gray-300">Total Salary Multiplier</label>
                        <p className="mt-1 text-xs text-gray-400">Accounts for benefits, taxes, etc.</p>
                        <div className="mt-2 flex rounded-md shadow-sm">
                          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-brand-border bg-gray-700 text-gray-300 sm:text-sm">Salary +</span>
                          <input type="number" id="benefits-percent" value={benefitsInput} onChange={e => setBenefitsInput(e.target.value)} className="block w-full flex-1 rounded-none bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                          <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-brand-border bg-gray-700 text-gray-300 sm:text-sm">%</span>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="overhead-percent" className="block text-sm font-medium text-gray-300">Overhead Cost Multiplier</label>
                        <p className="mt-1 text-xs text-gray-400">Accounts for rent, software, etc.</p>
                        <div className="mt-2 flex rounded-md shadow-sm">
                          <input type="number" id="overhead-percent" value={overheadInput} onChange={e => setOverheadInput(e.target.value)} className="block w-full flex-1 rounded-none rounded-l-md bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                          <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-brand-border bg-gray-700 text-gray-300 sm:text-sm">% of Total Salary</span>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="work-week-hours" className="block text-sm font-medium text-gray-300">Work Week (Hours)</label>
                        <p className="mt-1 text-xs text-gray-400">Affects Revenue totals.</p>
                        <div className="mt-2 flex rounded-md shadow-sm">
                          <input type="number" id="work-week-hours" value={workWeekHoursInput} onChange={e => setWorkWeekHoursInput(e.target.value)} className="block w-full flex-1 rounded-md bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                        </div>
                      </div>
                      
                      {/* --- Global Overwrites --- */}
                      <div className="md:col-span-2 lg:col-span-3 border-t border-brand-border pt-6 mt-2">
                        <h4 className="text-md font-semibold mb-3 text-white">Global Overwrites</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div>
                                <label htmlFor="global-rate" className="block text-sm font-medium text-gray-300">Global Rate ($/hr)</label>
                                <p className="mt-1 text-xs text-gray-400">Applies a single rate to all billable roles.</p>
                                <div className="mt-2 flex">
                                    <input type="number" id="global-rate" value={globalRate} onChange={e => setGlobalRate(e.target.value)} placeholder="e.g., 200" className="block w-full flex-1 rounded-none rounded-l-md bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                                    <button onClick={handleApplyGlobalRate} className="px-4 py-2 bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-semibold rounded-r-md text-sm transition-colors disabled:opacity-50" disabled={!globalRate}>Apply</button>
                                </div>
                            </div>
                             <div>
                                <label htmlFor="global-utilization" className="block text-sm font-medium text-gray-300">Global Utilization (%)</label>
                                <p className="mt-1 text-xs text-gray-400">Applies a single utilization to all billable roles.</p>
                                <div className="mt-2 flex">
                                    <input type="number" id="global-utilization" value={globalUtilization} onChange={e => setGlobalUtilization(e.target.value)} placeholder="e.g., 80" className="block w-full flex-1 rounded-none rounded-l-md bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                                    <button onClick={handleApplyGlobalUtilization} className="px-4 py-2 bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-semibold rounded-r-md text-sm transition-colors disabled:opacity-50" disabled={!globalUtilization}>Apply</button>
                                </div>
                            </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <SummaryTable 
              positions={positions} 
              onUpdatePosition={updatePosition} 
              onAddSubordinate={handleOpenEditorForNew}
              onEdit={handleEditPosition}
              onDelete={deletePosition}
              onDuplicate={handleDuplicatePosition}
              isUnlocked={isUnlocked}
              onUnlockRequest={() => setIsUnlockModalOpen(true)}
            />
          </motion.div>
          
          {/* --- AI Analysis Section --- */}
          <motion.div variants={itemVariants}>
            <AIAnalysis
                isUnlocked={isUnlocked}
                onRunAnalysis={handleRunAnalysis}
                analysisResult={aiAnalysis}
                isAnalyzing={isAnalyzing}
                aiAnalysisError={aiAnalysisError} // Pass the new error state
                onUnlockRequest={() => setIsUnlockModalOpen(true)}
            />
          </motion.div>

          {/* --- Content/About Section --- */}
          <motion.div variants={itemVariants} className="pt-16 pb-8">
              <div className="max-w-3xl mx-auto text-left space-y-12">
                  <h2 className="text-3xl font-bold mb-0 text-white text-center">About TeamLedger</h2>
                  <section>
                      <h3 className="text-2xl font-semibold mb-4 text-white">Why use TeamLedger as an organizational structure chart maker?</h3>
                      <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                          Most org chart tools stop at boxes and lines. This one goes further, tying each role to salary, utilization, and overhead so you can see how your structure affects profitability.
                      </p>
                      <p className="text-gray-300 mt-4" style={{ fontSize: '1.15rem' }}>
                          Whether you’re mapping a five-person startup or a fifty-person agency, this organizational structure chart maker gives you the full picture: who reports to whom, what each role costs, and how changes ripple through your financial model.
                      </p>
                  </section>
                  
                  <section>
                      <h3 className="text-2xl font-semibold mb-4 text-white">What Does TeamLedger Do?</h3>
                      <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                          With this free organizational structure chart maker, you can:
                      </p>
                      <ul className="list-disc list-inside text-gray-300 mt-4 space-y-2" style={{ fontSize: '1.15rem' }}>
                          <li>Build your team structure visually. Create, update, delete, and organize roles into clear hierarchies.</li>
                          <li>Attach financial data. Add salaries, billable rates, and capacity to every seat. Real costs are automatically calculated.</li>
                          <li>Plan future hires. Model “what-if” scenarios before you make your next hire.</li>
                      </ul>
                      <p className="text-gray-300 mt-4" style={{ fontSize: '1.15rem' }}>
                          It’s not just an organizational structure chart maker — it’s a planning tool for smarter growth.
                      </p>
                  </section>

                  <section>
                      <h3 className="text-2xl font-semibold mb-4 text-white">Who is this organizational structure chart maker for?</h3>
                      <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                          TeamLedger is great for:
                      </p>
                      <ul className="list-disc list-inside text-gray-300 mt-4 space-y-2" style={{ fontSize: '1.15rem' }}>
                          <li>Agency owners who want to balance creative growth with profit.</li>
                          <li>Any service businesses who bill by the hour, or by fixed price.</li>
                          <li>Business consultants who help with structure, growth, and forecasting.</li>
                          <li>Startup founders mapping their first org structure.</li>
                          <li>Operations leaders looking for improved department fiscal understanding.</li>
                      </ul>
                      <p className="text-gray-300 mt-4" style={{ fontSize: '1.15rem' }}>
                          If you care about both structure and sustainability, this tool was built for you.
                      </p>
                  </section>
                  <section>
                      <h3 className="text-2xl font-semibold mb-4 text-white">Who built TeamLedger?</h3>
                      <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                          TeamLedger is a fun project by me, Jeff Archibald. I'm an <a href="https://jeffarchibald.ca" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">agency consultant</a> who primarily works with creative firms and service businesses. I used a janky spreadsheet in the past to do this type of work, so I figured I'd try building a nicer web version of it. Tada! This is an MVP I hacked together over a weekend; if you'd like to request some features or whatever, use the Feedback button on the right.
                      </p>
                  </section>
              </div>
          </motion.div>
        </motion.main>
        {/* --- Footer --- */}
        <footer className="text-center pt-8 pb-4 mt-8 border-t border-brand-border/20">
            <p className="text-sm text-gray-400">
                &copy; {new Date().getFullYear()} TeamLedger by <a href="https://jeffarchibald.ca" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">Jeff Archibald</a>.
                {' '}|{' '}
                <button onClick={() => setIsPrivacyModalOpen(true)} className="hover:underline">
                    Privacy Policy
                </button>
            </p>
        </footer>
      </div>

      {/* --- Modals & Global UI Components --- */}
      {/* These components are rendered outside the main layout flow and are controlled by state. */}
      
      {/* Position Editor Modal */}
      <AnimatePresence>
        {isEditorOpen && (
          <PositionEditor
            onClose={handleCloseEditor}
            onSave={handleSavePosition}
            existingPosition={editingPosition}
            positions={positions}
            parentId={newPositionParentId}
            duplicateSource={duplicateSource}
            isOpen={isEditorOpen}
          />
        )}
      </AnimatePresence>

      {/* Confirm Delete All Modal */}
      <AnimatePresence>
        {isDeleteAllConfirmOpen && (
           <ConfirmDeleteModal 
              isOpen={isDeleteAllConfirmOpen}
              onClose={() => setIsDeleteAllConfirmOpen(false)}
              onConfirm={deleteAllPositions}
           />
        )}
      </AnimatePresence>

      {/* Export/Share Modal */}
      <AnimatePresence>
        {isExportModalOpen && (
           <ExportModal 
              isOpen={isExportModalOpen}
              onClose={() => setIsExportModalOpen(false)}
              onConfirm={handleExport}
              onDownloadPng={handleDownloadPng}
              isPngExportAvailable={chartView === 'tree'}
           />
        )}
      </AnimatePresence>

      {/* Unlock Features Modal */}
      <AnimatePresence>
        {isUnlockModalOpen && (
            <UnlockModal
                isOpen={isUnlockModalOpen} 
                onClose={() => setIsUnlockModalOpen(false)}
                onUnlockSuccess={() => {
                    setIsUnlockModalOpen(false);
                    setShowUnlockToast(true);
                }}
            />
        )}
      </AnimatePresence>
      
      {/* Help Modal */}
      <AnimatePresence>
        {isHelpModalOpen && (
            <HelpModal 
                isOpen={isHelpModalOpen}
                onClose={() => setIsHelpModalOpen(false)}
                isShowingSampleData={isShowingSampleData}
            />
        )}
      </AnimatePresence>

      {/* Privacy Policy Modal */}
      <AnimatePresence>
        {isPrivacyModalOpen && (
            <PrivacyPolicyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
        )}
      </AnimatePresence>

      {/* Success Toast Notification */}
      <AnimatePresence>
        {showUnlockToast && <SuccessToast />}
      </AnimatePresence>
      
      {/* Cookie Consent Banner */}
      <CookieConsent onPrivacyClick={() => setIsPrivacyModalOpen(true)} />
      
      {/* Mobile Notice Banner */}
      <MobileNotice />
    </div>
  );
};

export default App;