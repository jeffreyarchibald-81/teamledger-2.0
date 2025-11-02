import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { Position, PositionInput, PositionUpdate, AIAnalysisResult } from './types'; // Keep types for modal props
import { useAuth } from './auth'; // Still need AuthContext for isUnlocked
import { useOrgChart, UseOrgChartReturn } from './hooks/useOrgChart'; // Import the new custom hook

// UI Components
import HeaderBar from './components/HeaderBar';
import OrgChartView from './components/OrgChartView';
import FinancialSummarySection from './components/FinancialSummarySection';
import AIAnalysisSection from './components/AIAnalysisSection';
import StickyHeader from './components/StickyHeader';
import CookieConsent from './components/CookieConsent';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import MobileNotice from './components/MobileNotice';

// Modal Components
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import UnlockModal from './components/UnlockModal';
import ExportModal from './components/ExportModal';
import SuccessToast from './components/SuccessToast';
// Fix: Import PositionEditor component
import PositionEditor from './components/PositionEditor';

/**
 * @description The main component for the TeamLedger application.
 * Now acts as a layout orchestrator, consuming state and logic from `useOrgChart`
 * and rendering modular UI sections and global modals.
 */
const App: React.FC = () => {
  // --- Core State & Logic from useOrgChart hook ---
  const {
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
  } : UseOrgChartReturn = useOrgChart();

  // --- Authentication State ---
  const { isUnlocked } = useAuth();

  // --- UI State (Modals & Menus) ---
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [newPositionParentId, setNewPositionParentId] = useState<string | null>(null);
  const [duplicateSource, setDuplicateSource] = useState<Position | null>(null);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [showUnlockToast, setShowUnlockToast] = useState(false);
  const [isStickyHeaderVisible, setIsStickyHeaderVisible] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [showMoreFAQs, setShowMoreFAQs] = useState(false); // New state for FAQs

  // --- Refs for DOM elements ---
  const orgChartRef = useRef<HTMLDivElement>(null);
  const orgStructureRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  
  // --- Effects ---

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

  // --- UI Event Handlers ---

  const handleOpenEditorForNew = (managerId: string | null) => {
    setEditingPosition(null);
    setDuplicateSource(null);
    setNewPositionParentId(managerId);
    setIsEditorOpen(true);
  };
  
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
                onLoadSampleData={() => { loadSampleData(); setIsActionMenuOpen(false); }}
                onAddRootRole={() => { handleOpenEditorForNew(null); setIsActionMenuOpen(false); }}
                onDeleteAll={() => { setIsDeleteAllConfirmOpen(true); setIsActionMenuOpen(false); }}
                onSignInClick={() => setIsUnlockModalOpen(true)}
                autosaveStatus={autosaveStatus}
                onUndo={handleUndo}
                canUndo={canUndo}
            />
        )}
      </AnimatePresence>
      <div className="max-w-7xl mx-auto">
        {/* --- Hero/Header Section --- */}
        <HeaderBar logoRef={logoRef} orgStructureRef={orgStructureRef} />

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
            <OrgChartView 
              tree={tree}
              onAddSubordinate={handleOpenEditorForNew}
              onEdit={handleEditPosition}
              onDelete={deletePosition}
              onDuplicate={handleDuplicatePosition}
              isShowingSampleData={isShowingSampleData}
              isSampleNoticeVisible={isSampleNoticeVisible}
              setIsSampleNoticeVisible={setIsSampleNoticeVisible}
              handleAddRootRole={() => handleOpenEditorForNew(null)}
              setIsDeleteAllConfirmOpen={setIsDeleteAllConfirmOpen}
              captureRef={orgChartRef}
            />
          </motion.div>
          
          {/* --- Financial Breakdown Section --- */}
          <motion.div variants={itemVariants}>
            <FinancialSummarySection
              positions={positions}
              onUpdatePosition={updatePosition}
              onAddSubordinate={handleOpenEditorForNew}
              onEdit={handleEditPosition}
              onDelete={deletePosition}
              onDuplicate={handleDuplicatePosition}
              isUnlocked={isUnlocked}
              onUnlockRequest={() => setIsUnlockModalOpen(true)}
              benefitsInput={benefitsInput}
              setBenefitsInput={setBenefitsInput}
              overheadInput={overheadInput}
              setOverheadInput={setOverheadInput}
              workWeekHoursInput={workWeekHoursInput}
              setWorkWeekHoursInput={setWorkWeekHoursInput}
              globalRate={globalRate}
              setGlobalRate={setGlobalRate}
              handleApplyGlobalRate={handleApplyGlobalRate}
              globalUtilization={globalUtilization}
              setGlobalUtilization={setGlobalUtilization}
              handleApplyGlobalUtilization={handleApplyGlobalUtilization}
            />
          </motion.div>
          
          {/* --- AI Analysis Section --- */}
          <motion.div variants={itemVariants}>
            <AIAnalysisSection
                isUnlocked={isUnlocked}
                onRunAnalysis={handleRunAnalysis}
                analysisResult={aiAnalysis}
                isAnalyzing={isAnalyzing}
                aiAnalysisError={aiAnalysisError}
                onUnlockRequest={() => setIsUnlockModalOpen(true)}
                remainingAnalyses={remainingAnalyses}
                resetTimeMessage={resetTimeMessage}
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
                          Whether you’re mapping a five-person ad agency or a forty-person development firm, this organizational structure chart maker gives you the full picture: who reports to whom, what each role costs, and how changes ripple through your financial model.
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

                  {/* New FAQs, conditionally rendered */}
                  <AnimatePresence>
                    {showMoreFAQs && (
                      <motion.div
                        id="more-faqs-content"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden space-y-12" // space-y-12 to match outer container spacing
                      >
                        <section>
                            <h3 className="text-2xl font-semibold mb-4 text-white">How do I create an organizational chart?</h3>
                            <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                                Start by listing every role, the person in the role, and who each role reports to. Choose a tool: for a one-off, PowerPoint or Google Slides works; for something living, use specific organizational structure chart makers like TeamLedger. Import or enter your people/roles, assign managers, and let the tool auto-lay out the hierarchy. Keep job titles consistent, group by function, and publish a link so the team can access the latest version. Review and update whenever roles change.
                            </p>
                        </section>
                        <section>
                            <h3 className="text-2xl font-semibold mb-4 text-white">Can I build an org chart in Excel?</h3>
                            <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                                Yes. Use SmartArt → Hierarchy or insert shapes and connectors. It’s fine for small teams, but it becomes tedious as things change. Tools like TeamLedger are much easier for creating and managing org charts, and can tie in financial data too.
                            </p>
                        </section>
                        <section>
                            <h3 className="text-2xl font-semibold mb-4 text-white">What are common org chart mistakes?</h3>
                            <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                                Overstuffing with detail, missing key roles, unclear reporting lines, outdated information, and designing around names instead of roles. 
                            </p>
                        </section>
                        <section>
                            <h3 className="text-2xl font-semibold mb-4 text-white">Is there an org chart template?</h3>
                            <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                                Most office apps include basic hierarchy templates. They’re good starters but limited. Specific organizational structure chart makers like TeamLedger start with a dynamic template that adapts to different team models and scale as you grow.
                            </p>
                        </section>
                        <section>
                            <h3 className="text-2xl font-semibold mb-4 text-white">What is the easiest organizational chart maker?</h3>
                            <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                                For quick visuals, PowerPoint, Google Slides, or Lucidchart are simple. If you want something that stays current without manual formatting, tools like TeamLedger are easier long term because they build the chart from your role and reporting data.
                            </p>
                        </section>
                        <section>
                            <h3 className="text-2xl font-semibold mb-4 text-white">Does PowerPoint have an org chart template?</h3>
                            <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                                Yes. Insert → SmartArt → Hierarchy. It’s fast, but static. Tools like TeamLedger (or other org chart tools) create interactive charts you can update without re-drawing.
                            </p>
                        </section>
                        <section>
                            <h3 className="text-2xl font-semibold mb-4 text-white">How do I convert Excel to organization chart?</h3>
                            <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                                Use Excel’s SmartArt to map your data, or import a CSV into a diagramming app. The fastest route is uploading a spreadsheet (name, title, manager) into tools like TeamLedger, which instantly generates a navigable org chart (future feature).
                            </p>
                        </section>
                        <section>
                            <h3 className="text-2xl font-semibold mb-4 text-white">What does a good organizational chart look like?</h3>
                            <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                                It’s readable at a glance, shows clean reporting lines, groups by function, and matches the current team. It’s easy to search and share, and it updates as roles change. 
                            </p>
                        </section>
                        <section>
                            <h3 className="text-2xl font-semibold mb-4 text-white">What is the best Microsoft tool for org charts?</h3>
                            <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                                For advanced, data-linked diagrams, Visio. For quick or occasional charts, PowerPoint or Excel. If you want an always-up-to-date, shareable chart without manual formatting, consider web-based tools like TeamLedger alongside Microsoft apps.
                            </p>
                        </section>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* New "More" button for FAQs - MOVED TO THE BOTTOM */}
                  <div className="text-center mt-12"> {/* Added mt-12 for spacing */}
                    <motion.button
                      onClick={() => setShowMoreFAQs(prev => !prev)}
                      className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-5 rounded-lg transition-colors duration-200"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      aria-expanded={showMoreFAQs}
                      aria-controls="more-faqs-content"
                    >
                      {showMoreFAQs ? 'Show Less FAQs' : 'Show More FAQs'}
                    </motion.button>
                  </div>
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
              isPngExportAvailable={true} // PNG export is always available for tree view in new structure
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