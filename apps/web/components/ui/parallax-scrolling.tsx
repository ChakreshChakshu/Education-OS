'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface ParallaxComponentProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  showLiveDot?: boolean;
  images?: {
    layer1?: string;
    layer2?: string;
    layer4?: string;
  };
  children?: React.ReactNode;
}

export function ParallaxComponent({
  title = "EducationOS",
  subtitle = "The Unified Campus Platform",
  badge = "Autonomous Multi-Campus Architecture",
  showLiveDot = false,
  images = {
    layer1: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=80",
    layer2: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1400&q=80",
    layer4: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=80"
  },
  children
}: ParallaxComponentProps) {
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const triggerElement = parallaxRef.current?.querySelector('[data-parallax-layers]');

    if (triggerElement) {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: triggerElement,
          start: "top top",
          end: "bottom top",
          scrub: 1
        }
      });

      const layers = [
        { layer: "1", yPercent: 40 },
        { layer: "2", yPercent: 25 },
        { layer: "3", yPercent: 12 }
      ];

      layers.forEach((layerObj, idx) => {
        tl.to(
          triggerElement.querySelectorAll(`[data-parallax-layer="${layerObj.layer}"]`),
          {
            yPercent: layerObj.yPercent,
            ease: "none"
          },
          idx === 0 ? undefined : "<"
        );
      });
    }

    return () => {
      ScrollTrigger.getAll().forEach((st: ScrollTrigger) => st.kill());
      if (triggerElement) {
        gsap.killTweensOf(triggerElement);
      }
    };
  }, []);

  return (
    <div className="parallax relative w-full" ref={parallaxRef}>
      <section className="parallax__header relative w-full min-h-[85vh] py-16 sm:py-24 flex items-center justify-center overflow-hidden">
        <div className="parallax__visuals absolute inset-0 w-full h-full pointer-events-none">
          <div className="parallax__black-line-overflow absolute top-0 left-0 w-full h-[1px] bg-border/40 z-10" />
          
          <div data-parallax-layers className="parallax__layers relative w-full h-full overflow-hidden">
            {/* Layer 1: Far Background Horizon */}
            <div data-parallax-layer="1" className="absolute inset-0 w-full h-[120%] -top-[10%] opacity-40 mix-blend-luminosity">
              <img
                src={images.layer1}
                loading="eager"
                alt="University Architecture"
                className="w-full h-full object-cover filter contrast-110 opacity-25 dark:brightness-75 dark:contrast-125 dark:opacity-35"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/50 to-background" />
            </div>

            {/* Layer 2: Mid-ground Campus Aura */}
            <div data-parallax-layer="2" className="absolute inset-x-0 bottom-0 h-[85%] flex items-center justify-center opacity-30 pointer-events-none">
              <div className="w-[800px] h-[450px] rounded-full bg-electric-indigo-500/20 blur-[130px]" />
              <div className="w-[500px] h-[300px] rounded-full bg-medium-slate-blue-500/20 blur-[100px]" />
            </div>
          </div>

          {/* Fade transition into page content */}
          <div className="parallax__fade absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none z-20" />
        </div>

        {/* Content Layer: Title, Hero Centerpiece, and Cards */}
        <div data-parallax-layer="3" className="relative z-20 flex flex-col items-center justify-center text-center px-6 w-full max-w-5xl mx-auto">
          {badge && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/85 backdrop-blur-md border border-primary/30 text-xs md:text-sm font-medium text-foreground mb-6 shadow-sm">
              {showLiveDot && (
                <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
              )}
              <span>{badge}</span>
            </div>
          )}

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight font-heading max-w-5xl leading-[1.08] text-foreground drop-shadow-xs">
            {title}{" "}
            <span className="bg-gradient-to-r from-electric-indigo-600 via-medium-slate-blue-600 to-purple-600 dark:from-electric-indigo-400 dark:via-medium-slate-blue-300 dark:to-lavender-mist-300 bg-clip-text text-transparent block sm:inline">
              {subtitle}
            </span>
          </h1>

          {children}
        </div>
      </section>
    </div>
  );
}

export default ParallaxComponent;
