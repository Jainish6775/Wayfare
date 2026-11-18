import React, { useEffect, useState } from 'react';
import { FiCompass, FiShield, FiWifi, FiArrowRight } from 'react-icons/fi';
import './LoadingScreen.css';

const DEFAULT_TELEMETRY_STEPS = [
  'Calibrating orbital navigation coordinates...',
  'Synchronizing multi-city transit & stay matrices...',
  'Fetching satellite meteo & real-time climate data...',
  'Decrypting executive itinerary dossiers...',
  'Expedition workspace ready for departure.'
];

export default function LoadingScreen({
  title = 'Wayfare',
  badge = 'OS',
  subtitle = 'EXPEDITION OPERATING SYSTEM',
  message,
  steps = DEFAULT_TELEMETRY_STEPS,
  fullScreen = true,
  canSkip = true,
  onComplete,
}) {
  const [progress, setProgress] = useState(12);
  const [stepIndex, setStepIndex] = useState(0);
  const [timestamp, setTimestamp] = useState(() => new Date().toISOString().substring(11, 19) + ' UTC');

  // Active steps list
  const activeSteps = message ? [message] : steps;

  useEffect(() => {
    // Progress increment timer
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          if (onComplete) onComplete();
          return 100;
        }
        const step = Math.floor(Math.random() * 14) + 10;
        const next = Math.min(prev + step, 100);
        if (next === 100 && onComplete) {
          setTimeout(onComplete, 200);
        }
        return next;
      });
    }, 160);

    // Telemetry text timer
    const stepInterval = setInterval(() => {
      setStepIndex((prev) => (prev < activeSteps.length - 1 ? prev + 1 : prev));
      setTimestamp(new Date().toISOString().substring(11, 19) + ' UTC');
    }, 550);

    return () => {
      clearInterval(progressTimer);
      clearInterval(stepInterval);
    };
  }, [activeSteps.length, onComplete]);

  const handleSkip = () => {
    setProgress(100);
    if (onComplete) onComplete();
  };

  const content = (
    <div className={`wayfare-loader-card ${!fullScreen ? 'inline-loader-card' : ''}`}>
      {/* Orbital Radar Compass Ring */}
      <div className="loader-radar-wrapper">
        <div className="radar-orbit-ring ring-outer"></div>
        <div className="radar-orbit-ring ring-mid"></div>
        <div className="radar-orbit-sweep"></div>

        <div className="radar-core-logo">
          <img src="/logo.jpg" alt="Wayfare" className="loader-logo-media" />
          <div className="radar-pulse-flare"></div>
        </div>

        <div className="radar-compass-satellite">
          <FiCompass size={13} className="satellite-icon" />
        </div>
      </div>

      {/* Brand Typography */}
      <div className="loader-brand-block">
        <div className="loader-brand-row">
          <span className="loader-brand-title">{title}</span>
          <span className="loader-os-badge">{badge}</span>
        </div>
        <span className="loader-sub-tag">{subtitle}</span>
      </div>

      {/* Dynamic Telemetry Status */}
      <div className="loader-telemetry-box">
        <span className="telemetry-live-dot"></span>
        <span className="telemetry-text">{activeSteps[stepIndex] || activeSteps[0]}</span>
      </div>

      {/* High-Precision Progress Track */}
      <div className="loader-progress-module">
        <div className="loader-track-bg">
          <div
            className="loader-fill-bar"
            style={{ width: `${progress}%` }}
          >
            <div className="loader-shimmer-spark"></div>
          </div>
        </div>

        <div className="loader-meta-row">
          <span className="loader-meta-protocol">
            <FiWifi size={11} className="text-cyan-400" /> SAT-LINK ENCRYPTED
          </span>
          <span className="loader-meta-percent">{progress}%</span>
        </div>
      </div>

      {/* Security, Coordinates & Skip Footer */}
      <div className="loader-card-footer">
        <div className="loader-footer-left">
          <div className="loader-footer-chip">
            <FiShield size={10} className="text-blue-400" />
            <span>256-BIT BUFFER</span>
          </div>
          <span className="loader-coords-stamp">35.0116° N • 135.7681° E</span>
          <span className="loader-time-stamp">{timestamp}</span>
        </div>

        {canSkip && fullScreen && (
          <button
            type="button"
            className="loader-skip-action"
            onClick={handleSkip}
            title="Proceed immediately"
          >
            <span>Skip</span>
            <FiArrowRight size={11} />
          </button>
        )}
      </div>
    </div>
  );

  if (!fullScreen) {
    return (
      <div className="wayfare-loader-inline-wrapper">
        {content}
      </div>
    );
  }

  return (
    <div className="wayfare-loader-overlay">
      {/* Deep Ambient Cosmic Glow Orbs */}
      <div className="loader-glow-orb orb-primary"></div>
      <div className="loader-glow-orb orb-cyan"></div>
      <div className="loader-glow-orb orb-violet"></div>

      {/* Subtle Grid Backdrop */}
      <div className="loader-grid-mesh"></div>

      {content}
    </div>
  );
}
