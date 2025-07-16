import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SparklineProps {
  data: number[];
  color?: string;
  showTrend?: boolean;
  height?: number;
  width?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({ 
  data, 
  color = '#3B82F6', 
  showTrend = true,
  height = 40,
  width = 100 
}) => {
  if (!data || data.length === 0) {
    return <div className="w-full h-10 bg-gray-700 rounded opacity-50" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  // Calculate trend
  const trend = data.length > 1 ? data[data.length - 1] - data[0] : 0;
  const trendPercentage = data[0] !== 0 ? ((trend / data[0]) * 100) : 0;

  // Generate SVG path
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = range === 0 ? height / 2 : height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <svg width={width} height={height} className="overflow-visible">
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Add dots for data points */}
          {data.map((value, index) => {
            const x = (index / (data.length - 1)) * width;
            const y = range === 0 ? height / 2 : height - ((value - min) / range) * height;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                fill={color}
                className="opacity-60"
              />
            );
          })}
        </svg>
      </div>
      
      {showTrend && (
        <div className={`flex items-center space-x-1 ${trendColor}`}>
          <TrendIcon className="h-3 w-3" />
          <span className="text-xs font-medium">
            {Math.abs(trendPercentage).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
};
