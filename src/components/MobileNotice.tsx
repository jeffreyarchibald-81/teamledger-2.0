import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, DevicePhoneMobileIcon } from './icons';
import { MOBILE_NOTICE_DISMISSED_KEY } from '../constants';

/**
 * @description A dismissible banner that appears at the bottom of the screen on mobile devices,
 * advising the user that the application is best experienced on a desktop.
 * It uses local storage to ensure it is only shown once.
 */
const MobileNotice: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    /** Effect to determine if the notice should be shown on component mount. */
    useEffect(() => {
        try {
            // Use User Agent sniffing for more reliable mobile/tablet detection,
            // preventing the notice from appearing on resized desktop windows.
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const hasBeenDismissed = window.localStorage.getItem(MOBILE_NOTICE_DISMISSED_KEY) === 'true';

            if (isMobileDevice && !hasBeenDismissed) {
                setIsVisible(true);
            }
        } catch (error) {
            console.error("Could not access localStorage for mobile notice:", error);
        }
    }, []);

    /** Handles dismissing the notice and saving the preference to local storage. */
    const handleDismiss = () => {
        try {
            window.localStorage.setItem(MOBILE_NOTICE_DISMISSED_KEY, 'true');
            setIsVisible(false);
        } catch (error) {
            console.error("Could not write to localStorage for mobile notice:", error);
            // Hide for the current session even if storage fails.
            setIsVisible(false);
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed bottom-0 left-0 right-0 bg-brand-surface/90 backdrop-blur-md border-t border-brand-border p-4 z-[95] flex items-center justify-between gap-4"
                    initial={{ y: '100%' }}
                    animate={{ y: '0%' }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                    <div className="flex items-center">
                        <DevicePhoneMobileIcon className="w-8 h-8 sm:w-6 sm:h-6 mr-3 text-brand-accent flex-shrink-0" />
                        <p className="text-sm text-gray-300">
                            For the best experience, we recommend using TeamLedger on a desktop.
                        </p>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="p-1.5 rounded-full hover:bg-gray-700 transition-colors flex-shrink-0"
                        aria-label="Dismiss notice"
                    >
                        <XIcon className="w-5 h-5 text-gray-400" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MobileNotice;