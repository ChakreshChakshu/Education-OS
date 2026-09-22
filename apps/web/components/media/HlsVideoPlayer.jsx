"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  SpeakerHigh,
  SpeakerSlash,
  CornersOut,
  CornersIn,
  Gear,
  Check,
  ArrowCounterClockwise,
  ArrowClockwise,
  Lightning
} from "@phosphor-icons/react";

export default function HlsVideoPlayer({
  src,
  poster,
  title = "Video Lesson",
  chapters = [],
  onTimeUpdate,
  onEnded,
  autoPlay = false,
  className = ""
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [centerBurst, setCenterBurst] = useState(null); // 'play' | 'pause' | null

  // HLS Quality state
  const [qualities, setQualities] = useState([]); // [{ index: -1, name: 'Auto' }, ...]
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 is auto
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsTab, setSettingsTab] = useState("main"); // 'main' | 'quality' | 'speed'

  // Format time MM:SS or HH:MM:SS
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === null) return "00:00";
    const s = Math.floor(seconds);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Initialize HLS.js or native playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Reset states
    setCurrentTime(0);
    setIsBuffering(true);

    const isHlsSource = src.includes(".m3u8") || src.includes("/hls/");

    if (isHlsSource && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setIsBuffering(false);
        const levels = data.levels.map((lvl, idx) => ({
          index: idx,
          name: `${lvl.height}p`,
          bitrate: lvl.bitrate
        }));
        // Deduplicate qualities if needed and sort descending
        const uniqueQualities = [
          { index: -1, name: "Auto" },
          ...levels.reverse()
        ];
        setQualities(uniqueQualities);
        if (autoPlay) {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        // Automatically updated level
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn("[HlsPlayer] Fatal network error, recovering...", data);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn("[HlsPlayer] Fatal media error, recovering...", data);
              hls.recoverMediaError();
              break;
            default:
              console.error("[HlsPlayer] Unrecoverable HLS error:", data);
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS for Safari/iOS
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        setIsBuffering(false);
        if (autoPlay) video.play().catch(() => {});
      });
    } else {
      // Direct MP4 playback fallback
      video.src = src;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, autoPlay]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (onTimeUpdate) onTimeUpdate(video.currentTime);
    };
    const handleDurationChange = () => setDuration(video.duration);
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("ended", handleEnded);
    };
  }, [onTimeUpdate, onEnded]);

  // Handle Play/Pause toggle with visual burst
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      video.play().catch(() => {});
      setCenterBurst("play");
    } else {
      video.pause();
      setCenterBurst("pause");
    }
    setTimeout(() => setCenterBurst(null), 500);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input or textarea
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;

      if (e.code === "Space" || e.key === "k") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "f") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "m") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekRelative(-5);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seekRelative(5);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay]);

  // Controls auto-hide on inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettingsMenu(false);
      }, 3000);
    }
  };

  const seekRelative = (delta) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(0, video.currentTime + delta), duration || video.duration);
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newRatio = Math.max(0, Math.min(1, clickX / rect.width));
    video.currentTime = newRatio * duration;
    setCurrentTime(video.currentTime);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
      video.volume = volume || 0.5;
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    setVolume(val);
    video.volume = val;
    setIsMuted(val === 0);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleQualityChange = (qIndex) => {
    setCurrentQuality(qIndex);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = qIndex;
    }
    setShowSettingsMenu(false);
    setSettingsTab("main");
  };

  const handleSpeedChange = (rate) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettingsMenu(false);
    setSettingsTab("main");
  };

  // External seek helper for parent components (e.g. clicking chapter)
  const seekTo = (seconds) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = seconds;
    if (!isPlaying) {
      video.play().catch(() => {});
    }
  };

  // Expose seekTo on container DOM element for parent usage
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.seekTo = seekTo;
    }
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
        setShowSettingsMenu(false);
      }}
      className={`group relative aspect-video w-full rounded-2xl overflow-hidden bg-[#0A0E14] select-none border border-white/10 shadow-2xl ${className}`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Center Play/Pause Burst Micro-interaction */}
      {centerBurst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="h-20 w-20 rounded-full bg-[#0A0E14]/80 border border-white/20 flex items-center justify-center text-white backdrop-blur-md animate-ping duration-300">
            {centerBurst === "play" ? (
              <Play size={36} weight="fill" className="text-[#FF7328] ml-1" />
            ) : (
              <Pause size={36} weight="fill" className="text-[#FF7328]" />
            )}
          </div>
        </div>
      )}

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 border-3 border-white/20 border-t-[#FF7328] rounded-full animate-spin" />
            <span className="text-xs font-mono font-medium text-white/80 tracking-wide">Loading stream...</span>
          </div>
        </div>
      )}

      {/* Title Bar (Fades in on hover) */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-[#0A0E14]/80 to-transparent flex items-center justify-between text-white transition-opacity duration-300 z-20 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#FF7328] animate-pulse" />
          <h4 className="text-sm font-bold tracking-tight text-white/95 line-clamp-1">{title}</h4>
        </div>
        {qualities.length > 1 && (
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-white/90 border border-white/15">
            {currentQuality === -1 ? "HLS Auto" : qualities.find(q => q.index === currentQuality)?.name}
          </span>
        )}
      </div>

      {/* Floating Minimalist Control Dock */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 transition-all duration-300 z-30 ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="bg-[#0A0E14]/85 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl space-y-2">
          {/* Interactive Seek Bar */}
          <div
            onClick={handleSeek}
            className="group/seek relative w-full h-2 bg-white/15 hover:h-3 rounded-full cursor-pointer transition-all flex items-center"
          >
            {/* Progress Fill */}
            <div
              style={{ width: `${progressPercent}%` }}
              className="h-full bg-[#FF7328] rounded-full relative flex items-center justify-end"
            >
              <div className="h-3.5 w-3.5 rounded-full bg-white shadow-lg ring-2 ring-[#FF7328] scale-0 group-hover/seek:scale-100 transition-transform -mr-1.5" />
            </div>

            {/* Chapter Ticks */}
            {duration > 0 &&
              chapters.map((ch, idx) => {
                const tickPercent = (ch.time / duration) * 100;
                if (tickPercent > 100) return null;
                return (
                  <div
                    key={idx}
                    style={{ left: `${tickPercent}%` }}
                    title={`${ch.title} (${formatTime(ch.time)})`}
                    className="absolute top-0 bottom-0 w-0.5 bg-white/60 pointer-events-none"
                  />
                );
              })}
          </div>

          {/* Controls Bottom Row */}
          <div className="flex items-center justify-between pt-1 text-white/90 text-sm">
            {/* Left Controls: Play, Skip, Time, Volume */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              >
                {isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" className="ml-0.5" />}
              </button>

              <button
                onClick={() => seekRelative(-5)}
                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
                title="Rewind 5s (←)"
              >
                <ArrowCounterClockwise size={17} weight="bold" />
              </button>

              <button
                onClick={() => seekRelative(5)}
                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
                title="Forward 5s (→)"
              >
                <ArrowClockwise size={17} weight="bold" />
              </button>

              {/* Volume & Mute */}
              <div className="flex items-center gap-1.5 group/vol">
                <button
                  onClick={toggleMute}
                  className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
                  title="Mute (m)"
                >
                  {isMuted || volume === 0 ? (
                    <SpeakerSlash size={18} weight="bold" className="text-red-400" />
                  ) : (
                    <SpeakerHigh size={18} weight="bold" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-white/20 accent-[#FF7328] rounded-lg cursor-pointer transition-all"
                />
              </div>

              {/* Time display */}
              <div className="text-xs font-mono font-medium text-white/75 ml-1">
                <span className="text-white font-bold">{formatTime(currentTime)}</span> / {formatTime(duration)}
              </div>
            </div>

            {/* Right Controls: Quality, Speed, Fullscreen */}
            <div className="flex items-center gap-2 relative">
              {/* Speed quick button */}
              <button
                onClick={() => {
                  const rates = [1, 1.25, 1.5, 2];
                  const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
                  handleSpeedChange(nextRate);
                }}
                className="text-xs font-mono font-bold px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 border border-white/10 transition-colors"
                title="Playback Speed"
              >
                {playbackRate}x
              </button>

              {/* Settings Dropdown Button */}
              <div className="relative">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className={`h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors ${
                    showSettingsMenu ? "text-[#FF7328] bg-white/10" : "text-white/80"
                  }`}
                  title="Settings"
                >
                  <Gear size={18} weight="bold" />
                </button>

                {/* Settings Popup Menu */}
                {showSettingsMenu && (
                  <div className="absolute right-0 bottom-10 w-48 bg-[#0A0E14]/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl p-1.5 text-xs z-50 animate-in fade-in zoom-in-95 duration-150">
                    {settingsTab === "main" && (
                      <div className="space-y-0.5">
                        <button
                          onClick={() => setSettingsTab("quality")}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 text-white/90 text-left font-medium"
                        >
                          <span>Quality</span>
                          <span className="text-white/60 font-mono">
                            {currentQuality === -1 ? "Auto" : qualities.find(q => q.index === currentQuality)?.name}
                          </span>
                        </button>
                        <button
                          onClick={() => setSettingsTab("speed")}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 text-white/90 text-left font-medium"
                        >
                          <span>Speed</span>
                          <span className="text-white/60 font-mono">{playbackRate}x</span>
                        </button>
                      </div>
                    )}

                    {/* Quality submenu */}
                    {settingsTab === "quality" && (
                      <div className="space-y-0.5">
                        <div className="px-2 py-1 text-[10px] uppercase font-bold text-white/50 tracking-wider">
                          Video Quality
                        </div>
                        {qualities.map((q) => (
                          <button
                            key={q.index}
                            onClick={() => handleQualityChange(q.index)}
                            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-white/10 text-white/90 text-left font-mono"
                          >
                            <span>{q.name}</span>
                            {currentQuality === q.index && <Check size={14} className="text-[#FF7328]" />}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Speed submenu */}
                    {settingsTab === "speed" && (
                      <div className="space-y-0.5">
                        <div className="px-2 py-1 text-[10px] uppercase font-bold text-white/50 tracking-wider">
                          Playback Speed
                        </div>
                        {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                          <button
                            key={rate}
                            onClick={() => handleSpeedChange(rate)}
                            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-white/10 text-white/90 text-left font-mono"
                          >
                            <span>{rate}x</span>
                            {playbackRate === rate && <Check size={14} className="text-[#FF7328]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
                title={isFullscreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
              >
                {isFullscreen ? <CornersIn size={18} weight="bold" /> : <CornersOut size={18} weight="bold" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
