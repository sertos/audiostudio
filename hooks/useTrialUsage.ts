import { useState, useEffect, useCallback } from "react";

const MAX_TRIALS = 5;
const STORAGE_KEY = "solvra_audio_trial_usage";

export const useTrialUsage = () => {
  const [usedTrials, setUsedTrials] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        return isNaN(parsed) ? 0 : Math.min(parsed, MAX_TRIALS);
      }
    } catch {
      // ignore
    }
    return 0;
  });

  const [showTrialLimitModal, setShowTrialLimitModal] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, usedTrials.toString());
    } catch {
      // ignore
    }
  }, [usedTrials]);

  const remainingTrials = Math.max(0, MAX_TRIALS - usedTrials);
  const isTrialExhausted = remainingTrials <= 0;
  const isTrialMode = true; // Trial mode flag active to enforce download restrictions

  const consumeTrial = useCallback((): boolean => {
    if (usedTrials >= MAX_TRIALS) {
      setShowTrialLimitModal(true);
      return false; // Cannot consume, limit reached
    }

    setUsedTrials((prev) => {
      const next = prev + 1;
      return next;
    });
    return true;
  }, [usedTrials]);

  const resetTrials = useCallback(() => {
    setUsedTrials(0);
    setShowTrialLimitModal(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    usedTrials,
    remainingTrials,
    maxTrials: MAX_TRIALS,
    isTrialExhausted,
    isTrialMode,
    consumeTrial,
    resetTrials,
    showTrialLimitModal,
    setShowTrialLimitModal,
  };
};
