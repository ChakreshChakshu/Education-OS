"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";

const CheckIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={cn("w-6 h-6 shrink-0", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
};

const CheckFilled = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("w-6 h-6 shrink-0", className)}
    >
      <path
        fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
        clipRule="evenodd"
      />
    </svg>
  );
};

export type LoadingState = {
  text: string;
};

export const LoaderCore = ({
  loadingStates,
  value = 0,
}: {
  loadingStates: LoadingState[];
  value?: number;
}) => {
  return (
    <div className="flex relative justify-start max-w-xl mx-auto flex-col mt-40 px-4">
      {loadingStates.map((loadingState, index) => {
        const distance = Math.abs(index - value);
        const opacity = Math.max(1 - distance * 0.25, 0.15);
        const isCurrent = value === index;
        const isCompleted = index < value;
        const isUpcoming = index > value;

        return (
          <motion.div
            key={index}
            className={cn("text-left flex items-center gap-3 mb-4 transition-colors")}
            initial={{ opacity: 0, y: -(value * 40) }}
            animate={{ opacity: opacity, y: -(value * 40) }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <div>
              {isUpcoming && (
                <CheckIcon className="text-zinc-400 dark:text-zinc-600" />
              )}
              {isCompleted && (
                <CheckFilled className="text-emerald-600 dark:text-emerald-400" />
              )}
              {isCurrent && (
                <CheckFilled className="text-indigo-600 dark:text-indigo-400" />
              )}
            </div>

            <span
              className={cn(
                "text-sm sm:text-base transition-colors",
                isUpcoming && "text-zinc-400 dark:text-zinc-500 font-normal",
                isCompleted && "text-zinc-700 dark:text-zinc-300 font-medium",
                isCurrent && "text-indigo-950 dark:text-indigo-200 font-extrabold text-base sm:text-lg"
              )}
            >
              {loadingState.text}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
};

export const MultiStepLoader = ({
  loadingStates,
  loading,
  duration = 2000,
  loop = true,
}: {
  loadingStates: LoadingState[];
  loading?: boolean;
  duration?: number;
  loop?: boolean;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
}) => {
  const [currentState, setCurrentState] = useState(0);

  useEffect(() => {
    if (!loading) {
      setCurrentState(0);
      return;
    }
    const timeout = setTimeout(() => {
      setCurrentState((prevState) =>
        loop
          ? prevState === loadingStates.length - 1
            ? 0
            : prevState + 1
          : Math.min(prevState + 1, loadingStates.length - 1)
      );
    }, duration);

    return () => clearTimeout(timeout);
  }, [currentState, loading, loop, loadingStates.length, duration]);

  return (
    <AnimatePresence mode="wait">
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full h-full fixed inset-0 z-[120] flex items-center justify-center bg-white/80 dark:bg-black/85 backdrop-blur-2xl"
        >
          {/* Active scrolling items container above mask */}
          <div className="h-96 relative z-30 w-full overflow-hidden flex items-center justify-center">
            <LoaderCore value={currentState} loadingStates={loadingStates} />
          </div>

          {/* Radial gradient mask placed behind text (z-10) with light and dark mode colors */}
          <div className="bg-gradient-to-t inset-x-0 z-10 bottom-0 bg-white/70 dark:bg-black/70 h-full absolute pointer-events-none [mask-image:radial-gradient(900px_at_center,transparent_30%,black)]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MultiStepLoader;
