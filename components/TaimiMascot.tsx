"use client";

import { useEffect, useState } from "react";

export type TaimiMood =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "happy"
  | "sleeping";

const COACH_QUIPS = [
  "Pienistä puroista kasvaa iso säästö!",
  "Kysy rohkeasti budjetista!",
  "Hyvä suunta! Jatketaan vain.",
  "Järjestelen ajatuksiani...",
];

export interface TaimiMascotProps {
  mood?: TaimiMood;
  size?: number;
  showBubble?: boolean;
  bubblePlacement?: "top" | "right";
  statusText?: string;
}

export default function TaimiMascot({
  mood = "idle",
  size = 64,
  showBubble = true,
  bubblePlacement = "top",
  statusText,
}: TaimiMascotProps) {
  const [clickedHappy, setClickedHappy] = useState(false);
  const [quip, setQuip] = useState("");

  const activeMood: TaimiMood = clickedHappy ? "happy" : mood;

  const handleInteract = () => {
    setClickedHappy(true);
    const randomQuip =
      COACH_QUIPS[Math.floor(Math.random() * COACH_QUIPS.length)];
    setQuip(randomQuip);
  };

  useEffect(() => {
    if (!clickedHappy) return;
    const timer = window.setTimeout(() => {
      setClickedHappy(false);
      setQuip("");
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [clickedHappy]);

  const bubbleLabel = quip || statusText || (activeMood === "thinking" ? "Ajattelen..." : "");

  return (
    <div className={`taimi-wrapper mood-${activeMood}`}>
      {showBubble && bubbleLabel && (
        <div
          className={
            bubblePlacement === "right" ? "taimi-bubble-right" : "taimi-bubble"
          }
        >
          {bubbleLabel}
        </div>
      )}

      <svg
        className="taimi-svg"
        width={size}
        height={size}
        viewBox="0 0 64 64"
        onClick={handleInteract}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleInteract();
          }
        }}
        aria-label="Taimi AI Coach Mascot — click for a financial tip"
      >
        <defs>
          <linearGradient id="taimiGreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1cc973" />
            <stop offset="100%" stopColor="#008a45" />
          </linearGradient>
        </defs>

        {/* Soft shadow */}
        <ellipse
          cx="32"
          cy="58"
          rx="16"
          ry="3.5"
          fill="rgba(0, 80, 40, 0.14)"
        />

        <g className="taimi-body-group">
          {/* Sprout stem & leaves */}
          <g className="taimi-leaf">
            <path
              d="M32 18 Q32 10 32 9"
              stroke="#007a3d"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M32 11 C25 5, 20 10, 26 14 C29 16, 32 13, 32 11 Z"
              fill="#34d399"
            />
            <path
              d="M32 11 C39 4, 45 9, 39 14 C36 16, 32 13, 32 11 Z"
              fill="#10b981"
            />
          </g>

          {/* Rounded droplet/seedling body */}
          <path
            d="M32 16 C45 16, 52 27, 52 38 C52 49, 44 55, 32 55 C20 55, 12 49, 12 38 C12 27, 19 16, 32 16 Z"
            fill="url(#taimiGreen)"
          />

          {/* Subtle highlight */}
          <ellipse
            cx="23"
            cy="27"
            rx="4"
            ry="7"
            transform="rotate(-20 23 27)"
            fill="rgba(255,255,255,0.22)"
          />

          {/* Rosy cheeks */}
          <circle cx="20" cy="39" r="3" fill="#ff8fa3" opacity="0.55" />
          <circle cx="44" cy="39" r="3" fill="#ff8fa3" opacity="0.55" />

          {/* EYES BY MOOD */}
          {activeMood === "happy" ? (
            <g
              stroke="#08331e"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            >
              <path d="M21 35 Q24 31 27 35" />
              <path d="M37 35 Q40 31 43 35" />
            </g>
          ) : activeMood === "sleeping" ? (
            <g
              stroke="#08331e"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            >
              <path d="M21 35 Q24 37 27 35" />
              <path d="M37 35 Q40 37 43 35" />
            </g>
          ) : (
            <g className="taimi-eyes-open">
              <circle
                cx={activeMood === "thinking" ? 25 : 24}
                cy={activeMood === "thinking" ? 32 : 34}
                r={activeMood === "listening" ? 3.5 : 3}
                fill="#08331e"
              />
              <circle
                cx={activeMood === "thinking" ? 41 : 40}
                cy={activeMood === "thinking" ? 32 : 34}
                r={activeMood === "listening" ? 3.5 : 3}
                fill="#08331e"
              />
              {/* Eye catchlights */}
              <circle
                cx={activeMood === "thinking" ? 26 : 25}
                cy={activeMood === "thinking" ? 31 : 33}
                r="1.1"
                fill="#ffffff"
              />
              <circle
                cx={activeMood === "thinking" ? 42 : 41}
                cy={activeMood === "thinking" ? 31 : 33}
                r="1.1"
                fill="#ffffff"
              />
            </g>
          )}

          {/* MOUTH BY MOOD */}
          {activeMood === "speaking" ? (
            <ellipse cx="32" cy="41" rx="3" ry="2.2" fill="#08331e" />
          ) : activeMood === "thinking" ? (
            <circle cx="33" cy="41" r="1.6" fill="#08331e" />
          ) : (
            <path
              d="M29 40 Q32 43 35 40"
              stroke="#08331e"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          )}
        </g>

        {/* Thinking dots */}
        {activeMood === "thinking" && (
          <g className="taimi-thought-dots" fill="#00994d">
            <circle cx="48" cy="14" r="2" />
            <circle cx="53" cy="10" r="2.3" />
            <circle cx="58" cy="6" r="2.6" />
          </g>
        )}

        {/* Sleeping Zzz */}
        {activeMood === "sleeping" && (
          <text x="45" y="20" fontSize="10" className="taimi-zzz">
            z
          </text>
        )}
      </svg>
    </div>
  );
}
