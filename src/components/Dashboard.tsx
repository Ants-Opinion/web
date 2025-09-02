import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { getRealStockData, getLatestDate } from '../services/realDataService';
import { addToFavorites, removeFromFavorites, isSectorFavorite } from '../services/favoriteService';
import Header from './Header';
import Footer from './Footer';
import Calendar from './Calendar';
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

type TimeFilter = '1일' | '1주';

const Dashboard: React.FC = () => {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('1일');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState({ x: 0, y: 0 });
  const [isProcessingPostData, setIsProcessingPostData] = useState(false);
  const user = auth.currentUser;

  const navigate = useNavigate();
  const location = useLocation();
  
  // 디버깅을 위한 ref 추가
  const stocksRef = useRef<StockItem[]>([]);

  // POST 데이터에서 초기값 읽어오기
  useEffect(() => {
    if (location.state && location.state.postData) {
      const postData = location.state.postData;
      console.log('POST 데이터 받음:', postData);
      
      // POST 데이터 처리 시작
      setIsProcessingPostData(true);
      setLoading(true);
      
      // POST 데이터를 기반으로 초기 상태 설정
      if (postData.targetDate) {
        setTargetDate(postData.targetDate);
      }
      if (postData.timeFilter) {
        setTimeFilter(postData.timeFilter);
      }
      
      // POST 데이터 처리 완료
      setTimeout(() => {
        setIsProcessingPostData(false);
        setLoading(false);
      }, 1000);
    }
  }, [location.state]);

  // 즐겨찾기 상태 초기화
  const initializeFavoriteStates = async (stocksData: StockItem[]) => {
    if (!user) return stocksData;
    
    const stocksWithFavorites = await Promise.all(
      stocksData.map(async (stock) => {
        const isFav = await isSectorFavorite(stock.id);
        return { ...stock, isFavorite: isFav };
      })
    );
    
    return stocksWithFavorites;
  };

  // POST 데이터를 기반으로 데이터 로딩
  const loadDataForPostData = async () => {
    if (!location.state || !location.state.postData) return;
    
    const postData = location.state.postData;
    console.log('POST 데이터로 로딩 시작:', postData);
    
    try {
      setLoading(true);
      setError('');
      
      let stocksData: StockItem[] = [];
      
      if (postData.timeFilter === '1일') {
        stocksData = await getRealStockData(postData.targetDate);
      } else if (postData.timeFilter === '1주') {
        stocksData = await loadWeekData(postData.targetDate);
      }
      
      // 즐겨찾기 상태 초기화
      const stocksWithFavorites = await initializeFavoriteStates(stocksData);
      
      setStocks(stocksWithFavorites);
      stocksRef.current = stocksWithFavorites;
      
      console.log('POST 데이터 로딩 완료:', stocksWithFavorites);
    } catch (err) {
      console.error('POST 데이터 로딩 실패:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 초기 날짜 설정
  useEffect(() => {
    const initializeDate = async () => {
      try {
        const latestDate = await getLatestDate();
        if (latestDate && !targetDate) {
          setTargetDate(latestDate);
        }
      } catch (err) {
        console.error('최신 날짜 가져오기 실패:', err);
        // 기본값으로 오늘 날짜 사용
        const today = new Date().toISOString().split('T')[0];
        setTargetDate(today);
      }
    };
    
    initializeDate();
  }, [targetDate]);

  // 데이터 로딩
  useEffect(() => {
    if (targetDate && !isProcessingPostData) {
      loadData();
    }
  }, [targetDate, timeFilter, isProcessingPostData]);

  // POST 데이터가 있으면 해당 데이터로 로딩
  useEffect(() => {
    if (location.state && location.state.postData && isProcessingPostData) {
      loadDataForPostData();
    }
  }, [location.state, isProcessingPostData]);

  // 데이터 로딩 함수
  const loadData = async () => {
    if (!targetDate) return;
    
    try {
      setLoading(true);
      setError('');
      
      let stocksData: StockItem[] = [];
      
      if (timeFilter === '1일') {
        stocksData = await getRealStockData(targetDate);
      } else if (timeFilter === '1주') {
        stocksData = await loadWeekData(targetDate);
      }
      
      // 즐겨찾기 상태 초기화
      const stocksWithFavorites = await initializeFavoriteStates(stocksData);
      
      setStocks(stocksWithFavorites);
      stocksRef.current = stocksWithFavorites;
      
    } catch (err) {
      console.error('데이터 로딩 실패:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 즐겨찾기 추가/제거
  const handleToggleFavorite = async (stockId: string) => {
    if (!user) return;
    
    try {
      const stock = stocks.find(s => s.id === stockId);
      if (!stock) return;
      
      if (stock.isFavorite) {
        await removeFromFavorites(stockId);
      } else {
        await addToFavorites(stockId, stock.name);
      }
      
      // 로컬 상태 업데이트
      setStocks(prevStocks => 
        prevStocks.map(s => 
          s.id === stockId ? { ...s, isFavorite: !s.isFavorite } : s
        )
      );
      
    } catch (err) {
      console.error('즐겨찾기 토글 실패:', err);
    }
  };

  // 시간 필터 변경
  const handleTimeFilterChange = (filter: TimeFilter) => {
    setTimeFilter(filter);
    setLoading(true);
    setError(''); // 에러 상태 초기화
  };

  // 날짜 변경
  const handlePreviousDay = () => {
    const currentDate = new Date(targetDate);
    currentDate.setDate(currentDate.getDate() - 1);
    setTargetDate(currentDate.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const currentDate = new Date(targetDate);
    currentDate.setDate(currentDate.getDate() + 1);
    setTargetDate(currentDate.toISOString().split('T')[0]);
  };

  // 날짜 클릭 핸들러
  const handleDateClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setCalendarPosition({ x: rect.left, y: rect.bottom + 5 });
    setIsCalendarOpen(true);
  };

  // 캘린더에서 날짜 선택
  const handleDateSelect = (date: string) => {
    setTargetDate(date);
    setIsCalendarOpen(false);
  };

  // 캘린더 닫기 핸들러
  const handleCalendarClose = () => {
    setIsCalendarOpen(false);
  };

  // 날짜 포맷팅
  const formatDataDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // 섹터 아이콘 경로 가져오기
  const getSectorIconPath = (sector: string) => {
    const iconMappings: { [key: string]: string } = {
      '은행': 'Icon_Sector=Bank.png',
      '바이오': 'Icon_Sector=Biotech.png',
      '자동차': 'Icon_Sector=Car.png',
      '화학': 'Icon_Sector=Chemistry.png',
      '건설': 'Icon_Sector=Construction.png',
      '화장품': 'Icon_Sector=Cosmatic.png',
      '방산': 'Icon_Sector=DefenceIndustry.png',
      '디스플레이': 'Icon_Sector=Display.png',
      '유통': 'Icon_Sector=Distribution.png',
      '전력': 'Icon_Sector=Electricity.png',
      '엔터테인먼트': 'Icon_Sector=Entertainment.png',
      '패션': 'Icon_Sector=Fashion.png',
      '식품': 'Icon_Sector=Food.png',
      '게임': 'Icon_Sector=Game.png',
      '수소': 'Icon_Sector=Hydrogen.png',
      '임플란트': 'Icon_Sector=Implant.png',
      '보험': 'Icon_Sector=Insurance.png',
      '철강': 'Icon_Sector=Iron.png',
      'IT': 'Icon_Sector=IT.png',
      '원전': 'Icon_Sector=NuclarEnergy.png',
      '2차전지': 'Icon_Sector=SecondaryElectricity.png',
      '반도체': 'Icon_Sector=Semiconductor.png',
      '스킨케어': 'Icon_Sector=SkinCare.png',
      '여행': 'Icon_Sector=Travel.png',
      '조선': 'Icon_Sector=Vessle.png',
      '풍력': 'Icon_Sector=WindEnergy.png',
      '전선': 'Icon_Sector=Wire.png'
    };
    
    return iconMappings[sector] || 'Icon_Sector=IT.png';
  };

  // 반응 비율 계산
  const calculateReactionRate = (positive: number, negative: number, neutral: number) => {
    const total = positive + negative + neutral;
    if (total === 0) return 'N/A';
    return ((positive / total) * 100).toFixed(1);
  };

  // 부정적 반응 비율 계산
  const calculateNegativeReactionRate = (positive: number, negative: number, neutral: number) => {
    const total = positive + negative + neutral;
    if (total === 0) return 'N/A';
    return ((negative / total) * 100).toFixed(1);
  };

  // 행 클릭 핸들러
  const handleRowClick = (stock: StockItem) => {
    navigate(`/sector/${stock.id}`);
  };

  // 1주 데이터 로딩
  const loadWeekData = async (date: string) => {
    return await getRealStockData(date);
  };



  if (!user) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <Header currentPage="home" />
      
      {/* 메인 제목 */}
      <div className="main-title-container">
        <div className="main-title">사람들의 반응</div>
        <div className="subtitle">{new Date(targetDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 기준</div>
      </div>
      
      {/* 날짜 변경 컨트롤 */}
      <div className="date-filter-container">
        <div className="date-filter-buttons">
          <button 
            className={`date-filter-btn ${timeFilter === '1일' ? 'active' : ''}`}
            onClick={() => handleTimeFilterChange('1일')}
          >
            <span className="date-filter-text">1일</span>
          </button>
          <button 
            className={`date-filter-btn ${timeFilter === '1주' ? 'active' : ''}`}
            onClick={() => handleTimeFilterChange('1주')}
          >
            <span className="date-filter-text">1주</span>
          </button>

        </div>
        
        {/* 날짜 선택 컨트롤 */}
        <div className="date-selector">
          <button 
            className="date-arrow" 
            onClick={handlePreviousDay}
            disabled={loading}
          >
            ‹
          </button>
          <div className="date-display" onClick={handleDateClick} style={{ cursor: 'pointer' }}>
            {formatDataDate(targetDate)}
          </div>
          <button 
            className="date-arrow" 
            onClick={handleNextDay}
            disabled={loading}
          >
            ›
          </button>
        </div>
      </div>

      {/* 통합 테이블 */}
      <div className="stock-table-container">
        {loading ? (
          <div className="favorites-loading-container">
            <div className="loading-spinner"></div>
            <h2>데이터를 불러오는 중...</h2>
            <p>{targetDate} 날짜의 섹터 데이터를 가져오고 있습니다.</p>
            <div className="loading-progress">
              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>
            </div>
          </div>
        ) : error && !location.state && !loading && !isProcessingPostData ? (
          <div className="favorites-no-data-container">
            <div className="no-data-icon">⚠️</div>
            <h2>데이터가 없거나 오류가 발생했습니다</h2>
            <p>{targetDate} 날짜에 데이터가 없습니다. 다른 날짜를 선택해주세요.</p>
            <div className="no-data-actions">
              <button className="try-other-date-btn" onClick={() => {
                setTimeFilter('1일');
                setError('');
                setLoading(true);
                // 데이터 다시 로딩
                setTimeout(() => {
                  loadData();
                }, 100);
              }}>
                새로고침
              </button>
            </div>
          </div>
        ) : stocks.length === 0 && !location.state && !loading && !isProcessingPostData ? (
          <div className="favorites-no-data-container">
            <div className="no-data-icon">⚠️</div>
            <h2>데이터가 없거나 오류가 발생했습니다</h2>
            <p>{targetDate} 날짜에 데이터가 없습니다. 다른 날짜를 선택해주세요.</p>
            <div className="no-data-actions">
              <button className="try-other-date-btn" onClick={() => {
                setTimeFilter('1일');
                setError('');
                setLoading(true);
                // 데이터 다시 로딩
                setTimeout(() => {
                  loadData();
                }, 100);
              }}>
                새로고침
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 테이블 헤더 */}
            <div className="table-header">
              <div className="table-header-left">섹션</div>
              <div className="table-header-right">
                <div className="table-header-column score">종합점수</div>
                <div className="table-header-column positive">긍정적 의견</div>
                <div className="table-header-column negative">부정적 의견</div>
                <div className="table-header-column neutral">중립적 의견</div>
                <div className="table-header-column neutral">반응 비율</div>
              </div>
            </div>
            
            {/* 테이블 데이터 행들 */}
            {stocks.map((stock, index) => (
              <div
                key={stock.id}
                className={`stock-row ${stock.isFavorite ? 'bookmarked' : ''}`}
                data-property-1={stock.isFavorite ? 'Bookmarked' : 'Default'}
                onClick={() => handleRowClick(stock)}
              >
                <div className="stock-left">
                  <div 
                    className={`favorite-icon ${stock.isFavorite ? 'active' : 'inactive'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(stock.id);
                    }}
                  >
                    ★
                  </div>
                  <div className="stock-rank">{index + 1}</div>
                  <div className="stock-info">
                    {(() => {
                      const iconPath = getSectorIconPath(stock.sector);
                      return (
                        <div 
                          className="stock-icon" 
                          style={{ 
                            backgroundImage: iconPath ? `url(/img/Sector_Icon/${iconPath})` : 'none' 
                          }}
                          data-fallback={stock.sector.charAt(0)}
                        ></div>
                      );
                    })()}
                    <div className="stock-name">{stock.sector}</div>
                  </div>
                </div>
                <div className="stock-right">
                  <div className="stock-data-column">
                    <div className="stock-data-value score">{stock.totalScore.toFixed(1)}점</div>
                    <div className="stock-data-change score">
                      {stock.scoreChange > 0 ? '+' : ''}{stock.scoreChange.toFixed(1)}%p
                    </div>
                  </div>
                  <div className="stock-data-column">
                    <div className="stock-data-value positive">{stock.positiveOpinions}개</div>
                    <div className="stock-data-change positive">
                      {stock.positiveChange > 0 ? '+' : ''}{stock.positiveChange}%
                    </div>
                  </div>
                  <div className="stock-data-column">
                    <div className="stock-data-value negative">{stock.negativeOpinions}개</div>
                    <div className="stock-data-change negative">
                      {stock.negativeChange > 0 ? '+' : ''}{stock.negativeChange}%
                    </div>
                  </div>
                  <div className="stock-data-column">
                    <div className="stock-data-value neutral">{stock.neutralOpinions}개</div>
                    <div className="stock-data-change neutral">
                      {stock.neutralChange > 0 ? '+' : ''}{stock.neutralChange}%
                    </div>
                  </div>
                  <div className="stock-data-column">
                    <div className="stock-data-value reaction-positive">
                      {calculateReactionRate(stock.positiveOpinions, stock.negativeOpinions, stock.neutralOpinions)}
                      {calculateReactionRate(stock.positiveOpinions, stock.negativeOpinions, stock.neutralOpinions) !== 'N/A' && '%'}
                    </div>
                    <div className="stock-data-value reaction-negative">
                      {calculateNegativeReactionRate(stock.positiveOpinions, stock.negativeOpinions, stock.neutralOpinions)}
                      {calculateNegativeReactionRate(stock.positiveOpinions, stock.negativeOpinions, stock.neutralOpinions) !== 'N/A' && '%'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      
      <Footer />
      
      {/* 캘린더 컴포넌트 */}
      <Calendar
        isOpen={isCalendarOpen}
        onClose={handleCalendarClose}
        onDateSelect={handleDateSelect}
        selectedDate={targetDate}
        position={calendarPosition}
      />
    </div>
  );
};

export default Dashboard;