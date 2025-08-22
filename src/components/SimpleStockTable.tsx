import React from 'react';
import { useNavigate } from 'react-router-dom';

// 간단한 타입 정의 (import 없이)
interface SimpleStockItem {
  id: string;
  name: string;
  sector: string;
  totalScore: number;
  positiveOpinions: number;
  negativeOpinions: number;
  neutralOpinions: number;
  reactionRate: number;
  scoreChange: number;
  positiveChange: number;
  negativeChange: number;
  neutralChange: number;
  reactionChange: number;
  isFavorite: boolean;
  updatedAt: string;
}

interface SimpleStockTableProps {
  stocks: SimpleStockItem[];
  onFavoriteToggle: (stockId: string) => void;
}

const SimpleStockTable: React.FC<SimpleStockTableProps> = ({ stocks, onFavoriteToggle }) => {
  const navigate = useNavigate();

  const formatChange = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value}%p`;
  };

  const getChangeClass = (value: number) => {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  };

  const handleRowClick = (sectorId: string) => {
    navigate(`/sector/${sectorId}`);
  };

  return (
    <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead style={{ background: '#f8f9fa' }}>
          <tr>
            <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: '#495057', borderBottom: '2px solid #e9ecef' }}>
              섹터
            </th>
            <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#495057', borderBottom: '2px solid #e9ecef' }}>
              종합점수
            </th>
            <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#495057', borderBottom: '2px solid #e9ecef' }}>
              긍정적 의견 (전일)
            </th>
            <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#495057', borderBottom: '2px solid #e9ecef' }}>
              부정적 의견 (전일)
            </th>
            <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#495057', borderBottom: '2px solid #e9ecef' }}>
              중립적 의견 (전일)
            </th>
            <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#495057', borderBottom: '2px solid #e9ecef' }}>
              반응 비율
            </th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock, index) => (
            <tr 
              key={stock.id} 
              style={{ 
                borderBottom: '1px solid #f1f3f4',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onClick={() => handleRowClick(stock.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <td style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFavoriteToggle(stock.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '18px',
                    cursor: 'pointer',
                    color: stock.isFavorite ? '#ffc107' : '#ddd'
                  }}
                >
                  {stock.isFavorite ? '★' : '☆'}
                </button>
                <span style={{ fontWeight: 600, color: '#666', minWidth: '20px' }}>{index + 1}</span>
                <div>
                  <div style={{ fontWeight: 600, color: '#333', fontSize: '15px' }}>{stock.name}</div>
                </div>
              </td>
              <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: '16px', color: '#333', marginBottom: '4px' }}>
                  {stock.totalScore}%
                </div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#6c757d' }}>
                  {formatChange(stock.scoreChange)}
                </div>
              </td>
              <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: '16px', color: '#dc3545', marginBottom: '4px' }}>
                  {stock.positiveOpinions}개
                </div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#6c757d' }}>
                  {formatChange(stock.positiveChange)}
                </div>
              </td>
              <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: '16px', color: '#007bff', marginBottom: '4px' }}>
                  {stock.negativeOpinions}개
                </div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#6c757d' }}>
                  {formatChange(stock.negativeChange)}
                </div>
              </td>
              <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: '16px', color: '#6c757d', marginBottom: '4px' }}>
                  {stock.neutralOpinions}개
                </div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#6c757d' }}>
                  {formatChange(stock.neutralChange)}
                </div>
              </td>
              <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: '16px', color: '#28a745', marginBottom: '4px' }}>
                  {stock.reactionRate}%
                </div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#6c757d' }}>
                  {formatChange(stock.reactionChange)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SimpleStockTable;
