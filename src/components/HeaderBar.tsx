import React from 'react';
import { motion } from 'framer-motion';

/**
 * @interface HeaderBarProps
 * @description Defines the props for the HeaderBar component.
 */
interface HeaderBarProps {
  /** Ref to the logo element, used for detecting scroll position and showing/hiding the sticky header. */
  logoRef: React.RefObject<HTMLDivElement>;
  /** Ref to the organizational structure section, used for smooth scrolling. */
  orgStructureRef: React.RefObject<HTMLDivElement>;
}

/**
 * @description The main header component displaying the application's logo,
 * title, description, and a "Get Started" call-to-action button.
 * It's responsible for managing the scroll behavior for the "Get Started" button.
 */
const HeaderBar: React.FC<HeaderBarProps> = ({ logoRef, orgStructureRef }) => {
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

  return (
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
  );
};

export default HeaderBar;