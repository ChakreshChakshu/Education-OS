'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';

interface ParallaxComponentProps {
  title?: string;
  subtitle?: string;
  badge?: string;
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
          start: "0% 0%",
          end: "100% 0%",
          scrub: 0
        }
      });

      const layers = [
        { layer: "1", yPercent: 60 },
        { layer: "2", yPercent: 40 },
        { layer: "3", yPercent: 25 },
        { layer: "4", yPercent: 10 }
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

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
    });

    lenis.on('scroll', ScrollTrigger.update);
    const ticker = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    return () => {
      ScrollTrigger.getAll().forEach((st: ScrollTrigger) => st.kill());
      if (triggerElement) {
        gsap.killTweensOf(triggerElement);
      }
      gsap.ticker.remove(ticker);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="parallax relative w-full overflow-hidden" ref={parallaxRef}>
      <section className="parallax__header relative w-full h-[85vh] min-h-[640px] max-h-[920px] overflow-hidden">
        <div className="parallax__visuals absolute inset-0 w-full h-full">
          <div className="parallax__black-line-overflow absolute top-0 left-0 w-full h-[1px] bg-border/40 z-10" />
          
          <div data-parallax-layers className="parallax__layers relative w-full h-full overflow-hidden">
            {/* Layer 1: Far Background Horizon */}
            <div data-parallax-layer="1" className="absolute inset-0 w-full h-[120%] -top-[10%] opacity-40 mix-blend-luminosity">
              <img
                src={images.layer1}
                loading="eager"
                alt="University Architecture"
                className="w-full h-full object-cover filter brightness-75 contrast-125"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/40 to-background" />
            </div>

            {/* Layer 2: Mid-ground Campus Aura */}
            <div data-parallax-layer="2" className="absolute inset-x-0 bottom-0 h-[85%] flex items-center justify-center opacity-30 pointer-events-none">
              <div className="w-[800px] h-[450px] rounded-full bg-electric-indigo-500/20 blur-[130px]" />
              <div className="w-[500px] h-[300px] rounded-full bg-medium-slate-blue-500/20 blur-[100px]" />
            </div>

            {/* Layer 3: Title & Hero Centerpiece */}
            <div data-parallax-layer="3" className="parallax__layer-title absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6 pointer-events-auto">
              {badge && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/80 backdrop-blur-md border border-electric-indigo-500/30 text-xs md:text-sm font-medium text-foreground mb-6 shadow-lg shadow-electric-indigo-500/10">
                  <span className="h-2 w-2 rounded-full bg-electric-indigo-400 animate-ping" />
                  <span>{badge}</span>
                </div>
              )}

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight font-heading max-w-5xl leading-[1.08] text-foreground drop-shadow-md">
                {title}{" "}
                <span className="bg-gradient-to-r from-electric-indigo-400 via-medium-slate-blue-300 to-lavender-mist-300 bg-clip-text text-transparent block sm:inline">
                  {subtitle}
                </span>
              </h1>

              {children}
            </div>

            {/* Layer 4: Foreground Floating Glass Badges / Cards */}
            <div data-parallax-layer="4" className="absolute inset-x-0 bottom-12 z-30 pointer-events-none max-w-5xl mx-auto px-6 hidden md:grid grid-cols-3 gap-6">
              <div className="p-4 rounded-2xl bg-card/85 backdrop-blur-xl border border-border/80 shadow-2xl transform -rotate-1 hover:rotate-0 transition-transform">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Student Privacy</div>
                <div className="text-sm font-bold text-foreground mt-0.5">100% Protected Campus Records</div>
              </div>
              <div className="p-4 rounded-2xl bg-card/85 backdrop-blur-xl border border-electric-indigo-500/40 shadow-2xl transform translate-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-electric-indigo-300">Smooth Classroom Streaming</div>
                <div className="text-sm font-bold text-foreground mt-0.5">Buffer-Free HD Video Lectures</div>
              </div>
              <div className="p-4 rounded-2xl bg-card/85 backdrop-blur-xl border border-border/80 shadow-2xl transform rotate-1 hover:rotate-0 transition-transform">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Exam Reliability</div>
                <div className="text-sm font-bold text-foreground mt-0.5">99.99% Stress-Free Finals</div>
              </div>
            </div>
          </div>

          {/* Fade transition into page content */}
          <div className="parallax__fade absolute bottom-0 left-0 w-full h-36 bg-gradient-to-t from-background via-background/70 to-transparent pointer-events-none z-40" />
        </div>
      </section>

      {/* Parallax Content Section */}
      <section className="parallax__content relative z-40">
        {/* Slot for downstream sections */}
      </section>
    </div>
  );
}
