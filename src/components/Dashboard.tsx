import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import SimpleStockTable from './SimpleStockTable';
import Header from './Header';
import { getRealStockData } from '../services/realDataService';
import './Dashboard.css';

// 간단한 타입 정의
interface StockItem {
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

type TimeFilter = '1일' | '1주' | '1개월';

const Dashboard: React.FC = () => {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('1일');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [dataDate, setDataDate] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('2025-08-18');

  // 날짜 포맷팅 함수
  const formatDataDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // 전날 날짜 계산 (실제 데이터 기준일)
    const prevDate = new Date(date);
    prevDate.setDate(date.getDate() - 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth() + 1;
    const prevDay = prevDate.getDate();
    
    return `${prevYear}년 ${prevMonth}월 ${prevDay}일 (${month}월 ${day}일 수집)`;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      
      try {
        console.log('실제 Firebase 데이터 로딩 시작...');
        const realStockData = await getRealStockData(targetDate);
        
        // 실제 데이터 사용 (0점이어도 표시)
        setStocks(realStockData);
        setLastUpdated(new Date().toLocaleString('ko-KR'));
        // sector_score 문서 기준에 맞춰 2025-08-18을 수집일로 표기
        setDataDate(formatDataDate(targetDate));
        console.log('섹터 데이터 로딩 완료:', realStockData.length, '개 섹터');
        
        if (realStockData.length === 0) {
          console.log('섹터 데이터가 없습니다. Firebase 연결 및 데이터 구조를 확인해주세요.');
        }
      } catch (err) {
        console.error('데이터 로딩 오류:', err);
        setError('데이터를 불러오는 중 오류가 발생했습니다. Firebase 연결을 확인해주세요.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [timeFilter, targetDate]);

  // 날짜 이동 핸들러
  const shiftTargetDate = (days: number) => {
    const date = new Date(targetDate);
    date.setDate(date.getDate() + days);
    const iso = date.toISOString().split('T')[0];
    setTargetDate(iso);
  };

  const handleFavoriteToggle = (stockId: string) => {
    // 로컬 상태만 업데이트
    setStocks(prevStocks =>
      prevStocks.map(stock =>
        stock.id === stockId
          ? { ...stock, isFavorite: !stock.isFavorite }
          : stock
      )
    );
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="sample-data-btn">
          새로고침
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Header user={auth.currentUser} />
      
      <div className="dashboard-status">
        <div className="status-header">
          <div className="title-section">
            <h1 className="page-title">사람들의 반응</h1>
            <p className="data-info">데이터 기준일: {dataDate || '계산 중...'}</p>
          </div>
          <div className="time-filter">
            {(['1일', '1주', '1개월'] as TimeFilter[]).map((filter) => (
              <button
                key={filter}
                className={`filter-btn ${timeFilter === filter ? 'active' : ''}`}
                onClick={() => setTimeFilter(filter)}
              >
                {filter}
              </button>
            ))}
            <div style={{ display: 'block', marginTop: '8px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#495057' }}>
                <button onClick={() => shiftTargetDate(-1)} className="filter-btn" aria-label="이전 날짜">{'<'}</button>
                <span>{new Date(targetDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <button onClick={() => shiftTargetDate(1)} className="filter-btn" aria-label="다음 날짜">{'>'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <SimpleStockTable 
          stocks={stocks} 
          onFavoriteToggle={handleFavoriteToggle}
        />
      </div>

      <div className="dashboard-footer">
        <p className="data-date">
          데이터 기준일: {dataDate || '기준일 계산 중...'}
        </p>
        <p className="last-updated">
          마지막 업데이트: {lastUpdated}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
