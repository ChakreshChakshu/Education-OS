"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface TimelineStep {
  step: number;
  title: string;
  description: string;
}

const STEPS: TimelineStep[] = [
  {
    step: 1,
    title: "Understand",
    description: "Clarify the people, process, and outcome that matter.",
  },
  {
    step: 2,
    title: "Shape",
    description: "Turn the right idea into a focused plan and interface.",
  },
  {
    step: 3,
    title: "Build",
    description: "Deliver the smallest reliable version with feedback built in.",
  },
  {
    step: 4,
    title: "Improve",
    description: "Measure the result and strengthen what is already working.",
  },
];

export default function RapidOnboardingTimeline() {
  return (
    <section id="setup" className="py-20 md:py-28 border-t border-border bg-background overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Framework Header & Copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="lg:col-span-5 space-y-4 lg:sticky lg:top-28"
          >
            <span className="text-xs font-mono font-bold tracking-[0.2em] uppercase text-primary block">
              Delivery Framework
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              A delivery rhythm your team can follow.
            </h2>

            <p className="text-base text-muted-foreground leading-relaxed pt-1 max-w-md">
              A clear sequence keeps strategic choices, practical implementation, and learning connected.
            </p>
          </motion.div>

          {/* Right Column: Animated Vertical Timeline */}
          <div className="lg:col-span-7 relative">
            {/* Continuous Vertical Timeline Line using Brand Primary Token */}
            <div className="absolute left-[19px] sm:left-[21px] top-6 bottom-6 w-[2.5px] bg-primary/25 -translate-x-1/2 rounded-full overflow-hidden">
              <motion.div
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className="w-full h-full bg-primary origin-top"
              />
            </div>

            {/* Timeline Steps List */}
            <div className="space-y-6 sm:space-y-8">
              {STEPS.map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: 28 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.14,
                    ease: "easeOut",
                  }}
                  className="relative flex items-center gap-5 sm:gap-7 group"
                >
                  {/* Numbered Circle Indicator using Brand Primary & Foreground */}
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.14 + 0.1,
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                    }}
                    className="relative z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm sm:text-base shrink-0 shadow-sm ring-4 ring-background"
                  >
                    {item.step}
                  </motion.div>

                  {/* Step Card using Brand Semantic Tokens */}
                  <motion.div
                    whileHover={{ x: 4, transition: { duration: 0.2 } }}
                    className="flex-1 rounded-2xl border border-border bg-card/80 backdrop-blur-md p-5 sm:p-6 shadow-xs hover:border-primary/50 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                        {item.title}
                      </h3>
                    </div>

                    <p className="mt-2 text-sm sm:text-[15px] text-muted-foreground leading-relaxed pl-7">
                      {item.description}
                    </p>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
