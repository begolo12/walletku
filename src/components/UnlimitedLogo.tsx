import React from "react";

const UnlimitedLogo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <path
        d="M30,50 C30,35 45,35 50,50 C55,65 70,65 70,50 C70,35 55,35 50,50 C45,65 30,65 30,50 Z"
        fill="none"
        stroke="url(#logoGrad)"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke="#f1f5f9"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
    </svg>
  </div>
);

export default UnlimitedLogo;
