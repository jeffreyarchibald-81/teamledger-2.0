import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { AUTH_STORAGE_KEY, FORMSPREE_FORM_ENDPOINT } from './constants';

/**
 * @interface AuthContextType
 * @description Defines the shape of the authentication context provided to the app.
 */
interface AuthContextType {
  /** A boolean indicating if the user has unlocked the premium features. */
  isUnlocked: boolean;
  /**
   * A function to unlock the app. In production, it sends the user's email to a
   * third-party service (Formspree). In development, it simulates this process.
   * @param email The user's email address.
   * @returns A promise that resolves to an object indicating success or failure.
   */
  unlockApp: (email: string) => Promise<{ success: boolean; message?: string }>;
}

/**
 * React Context for managing the application's authentication state.
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * @description Provides authentication state (`isUnlocked`) and the `unlockApp` function
 * to its children. It handles the persistence of the unlocked status in local storage.
 * @param {object} props - The component props.
 * @param {ReactNode} props.children - The child components to render.
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    // Initialize state from localStorage to persist unlock status across sessions.
    try {
      const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
      return storedValue === 'true';
    } catch (error) {
      console.error("Could not access localStorage:", error);
      return false;
    }
  });

  // Effect to update localStorage whenever the `isUnlocked` state changes.
  useEffect(() => {
    try {
      window.localStorage.setItem(AUTH_STORAGE_KEY, String(isUnlocked));
    } catch (error) { 
      console.error("Could not write to localStorage:", error);
    }
  }, [isUnlocked]);

  /**
   * Handles the application unlocking process. This function contains logic
   * to differentiate between the production environment and local development.
   */
  const unlockApp = async (email: string): Promise<{ success: boolean; message?: string }> => {
    // More specific production check. Only the live domain is considered production.
    const isProduction = window.location.hostname === 'teamledger.app';

    if (isProduction) {
      // --- PRODUCTION LOGIC ---
      // Submits the email to Formspree and handles the server's response.
      // Formspree is used here as a simple backend to capture emails.
      
      try {
        const response = await fetch(FORMSPREE_FORM_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        if (response.ok) {
          // If the submission is successful, unlock the app.
          console.log('Email submitted successfully to Formspree!');
          setIsUnlocked(true);
          return { success: true };
        }
        
        // If Formspree returns an error (e.g., validation), parse it and show it to the user.
        const errorData = await response.json();
        const errorMessage = errorData.errors?.[0]?.message || 'An unexpected error occurred. Please try again.';
        console.error('Formspree submission error:', errorData);
        return { success: false, message: errorMessage };
        
      } catch (error) {
        // Handle network errors.
        console.error('There was an error submitting the email:', error);
        return { success: false, message: 'Could not connect to the server. Please check your internet connection and try again.' };
      }
    } else {
      // --- DEVELOPMENT LOGIC ---
      // In development, we simulate the API call to avoid sending test emails.
      console.log(`--- DEVELOPMENT MODE: SIMULATING EMAIL CAPTURE ---`);
      console.log(`Email: ${email}`);
      console.log(`In production, this would be sent to your Formspree endpoint.`);
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
    
      // Automatically unlock the app in development.
      setIsUnlocked(true);
      return { success: true };
    }
  };

  return (
    <AuthContext.Provider value={{ isUnlocked, unlockApp }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * @description Custom hook to easily access the authentication context.
 * Throws an error if used outside of an `AuthProvider`.
 * @returns The authentication context value.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};