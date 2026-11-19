"use client";

import React from "react";

interface SparklineProps {
  data: number[];
  positive?: boolean;
  width?: number;
  height?: number;
}

export default function Sparkline({
  data,
  positive = true,
  width = 110,
  height = 28,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 3;

  const points = data
    .map((val, idx) => {
      const x =
        pad + (idx / (data.length - 1)) * (width - pad * 2);
      const y =
        height - pad - ((val - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const strokeColor = positive ? "#10B981" : "#F43F5E";
  const lastVal = data[data.length - 1];
  const lastX = width - pad;
  const lastY =
    height - pad - ((lastVal - min) / range) * (height - pad * 2);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle
        cx={lastX}
        cy={lastY}
        r="2.6"
        fill={strokeColor}
      />
    </svg>
  );
}
