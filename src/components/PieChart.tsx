import React from 'react';

interface PieChartProps {
  positive: number;
  negative: number;
  neutral: number;
}

const PieChart: React.FC<PieChartProps> = ({ positive, negative, neutral }) => {
  const total = positive + negative + neutral;
  
  if (total === 0) {
    return (
      <div style={{ 
        width: '200px', 
        height: '200px', 
        borderRadius: '50%', 
        background: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999'
      }}>
        데이터 없음
      </div>
    );
  }

  // 각 섹션의 비율 계산
  const positivePercent = (positive / total) * 100;
  const negativePercent = (negative / total) * 100;
  const neutralPercent = (neutral / total) * 100;

  // SVG 원그래프를 위한 각도 계산
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  
  // 각 섹션의 stroke-dasharray 계산
  const positiveLength = (positivePercent / 100) * circumference;
  const negativeLength = (negativePercent / 100) * circumference;
  const neutralLength = (neutralPercent / 100) * circumference;

  // 시작 각도 계산 (12시 방향부터 시계방향)
  let currentOffset = 0;
  const positiveOffset = currentOffset;
  currentOffset += positiveLength;
  const negativeOffset = currentOffset;
  currentOffset += negativeLength;
  const neutralOffset = currentOffset;

  return (
    <div style={{ position: 'relative', width: '200px', height: '260px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
        {/* 배경 원 */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#f0f0f0"
          strokeWidth="20"
        />
        
        {/* 긍정적 섹션 */}
        {positive > 0 && (
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#ff6b6b"
            strokeWidth="20"
            strokeDasharray={`${positiveLength} ${circumference - positiveLength}`}
            strokeDashoffset={-positiveOffset}
            strokeLinecap="round"
          />
        )}
        
        {/* 부정적 섹션 */}
        {negative > 0 && (
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#4dabf7"
            strokeWidth="20"
            strokeDasharray={`${negativeLength} ${circumference - negativeLength}`}
            strokeDashoffset={-negativeOffset}
            strokeLinecap="round"
          />
        )}
        
        {/* 중립적 섹션 */}
        {neutral > 0 && (
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#adb5bd"
            strokeWidth="20"
            strokeDasharray={`${neutralLength} ${circumference - neutralLength}`}
            strokeDashoffset={-neutralOffset}
            strokeLinecap="round"
          />
        )}
      </svg>
      
      {/* 중앙 텍스트 */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
          {total}
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          총 의견
        </div>
      </div>
      
      {/* 범례 */}
      <div style={{
        marginTop: '16px',
        display: 'flex',
        gap: '16px',
        fontSize: '12px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ 
            width: '12px', 
            height: '12px', 
            borderRadius: '50%', 
            background: '#ff6b6b' 
          }}></div>
          <span>긍정 {positive}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ 
            width: '12px', 
            height: '12px', 
            borderRadius: '50%', 
            background: '#4dabf7' 
          }}></div>
          <span>부정 {negative}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ 
            width: '12px', 
            height: '12px', 
            borderRadius: '50%', 
            background: '#adb5bd' 
          }}></div>
          <span>중립 {neutral}</span>
        </div>
      </div>
    </div>
  );
};

export default PieChart;
