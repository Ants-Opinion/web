import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { getRealStockData, getLatestDate } from '../services/realDataService';
import { getUserFavorites, removeFromFavorites, isSectorFavorite, type FavoriteSector } from '../services/favoriteService';
import { getSectorIconPath } from '../services/sectorIconService';
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

const Favorites: React.FC = () => {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('1일');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState({ x: 0, y: 0 });
  const [isProcessingPostData, setIsProcessingPostData] = useState(false);
  const [hasProcessedPostData, setHasProcessedPostData] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipWrapperRef = useRef<HTMLSpanElement>(null);

  const [favorites, setFavorites] = useState<FavoriteSector[]>([]);
  const user = auth.currentUser;

  const navigate = useNavigate();
  const location = useLocation();
  
  // 디버깅을 위한 ref 추가
  const stocksRef = useRef<StockItem[]>([]);

  // 모바일 디바이스 감지
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 툴팁 위치 조정
  useEffect(() => {
    if (showInfoTooltip && tooltipRef.current && tooltipWrapperRef.current) {
      const tooltip = tooltipRef.current;
      const wrapper = tooltipWrapperRef.current;
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // 툴팁이 화면 오른쪽을 벗어나는 경우
      if (tooltipRect.right > viewportWidth - 20) {
        const overflow = tooltipRect.right - viewportWidth + 20;
        tooltip.style.left = `calc(50% - ${overflow}px)`;
        tooltip.style.transform = 'translateX(-50%)';
      }
      
      // 툴팁이 화면 왼쪽을 벗어나는 경우
      if (tooltipRect.left < 20) {
        const overflow = 20 - tooltipRect.left;
        tooltip.style.left = `calc(50% + ${overflow}px)`;
        tooltip.style.transform = 'translateX(-50%)';
      }
      
      // 툴팁이 화면 아래를 벗어나는 경우 (위로 표시)
      if (tooltipRect.bottom > viewportHeight - 20) {
        tooltip.style.top = 'auto';
        tooltip.style.bottom = 'calc(100% + 8px)';
        tooltip.style.transform = 'translateX(-50%)';
      }
    }
  }, [showInfoTooltip]);

  // POST 데이터에서 초기값 읽어오기
  useEffect(() => {
    if (location.state && location.state.postData) {
      // POST 데이터 처리 시작을 가장 먼저 설정
      setIsProcessingPostData(true);
      setError('');
      setLoading(true);
      
      const postData = location.state.postData;
      console.log('=== 즐겨찾기 POST 데이터 읽기 ===');
      console.log('POST 데이터:', postData);
      
      // POST 데이터를 기반으로 초기 상태 설정
      if (postData.targetDate) {
        setTargetDate(postData.targetDate);
      }
      if (postData.timeFilter) {
        setTimeFilter(postData.timeFilter);
      }
      
      // POST 데이터로 실제 데이터 로딩
      loadDataForPostData()
        .then(() => {
          // POST 데이터 처리 완료 후 location.state 정리
          setTimeout(() => {
            setIsProcessingPostData(false);
            setHasProcessedPostData(true);
            navigate(location.pathname, { replace: true, state: null });
          }, 50);
        })
        .catch(() => {
          // 에러가 발생해도 POST 데이터 처리 완료 처리
          setTimeout(() => {
            setIsProcessingPostData(false);
            setHasProcessedPostData(true);
            navigate(location.pathname, { replace: true, state: null });
          }, 50);
        });
    }
  }, [location.state, navigate, location.pathname]);

  // 즐겨찾기 상태 초기화 함수
  const initializeFavoriteStates = async (stockData: StockItem[]) => {
    try {
      const stocksWithFavorites = await Promise.all(
        stockData.map(async (stock) => {
          const isFavorite = await isSectorFavorite(stock.id);
          return { ...stock, isFavorite };
        })
      );
      return stocksWithFavorites;
    } catch (error) {
      console.error('즐겨찾기 상태 초기화 오류:', error);
      return stockData;
    }
  };

  // POST 데이터를 기반으로 데이터 로딩
  const loadDataForPostData = async () => {
    if (!location.state || !location.state.postData) return;
    
    const postData = location.state.postData;
    console.log('POST 데이터로 로딩 시작:', postData);
    
    try {
      // 즐겨찾기 목록이 비어있으면 먼저 로드
      if (favorites.length === 0) {
        console.log('즐겨찾기 목록이 비어있어서 먼저 로드합니다.');
        const userFavorites = await getUserFavorites();
        setFavorites(userFavorites);
        
        // 즐겨찾기 목록을 사용하여 데이터 로딩
        await loadDataWithFavorites(postData, userFavorites);
      } else {
        // 즐겨찾기 목록이 있으면 바로 데이터 로딩
        await loadDataWithFavorites(postData, favorites);
      }
      
    } catch (err) {
      console.error('POST 데이터 로딩 오류:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 즐겨찾기 목록을 사용하여 데이터 로딩
  const loadDataWithFavorites = async (postData: { timeFilter: string; targetDate: string }, favoritesList: FavoriteSector[]) => {
    let realStockData: StockItem[] = [];
    
    if (postData.timeFilter === '1일') {
      realStockData = await getRealStockData(postData.targetDate);
    } else if (postData.timeFilter === '1주') {
      realStockData = await loadWeekData(postData.targetDate);
    }
    
    // 즐겨찾기 항목만 필터링
    const favoriteIds = favoritesList.map(fav => fav.sectorId);
    const favoriteNames = favoritesList.map(fav => fav.sectorName);
    console.log('POST 데이터 즐겨찾기 ID 목록:', favoriteIds);
    console.log('POST 데이터 즐겨찾기 이름 목록:', favoriteNames);
    
    // ID와 이름 모두로 필터링 (realDataService에서 id가 실제로는 섹터 이름임)
    const favoriteStocks = realStockData.filter(stock => 
      favoriteIds.includes(stock.id) || favoriteNames.includes(stock.sector)
    );
    
    // 즐겨찾기 상태 초기화
    const stocksWithFavorites = await initializeFavoriteStates(favoriteStocks);
    setStocks(stocksWithFavorites);
    stocksRef.current = stocksWithFavorites;
    
    // 오류 메시지 설정 (즐겨찾기된 섹터가 없는 경우에만)
    if (favoriteStocks.length === 0) {
      setError('즐겨찾기된 섹터가 없습니다.');
    } else {
      setError('');
    }
    
    console.log('POST 데이터 로딩 완료:', stocksWithFavorites);
  };

  // 초기 기준일자 설정 (POST 데이터가 없을 때만)
  useEffect(() => {
    let isMounted = true;
    
    const initializeDate = async () => {
      // POST 데이터가 있거나 POST 데이터 처리 중이면 초기화하지 않음
      if (location.state?.postData || isProcessingPostData) return;
      
      try {
        if (targetDate) {
          return;
        }
        
        const latestDate = await getLatestDate();
        if (isMounted && !targetDate) {
          setTargetDate(latestDate);
        }
      } catch (err) {
        console.error('최신 날짜 가져오기 오류:', err);
        if (isMounted) {
          setError('최신 날짜를 가져오는 중 오류가 발생했습니다.');
        }
      }
    };

    initializeDate();

    return () => {
      isMounted = false;
    };
  }, [targetDate, location.state, isProcessingPostData]);

  // 즐겨찾기 목록 로딩
  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  // 즐겨찾기 목록이 로드된 후 데이터 로딩 (POST 데이터 처리 완료 후 제외)
  useEffect(() => {
    if (targetDate && favorites.length > 0 && !location.state?.postData && !isProcessingPostData && !hasProcessedPostData) {
      loadData();
    }
  }, [targetDate, timeFilter, favorites, location.state, isProcessingPostData, hasProcessedPostData]);

  // 즐겨찾기 목록 가져오기
  const loadFavorites = async () => {
    try {
      const userFavorites = await getUserFavorites();
      setFavorites(userFavorites);
      console.log('즐겨찾기 목록 로드됨:', userFavorites);
      
      // 즐겨찾기가 없으면 로딩 상태 해제
      if (userFavorites.length === 0) {
        setLoading(false);
        setError('즐겨찾기된 섹터가 없습니다. 대시보드에서 섹터를 즐겨찾기에 추가해주세요.');
      }
    } catch (err) {
      console.error('즐겨찾기 로딩 오류:', err);
      setError('즐겨찾기 목록을 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  // 즐겨찾기에서 제거
  const handleRemoveFavorite = async (sectorId: string) => {
    try {
      await removeFromFavorites(sectorId);
      setFavorites(prev => prev.filter(fav => fav.sectorId !== sectorId));
      setStocks(prev => prev.filter(stock => stock.id !== sectorId));
    } catch (err) {
      console.error('즐겨찾기 제거 오류:', err);
      setError('즐겨찾기 제거 중 오류가 발생했습니다.');
    }
  };

  // 즐겨찾기 항목만 필터링하여 데이터 로딩
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('=== 즐겨찾기 데이터 로딩 시작 ===');
      console.log('현재 즐겨찾기 목록:', favorites);
      console.log('대상 날짜:', targetDate);
      console.log('시간 필터:', timeFilter);
      
      let realStockData: StockItem[] = [];
      
      if (timeFilter === '1주') {
        const weekData = await loadWeekData(targetDate);
        realStockData = weekData;
      } else {
        realStockData = await getRealStockData(targetDate);
      }

      console.log('가져온 전체 데이터:', realStockData.length, '개');

      // 즐겨찾기 항목만 필터링
      const favoriteIds = favorites.map(fav => fav.sectorId);
      const favoriteNames = favorites.map(fav => fav.sectorName);
      console.log('즐겨찾기 ID 목록:', favoriteIds);
      console.log('즐겨찾기 이름 목록:', favoriteNames);
      
      // ID와 이름 모두로 필터링 (realDataService에서 id가 실제로는 섹터 이름임)
      const favoriteStocks = realStockData.filter(stock => 
        favoriteIds.includes(stock.id) || favoriteNames.includes(stock.sector)
      );
      console.log('필터링된 즐겨찾기 데이터:', favoriteStocks.length, '개');
      console.log('필터링된 섹터들:', favoriteStocks.map(s => s.sector));
      
      // 즐겨찾기 상태 초기화
      const stocksWithFavorites = await initializeFavoriteStates(favoriteStocks);
      setStocks(stocksWithFavorites);
      stocksRef.current = stocksWithFavorites;
      
      console.log('최종 설정된 stocks:', stocksWithFavorites.length, '개');
      
      // POST 데이터 처리 중이 아닐 때만 오류 상태 설정
      if (!isProcessingPostData) {
        if (favoriteStocks.length === 0) {
          setError('즐겨찾기된 섹터가 없습니다.');
        } else {
          setError('');
        }
      }
      
    } catch (err) {
      console.error('데이터 로딩 오류:', err);
      // POST 데이터 처리 중이 아닐 때만 오류 상태 설정
      if (!isProcessingPostData) {
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 시간 필터 변경
  const handleTimeFilterChange = (filter: TimeFilter) => {
    setTimeFilter(filter);
    setLoading(true);
    setError(''); // 에러 상태 초기화
    setHasProcessedPostData(false); // POST 데이터 처리 완료 상태 리셋
  };

  // 날짜 변경
  const handlePreviousDay = () => {
    const currentDate = new Date(targetDate);
    currentDate.setDate(currentDate.getDate() - 1);
    setTargetDate(currentDate.toISOString().split('T')[0]);
    setHasProcessedPostData(false); // POST 데이터 처리 완료 상태 리셋
  };

  const handleNextDay = () => {
    const currentDate = new Date(targetDate);
    currentDate.setDate(currentDate.getDate() + 1);
    setTargetDate(currentDate.toISOString().split('T')[0]);
    setHasProcessedPostData(false); // POST 데이터 처리 완료 상태 리셋
  };

  // 날짜 클릭 시 캘린더 열기
  const handleDateClick = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setCalendarPosition({ x: rect.left, y: rect.bottom + 5 });
    setIsCalendarOpen(true);
  };

  // 캘린더에서 날짜 선택
  const handleDateSelect = (date: string) => {
    setTargetDate(date);
    setIsCalendarOpen(false);
    setHasProcessedPostData(false); // POST 데이터 처리 완료 상태 리셋
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

  // 날짜 범위 포맷팅 (1주 필터용)
  const formatDateRange = (dateString: string) => {
    const endDate = new Date(dateString);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6); // 7일간 (시작일 포함)
    
    const startFormatted = startDate.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const endFormatted = endDate.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    return `${startFormatted} ~ ${endFormatted}`;
  };

  // 섹터 아이콘 경로 생성
  // 반응률 계산 함수
  const calculateReactionRate = (positive: number, negative: number, neutral: number) => {
    const total = positive + negative + neutral;
    if (total === 0) return 'N/A';
    return ((positive / total) * 100).toFixed(1);
  };

  // 부정적 반응률 계산 함수
  const calculateNegativeReactionRate = (positive: number, negative: number, neutral: number) => {
    const total = positive + negative + neutral;
    if (total === 0) return 'N/A';
    return ((negative / total) * 100).toFixed(1);
  };

  // 행 클릭 핸들러
  const handleRowClick = (stock: StockItem) => {
    const params = new URLSearchParams();
    params.set('filter', timeFilter);
    if (targetDate) {
      params.set('date', targetDate);
    }
    navigate(`/sector/${stock.id}?${params.toString()}`, {
      state: { fromPage: 'favorites' }
    });
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
      <Header currentPage="favorites" />
      
      {/* 메인 제목 */}
      <div className="main-title-container">
        <div className="main-title">사람들의 반응(즐겨찾기)</div>
        <div className="subtitle">
          {timeFilter === '1주' && targetDate
            ? `${formatDateRange(targetDate)} 기준`
            : targetDate
            ? `${new Date(targetDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 기준`
            : '기준'}
          <span 
            ref={tooltipWrapperRef}
            className="info-icon-wrapper"
            onMouseEnter={!isMobile ? () => setShowInfoTooltip(true) : undefined}
            onMouseLeave={!isMobile ? () => setShowInfoTooltip(false) : undefined}
            onClick={(e) => {
              e.stopPropagation();
              setShowInfoTooltip(!showInfoTooltip);
            }}
          >
            <span className="info-icon">ⓘ</span>
            {showInfoTooltip && (
              <div ref={tooltipRef} className="info-tooltip">
                Ant Opinion 데이터는 '기준일 -1일' 즉, 어제 데이터를 분석하여 제공합니다.
              </div>
            )}
          </span>
        </div>
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
        ) : error && !isProcessingPostData && !loading && stocks.length === 0 && targetDate ? (
          <div className="favorites-no-data-container">
            <div className="no-data-icon">⭐</div>
            <h2>{error.includes('즐겨찾기된 섹터가 없습니다') ? '즐겨찾기된 섹터가 없습니다' : '데이터가 없거나 오류가 발생했습니다'}</h2>
            <p>
              {error.includes('즐겨찾기된 섹터가 없습니다') 
                ? '대시보드에서 관심 있는 섹터를 즐겨찾기에 추가해주세요.' 
                : `${targetDate} 날짜에 데이터가 없습니다. 다른 날짜를 선택해주세요.`}
            </p>
            <div className="no-data-actions">
              {error.includes('즐겨찾기된 섹터가 없습니다') ? (
                <button className="try-other-date-btn" onClick={() => navigate('/')}>
                  대시보드로 이동
                </button>
              ) : (
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
              )}
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
                      handleRemoveFavorite(stock.id);
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
                            backgroundImage: iconPath ? `url(${iconPath})` : 'none' 
                          }}
                          data-fallback={stock.sector.charAt(0)}
                        ></div>
                      );
                    })()}
                    <div className="stock-name">{stock.sector}</div>
                  </div>
                </div>
                <div className="stock-right">
                  <div className="stock-data-column" data-label="종합점수">
                    <div className="stock-data-value score">{stock.totalScore.toFixed(1)}점</div>
                    <div className="stock-data-change score">
                      {stock.scoreChange > 0 ? '+' : ''}{stock.scoreChange.toFixed(1)}%p
                    </div>
                  </div>
                  <div className="stock-data-column" data-label="긍정적 의견">
                    <div className="stock-data-value positive">{stock.positiveOpinions}개</div>
                    <div className="stock-data-change positive">
                      {stock.positiveChange > 0 ? '+' : ''}{stock.positiveChange}%
                    </div>
                  </div>
                  <div className="stock-data-column" data-label="부정적 의견">
                    <div className="stock-data-value negative">{stock.negativeOpinions}개</div>
                    <div className="stock-data-change negative">
                      {stock.negativeChange > 0 ? '+' : ''}{stock.negativeChange}%
                    </div>
                  </div>
                  <div className="stock-data-column" data-label="중립적 의견">
                    <div className="stock-data-value neutral">{stock.neutralOpinions}개</div>
                    <div className="stock-data-change neutral">
                      {stock.neutralChange > 0 ? '+' : ''}{stock.neutralChange}%
                    </div>
                  </div>
                  <div className="stock-data-column" data-label="반응 비율">
                    <div className="reaction-rates">
                      <div className="reaction-rate-item">
                        <span className="reaction-label">긍정</span>
                        <span className="stock-data-value reaction-positive">
                          {calculateReactionRate(stock.positiveOpinions, stock.negativeOpinions, stock.neutralOpinions)}
                          {calculateReactionRate(stock.positiveOpinions, stock.negativeOpinions, stock.neutralOpinions) !== 'N/A' && '%'}
                        </span>
                      </div>
                      <div className="reaction-rate-item">
                        <span className="reaction-label">부정</span>
                        <span className="stock-data-value reaction-negative">
                          {calculateNegativeReactionRate(stock.positiveOpinions, stock.negativeOpinions, stock.neutralOpinions)}
                          {calculateNegativeReactionRate(stock.positiveOpinions, stock.negativeOpinions, stock.neutralOpinions) !== 'N/A' && '%'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* 캘린더 */}

      
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

export default Favorites;
