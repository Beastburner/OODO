/**
 * Insight Observer Initialization Component
 * 
 * Initializes the insight observer when an admin is logged in.
 * This component should be mounted once in the app (e.g., in Dashboard).
 */

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { initializeInsightObservers } from '@/services/insightObserver';

export default function InsightObserverInit() {
  const { role } = useAuth();

  useEffect(() => {
    // Only initialize observers for admin users
    if (role !== 'admin') {
      return;
    }

    // Initialize observers
    const cleanup = initializeInsightObservers();

    // Cleanup on unmount
    return cleanup;
  }, [role]);

  // This component doesn't render anything
  return null;
}

