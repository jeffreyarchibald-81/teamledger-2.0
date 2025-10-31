import React, { useEffect } from 'react';

/**
 * A custom hook to manage accessibility for modals. It handles:
 * - Trapping focus within the modal.
 * - Closing the modal when the Escape key is pressed.
 * @param isOpen - Boolean indicating if the modal is open.
 * @param onClose - Callback function to close the modal.
 * @param modalRef - A React ref attached to the modal's root element.
 */
export const useAccessibilityModal = (isOpen: boolean, onClose: () => void, modalRef: React.RefObject<HTMLElement>) => {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        const handleFocusTrap = (event: KeyboardEvent) => {
            if (event.key !== 'Tab' || !modalRef.current) return;

            const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey) { // Shift + Tab
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    event.preventDefault();
                }
            } else { // Tab
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    event.preventDefault();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keydown', handleFocusTrap);
        
        // Focus the first focusable element in the modal when it opens
        const firstFocusable = modalRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        firstFocusable?.focus();

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keydown', handleFocusTrap);
        };
    }, [isOpen, onClose, modalRef]);
};
