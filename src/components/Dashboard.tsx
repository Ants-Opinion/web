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

type TimeFilter = '1일' | '1주' | '1개월';

const Dashboard: React.FC = () => {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('1일');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [dataDate, setDataDate] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState({ x: 0, y: 0 });
  const [isProcessingPostData, setIsProcessingPostData] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  
  // 디버깅을 위한 ref 추가
  const stocksRef = useRef<StockItem[]>([]);
  const targetDateRef = useRef<string>('');

  // POST 데이터에서 초기값 읽어오기
  useEffect(() => {
    // location.state에서 POST 데이터 읽기
    const postData = location.state as { filter?: string; date?: string } | null;
    
    if (postData) {
      const { filter, date } = postData;
      
      console.log('=== 대시보드 POST 데이터 읽기 ===');
      console.log('POST 데이터:', postData);
      console.log('filter:', filter);
      console.log('date:', date);
      console.log('현재 timeFilter:', timeFilter);
      console.log('현재 targetDate:', targetDate);
      console.log('==============================');
      
      // POST 데이터가 있을 때는 즉시 오류 상태를 초기화하고 로딩 상태로 설정
      setError('');
      setLoading(true);
      setStocks([]);
      setIsProcessingPostData(true); // POST 데이터 처리 중 표시
      
      let shouldReloadData = false;
      
      if (filter && ['1일', '1주', '1개월'].includes(filter)) {
        if (timeFilter !== filter) {
          console.log('시간 필터 변경:', timeFilter, '->', filter);
          setTimeFilter(filter as TimeFilter);
          shouldReloadData = true;
        } else {
          console.log('시간 필터 동일, 변경 없음:', filter);
        }
      }
      
      if (date) {
        if (targetDate !== date) {
          console.log('날짜 변경:', targetDate, '->', date);
          setTargetDate(date);
          shouldReloadData = true;
        } else {
          console.log('날짜 동일, 변경 없음:', date);
        }
      }
      
      // POST 데이터가 변경되었고, 날짜가 설정되어 있으면 데이터 로딩
      if (shouldReloadData && date) {
        console.log('POST 데이터 변경으로 인한 데이터 재로딩 필요');
        // POST 데이터로 직접 데이터 로딩
        loadDataForPostData(filter as TimeFilter, date);
      } else {
        console.log('데이터 재로딩 불필요');
        // 로딩 상태 해제
        setLoading(false);
      }
      
      // POST 데이터를 사용한 후 state에서 제거 (일회성 사용)
      navigate(location.pathname, { replace: true, state: null });
      console.log('POST 데이터 사용 완료, state에서 제거됨');
      
    } else {
      console.log('POST 데이터가 없음');
    }
  }, [location.state, timeFilter, targetDate, navigate, location.pathname]);

  // 즐겨찾기 상태 초기화 함수
  const initializeFavoriteStates = async (stockData: StockItem[]) => {
    try {
      const stocksWithFavorites = await Promise.all(
        stockData.map(async (stock) => {
          const isFavorite = await isSectorFavorite(stock.id);
          return { ...stock, isFavorite };
        })
      );
      setStocks(stocksWithFavorites);
      stocksRef.current = stocksWithFavorites;
    } catch (error) {
      console.error('즐겨찾기 상태 초기화 오류:', error);
      // 오류가 발생해도 기본 데이터는 표시
      setStocks(stockData);
      stocksRef.current = stockData;
    }
  };

  // POST 데이터를 위한 별도 데이터 로딩 함수
  const loadDataForPostData = async (filter: TimeFilter, date: string) => {
    try {
      console.log('POST 데이터로 직접 데이터 로딩 시작:', { filter, date });
      
      let realStockData: StockItem[] = [];
      
      if (filter === '1주') {
        console.log('1주 필터 선택: 7일간 데이터 합산 중...');
        const weekData = await loadWeekData(date);
        realStockData = weekData;
      } else if (filter === '1개월') {
        console.log('1개월 필터 선택: 30일간 데이터 합산 중...');
        const monthData = await loadMonthData(date);
        realStockData = monthData;
      } else {
        console.log('1일 필터 선택: 단일 날짜 데이터 로딩 중...');
        realStockData = await getRealStockData(date);
      }
      
      console.log('POST 데이터로 로딩된 데이터:', {
        date,
        filter,
        dataLength: realStockData.length,
        dataSample: realStockData.slice(0, 2)
      });
      
      // 즐겨찾기 상태 초기화 후 stocks 상태 업데이트
      await initializeFavoriteStates(realStockData);
      
      setLastUpdated(new Date().toLocaleString('ko-KR'));
      setDataDate(formatDataDate(date));
      
      if (realStockData.length === 0) {
        console.log(`${date} 날짜에 섹터 데이터가 없습니다.`);
        setError(`${date} 날짜에 데이터가 없습니다. 다른 날짜를 선택해주세요.`);
      } else {
        console.log(`${date} 날짜에 ${realStockData.length}개 섹터 데이터 로딩 성공`);
        setError('');
      }
      
    } catch (err) {
      console.error('POST 데이터 로딩 오류:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setIsProcessingPostData(false); // POST 데이터 처리 완료
    }
  };

  // 초기 기준일자 설정 - URL에서 날짜가 없을 때만 실행
  useEffect(() => {
    let isMounted = true;
    
    const initializeDate = async () => {
      try {
        // URL에서 날짜가 이미 설정되어 있으면 그 값을 사용
        if (targetDate) {
          console.log('이미 설정된 날짜 사용:', targetDate);
          return;
        }
        
        // URL에서 날짜가 없을 때만 최신 날짜 가져오기
        const latestDate = await getLatestDate();
        if (isMounted && !targetDate) {
          setTargetDate(latestDate);
          console.log('최신 날짜로 초기화:', latestDate);
        }
      } catch (error) {
        console.error('초기 기준일자 설정 오류:', error);
        // 오류 발생 시 기본값으로 어제 날짜 설정 (URL에서 날짜가 없을 때만)
        if (isMounted && !targetDate) {
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          const yesterdayString = yesterday.toISOString().split('T')[0];
          setTargetDate(yesterdayString);
          console.log('오류로 인해 어제 날짜로 설정:', yesterdayString);
        }
      }
    };

    // targetDate가 설정되지 않았을 때만 실행
    if (!targetDate) {
      initializeDate();
    }
    
    return () => {
      isMounted = false;
    };
  }, []); // 빈 의존성 배열로 한 번만 실행

  // 시간 필터 변경 핸들러
  const handleTimeFilterChange = (filter: TimeFilter) => {
    console.log('시간 필터 변경:', filter, '현재 로딩 상태:', loading);
    setTimeFilter(filter);
    
    // timeFilter 변경 시 현재 targetDate로 데이터 다시 로딩
    if (targetDate) {
      console.log('🔄 timeFilter 변경으로 인한 데이터 재로딩 시작:', filter);
      loadDataForCurrentDate();
    }
  };
  
  // 현재 날짜의 데이터를 로딩하는 함수
  const loadDataForCurrentDate = async () => {
    if (!targetDate) return;
    

    
    console.log('=== timeFilter 변경으로 인한 데이터 재로딩 ===');
    console.log('🎯 로딩할 날짜:', targetDate);
    console.log('🎯 선택된 필터:', timeFilter);
    
    setLoading(true);
    setError('');
    
    try {
      let realStockData: StockItem[] = [];
      
      if (timeFilter === '1주') {
        console.log('1주 필터 선택: 7일간 데이터 합산 중...');
        const weekData = await loadWeekData(targetDate);
        realStockData = weekData;
      } else if (timeFilter === '1개월') {
        console.log('1개월 필터 선택: 30일간 데이터 합산 중...');
        const monthData = await loadMonthData(targetDate);
        realStockData = monthData;
      } else {
        console.log('1일 필터 선택: 단일 날짜 데이터 로딩 중...');
        realStockData = await getRealStockData(targetDate);
      }
      
      console.log('📊 timeFilter 변경 후 로딩된 데이터:', {
        length: realStockData.length,
        isEmpty: realStockData.length === 0,
        targetDate: targetDate,
        filter: timeFilter
      });
      
              await initializeFavoriteStates(realStockData);
        setLastUpdated(new Date().toLocaleString('ko-KR'));
        setDataDate(formatDataDate(targetDate));
      
      if (realStockData.length === 0) {
        setError(`${targetDate} 날짜에 데이터가 없습니다. 다른 날짜를 선택해주세요.`);
      } else {
        setError('');
      }
    } catch (err) {
      console.error('timeFilter 변경 시 데이터 로딩 오류:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 이전 날짜로 이동
  const handlePreviousDay = () => {
    if (!loading) {
      const newDate = new Date(targetDate);
      newDate.setDate(newDate.getDate() - 1);
      setTargetDate(newDate.toISOString().split('T')[0]);
    }
  };

  // 다음 날짜로 이동
  const handleNextDay = () => {
    if (!loading) {
      const newDate = new Date(targetDate);
      newDate.setDate(newDate.getDate() + 1);
      setTargetDate(newDate.toISOString().split('T')[0]);
    }
  };

  // 데이터 날짜 포맷팅
  const formatDataDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  useEffect(() => {
    // targetDate가 설정되지 않았으면 실행하지 않음
    if (!targetDate) return;
    
    // POST 데이터가 있으면 기존 데이터 로딩 로직을 건너뜀
    if (location.state) {
      console.log('POST 데이터가 있어서 기존 데이터 로딩 로직을 건너뜀');
      return;
    }
    
    console.log('🔄 useEffect 실행 - targetDate 변경됨:', targetDate);
    console.log('🧹 stocks 상태 즉시 초기화 (useEffect 시작 시)');
    console.log('📊 이전 stocks 상태:', stocks.length, '개');
    console.log('📊 이전 stocksRef 상태:', stocksRef.current.length, '개');
    
    // 즉시 데이터 로딩 시작
    console.log('🚀 즉시 데이터 로딩 시작:', targetDate);
    
    // stocks 상태 초기화
    setStocks([]);
    stocksRef.current = [];
    
    // targetDate ref 업데이트
    targetDateRef.current = targetDate;
    
    // async 함수로 데이터 로딩
    const loadData = async () => {
      // 로딩 상태 설정
      setLoading(true);
      setError('');
      
      try {
        console.log('실제 Firebase 데이터 로딩 시작...', targetDate);
        
        let realStockData: StockItem[] = [];
        
        if (timeFilter === '1주') {
          console.log('1주 필터 선택: 7일간 데이터 합산 중...');
          const weekData = await loadWeekData(targetDate);
          realStockData = weekData;
        } else if (timeFilter === '1개월') {
          console.log('1개월 필터 선택: 30일간 데이터 합산 중...');
          const monthData = await loadMonthData(targetDate);
          realStockData = monthData;
        } else {
          console.log('1일 필터 선택: 단일 날짜 데이터 로딩 중...');
          console.log('🔍 getRealStockData 호출 전:', targetDate);
          realStockData = await getRealStockData(targetDate);
          console.log('🔍 getRealStockData 호출 후 결과:', {
            length: realStockData.length,
            data: realStockData.slice(0, 3)
          });
        }
        
        console.log('로딩된 데이터 상세:', {
          targetDate,
          dataLength: realStockData.length,
          dataSample: realStockData.slice(0, 2),
          allSectors: realStockData.map(s => s.sector)
        });
        
        console.log('📊 setStocks 호출 전 realStockData:', {
          length: realStockData.length,
          isEmpty: realStockData.length === 0,
          sample: realStockData.slice(0, 2)
        });
        
        // 즐겨찾기 상태 초기화 후 stocks 상태 업데이트 및 ref 동기화
        await initializeFavoriteStates(realStockData);
        
        setLastUpdated(new Date().toLocaleString('ko-KR'));
        setDataDate(formatDataDate(targetDate));
        console.log('✅ 섹터 데이터 로딩 완료:', realStockData.length, '개 섹터');
        console.log('📊 stocksRef.current 업데이트됨:', stocksRef.current.length, '개');
        
        if (realStockData.length === 0) {
          console.log(`${targetDate} 날짜에 섹터 데이터가 없습니다.`);
          setError(`${targetDate} 날짜에 데이터가 없습니다. 다른 날짜를 선택해주세요.`);
        } else {
          console.log(`${targetDate} 날짜에 ${realStockData.length}개 섹터 데이터 로딩 성공`);
          setError('');
        }
      } catch (err) {
        console.error('데이터 로딩 오류:', err);
        if (err instanceof Error && err.message.includes('타임아웃')) {
          setError('데이터 로딩 시간이 초과되었습니다. 네트워크 연결을 확인하고 다시 시도해주세요.');
        } else {
          setError('데이터를 불러오는 중 오류가 발생했습니다. Firebase 연결을 확인해주세요.');
        }
      } finally {
        setLoading(false);
      }
    };

    // 데이터 로딩 실행
    loadData();
  }, [targetDate, timeFilter]); // location.state는 의존성에서 제외

  // timeFilter 변경 시에는 데이터를 다시 로딩하지 않음
  // 모든 데이터 로딩은 targetDate 변경 시에만 처리

  // 1주 데이터 로드 함수
  const loadWeekData = async (baseDate: string): Promise<StockItem[]> => {
    try {
      const baseDateObj = new Date(baseDate);
      const weekData: StockItem[] = [];
      
      // 기준일자로부터 7일전까지의 데이터를 가져와서 합산
      for (let i = 0; i < 7; i++) {
        const targetDate = new Date(baseDateObj);
        targetDate.setDate(baseDateObj.getDate() - i);
        const dateString = targetDate.toISOString().split('T')[0];
        
        try {
          const dailyData = await getRealStockData(dateString);
          if (dailyData.length > 0) {
            weekData.push(...dailyData);
          }
        } catch (error) {
          console.log(`${dateString} 데이터 로드 실패, 건너뜀`);
        }
      }
      
      // 데이터가 하나도 없는 경우 빈 배열 반환
      if (weekData.length === 0) {
        console.log(`${baseDate} 기준으로 7일간 데이터가 없습니다.`);
        return [];
      }
      
      // 섹터별로 데이터 합산
      const sectorMap = new Map<string, StockItem>();
      
      weekData.forEach(item => {
        if (sectorMap.has(item.sector)) {
          const existing = sectorMap.get(item.sector)!;
          existing.totalScore += item.totalScore;
          existing.positiveOpinions += item.positiveOpinions;
          existing.negativeOpinions += item.negativeOpinions;
          existing.neutralOpinions += item.neutralOpinions;
          // 평균 계산을 위해 점수는 나중에 처리
        } else {
          sectorMap.set(item.sector, { ...item });
        }
      });
      
      // 섹터별 평균 점수 계산 및 정렬
      const aggregatedData = Array.from(sectorMap.values()).map(item => ({
        ...item,
        totalScore: Math.round(item.totalScore / 7), // 7일 평균
        // 변화량은 계산하지 않음 (1주 데이터에서는 의미 없음)
        scoreChange: 0,
        positiveChange: 0,
        negativeChange: 0,
        neutralChange: 0,
        reactionChange: 0
      }));
      
      // 총점 기준으로 정렬
      return aggregatedData.sort((a, b) => b.totalScore - a.totalScore);
      
    } catch (error) {
      console.error('주간 데이터 로드 오류:', error);
      return [];
    }
  };

  // 1개월 데이터 로드 함수
  const loadMonthData = async (baseDate: string): Promise<StockItem[]> => {
    try {
      const baseDateObj = new Date(baseDate);
      const monthData: StockItem[] = [];
      
      // 기준일자로부터 30일전까지의 데이터를 가져와서 합산
      for (let i = 0; i < 30; i++) {
        const targetDate = new Date(baseDateObj);
        targetDate.setDate(baseDateObj.getDate() - i);
        const dateString = targetDate.toISOString().split('T')[0];
        
        try {
          const dailyData = await getRealStockData(dateString);
          if (dailyData.length > 0) {
            monthData.push(...dailyData);
          }
        } catch (error) {
          console.log(`${dateString} 데이터 로드 실패, 건너뜀`);
        }
      }
      
      // 데이터가 하나도 없는 경우 빈 배열 반환
      if (monthData.length === 0) {
        console.log(`${baseDate} 기준으로 30일간 데이터가 없습니다.`);
        return [];
      }
      
      // 섹터별로 데이터 합산
      const sectorMap = new Map<string, StockItem>();
      
      monthData.forEach(item => {
        if (sectorMap.has(item.sector)) {
          const existing = sectorMap.get(item.sector)!;
          existing.totalScore += item.totalScore;
          existing.positiveOpinions += item.positiveOpinions;
          existing.negativeOpinions += item.negativeOpinions;
          existing.neutralOpinions += item.neutralOpinions;
          // 평균 계산을 위해 점수는 나중에 처리
        } else {
          sectorMap.set(item.sector, { ...item });
        }
      });
      
      // 섹터별 평균 점수 계산 및 정렬
      const aggregatedData = Array.from(sectorMap.values()).map(item => ({
        ...item,
        totalScore: Math.round(item.totalScore / 30), // 30일 평균
        // 변화량은 계산하지 않음 (1개월 데이터에서는 의미 없음)
        scoreChange: 0,
        positiveChange: 0,
        negativeChange: 0,
        neutralChange: 0,
        reactionChange: 0
      }));
      
      // 총점 기준으로 정렬
      return aggregatedData.sort((a, b) => b.totalScore - a.totalScore);
      
    } catch (error) {
      console.error('월간 데이터 로드 오류:', error);
      return [];
    }
  };

  const handleFavoriteToggle = async (stockId: string, sectorName: string) => {
    try {
      const stock = stocks.find(s => s.id === stockId);
      if (!stock) return;

      if (stock.isFavorite) {
        // 즐겨찾기에서 제거
        await removeFromFavorites(stockId);
        console.log('즐겨찾기에서 제거됨:', sectorName);
      } else {
        // 즐겨찾기에 추가
        await addToFavorites(stockId, sectorName);
        console.log('즐겨찾기에 추가됨:', sectorName);
      }

      // 로컬 상태 업데이트
      setStocks(prevStocks =>
        prevStocks.map(s =>
          s.id === stockId
            ? { ...s, isFavorite: !s.isFavorite }
            : s
        )
      );
    } catch (error) {
      console.error('즐겨찾기 토글 오류:', error);
      // 오류 발생 시 사용자에게 알림
      alert('즐겨찾기 변경 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 캘린더 관련 함수들
  const handleDateClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // 캘린더 크기 (대략적인 값)
    const calendarWidth = 320;
    const calendarHeight = 400;
    
    // x 위치 계산 (화면 오른쪽 경계를 벗어나지 않도록)
    let x = rect.left;
    if (x + calendarWidth > windowWidth) {
      x = windowWidth - calendarWidth - 20;
    }
    
    // y 위치 계산 (화면 아래쪽 경계를 벗어나지 않도록)
    let y = rect.bottom + 8;
    if (y + calendarHeight > windowHeight) {
      y = rect.top - calendarHeight - 8;
    }
    
    setCalendarPosition({ x, y });
    setIsCalendarOpen(true);
  };

  const handleCalendarClose = () => {
    setIsCalendarOpen(false);
  };

  const handleDateSelect = (date: string) => {
    setTargetDate(date);
    setIsCalendarOpen(false);
  };



  const handleRowClick = (stock: StockItem) => {
    // 섹터 상세 페이지로 이동 (timeFilter와 targetDate 상태 포함)
    // URL 인코딩 처리
    const encodedFilter = encodeURIComponent(timeFilter);
    const encodedDate = encodeURIComponent(targetDate);
    navigate(`/sector/${stock.id}?filter=${encodedFilter}&date=${encodedDate}`);
  };

  // 반응 비율 계산 함수 (0으로 나누기 방지)
  const calculateReactionRate = (positive: number, negative: number, neutral: number) => {
    const total = positive + negative + neutral;
    if (total === 0) return 'N/A';
    return Math.round((positive / total) * 100);
  };

  const calculateNegativeReactionRate = (positive: number, negative: number, neutral: number) => {
    const total = positive + negative + neutral;
    if (total === 0) return 'N/A';
    return Math.round((negative / total) * 100);
  };

  // 섹터명을 아이콘 파일명으로 매핑하는 함수
  const getSectorIconPath = (sectorName: string): string => {
    console.log('Dashboard - getSectorIconPath 호출됨, 섹터명:', sectorName);
    
    const sectorIconMap: { [key: string]: string } = {
      // 한글 섹터명
      'IT': 'Icon_Sector=IT.png',
      '반도체': 'Icon_Sector=Semiconductor.png',
      '게임': 'Icon_Sector=Game.png',
      '화장품': 'Icon_Sector=Cosmatic.png',
      '스킨케어': 'Icon_Sector=SkinCare.png',
      '피부미용': 'Icon_Sector=SkinCare.png',
      '자동차': 'Icon_Sector=Car.png',
      '건설': 'Icon_Sector=Construction.png',
      '화학': 'Icon_Sector=Chemistry.png',
      '철강': 'Icon_Sector=Iron.png',
      '전기': 'Icon_Sector=Electricity.png',
      '2차전기': 'Icon_Sector=SecondaryElectricity.png',
      '이차전지': 'Icon_Sector=SecondaryElectricity.png',
      '풍력에너지': 'Icon_Sector=WindEnergy.png',
      '수소': 'Icon_Sector=Hydrogen.png',
      '원자력에너지': 'Icon_Sector=NuclarEnergy.png',
      '원전': 'Icon_Sector=NuclarEnergy.png',
      '방산산업': 'Icon_Sector=DefenceIndustry.png',
      '은행': 'Icon_Sector=Bank.png',
      '보험': 'Icon_Sector=Insurance.png',
      '유통': 'Icon_Sector=Distribution.png',
      '식품': 'Icon_Sector=Food.png',
      '음식료': 'Icon_Sector=Food.png',
      '패션': 'Icon_Sector=Fashion.png',
      '엔터테인먼트': 'Icon_Sector=Entertainment.png',
      '여행': 'Icon_Sector=Travel.png',
      '선박': 'Icon_Sector=Vessle.png',
      '조선': 'Icon_Sector=Vessle.png',
      '디스플레이': 'Icon_Sector=Display.png',
      '바이오테크': 'Icon_Sector=Biotech.png',
      '임플란트': 'Icon_Sector=Implant.png',
      '전선': 'Icon_Sector=Wire.png',
      
      // 영문 섹터명
      'Bank': 'Icon_Sector=Bank.png',
      'Biotech': 'Icon_Sector=Biotech.png',
      'Car': 'Icon_Sector=Car.png',
      'Chemistry': 'Icon_Sector=Chemistry.png',
      'Construction': 'Icon_Sector=Construction.png',
      'Cosmatic': 'Icon_Sector=Cosmatic.png',
      'DefenceIndustry': 'Icon_Sector=DefenceIndustry.png',
      'Display': 'Icon_Sector=Display.png',
      'Distribution': 'Icon_Sector=Distribution.png',
      'Electricity': 'Icon_Sector=Electricity.png',
      'SecondaryElectricity': 'Icon_Sector=SecondaryElectricity.png',
      'Entertainment': 'Icon_Sector=Entertainment.png',
      'Fashion': 'Icon_Sector=Fashion.png',
      'Food': 'Icon_Sector=Food.png',
      'Game': 'Icon_Sector=Game.png',
      'Hydrogen': 'Icon_Sector=Hydrogen.png',
      'Implant': 'Icon_Sector=Implant.png',
      'Insurance': 'Icon_Sector=Insurance.png',
      'Iron': 'Icon_Sector=Iron.png',
      'NuclarEnergy': 'Icon_Sector=NuclarEnergy.png',
      'Semiconductor': 'Icon_Sector=Semiconductor.png',
      'SkinCare': 'Icon_Sector=SkinCare.png',
      'Travel': 'Icon_Sector=Travel.png',
      'Vessle': 'Icon_Sector=Vessle.png',
      'WindEnergy': 'Icon_Sector=WindEnergy.png',
      'Wire': 'Icon_Sector=Wire.png'
    };

    // 정확한 매칭 시도
    if (sectorIconMap[sectorName]) {
      const path = `/img/Sector_Icon/${sectorIconMap[sectorName]}`;
      console.log('Dashboard - 정확한 매칭 성공:', sectorName, '->', path);
      return path;
    }

    // 부분 매칭 시도 (더 유연하게)
    for (const [key, value] of Object.entries(sectorIconMap)) {
      // 대소문자 구분 없이 매칭
      if (sectorName.toLowerCase().includes(key.toLowerCase()) || 
          key.toLowerCase().includes(sectorName.toLowerCase())) {
        const path = `/img/Sector_Icon/${value}`;
        console.log('Dashboard - 부분 매칭 성공:', sectorName, '->', key, '->', path);
        return path;
      }
    }

    // 유연한 매칭 시도
    const flexibleMatches: { [key: string]: string } = {
      '전기': 'Icon_Sector=Electricity.png',
      '2차전기': 'Icon_Sector=SecondaryElectricity.png',
      '이차전지': 'Icon_Sector=SecondaryElectricity.png',
      '조선': 'Icon_Sector=Vessle.png',
      '선박': 'Icon_Sector=Vessle.png',
      'IT': 'Icon_Sector=IT.png',
      '반도체': 'Icon_Sector=Semiconductor.png',
      '게임': 'Icon_Sector=Game.png',
      '화장품': 'Icon_Sector=Cosmatic.png',
      '스킨케어': 'Icon_Sector=SkinCare.png',
      '피부미용': 'Icon_Sector=SkinCare.png',
      '자동차': 'Icon_Sector=Car.png',
      '건설': 'Icon_Sector=Construction.png',
      '화학': 'Icon_Sector=Chemistry.png',
      '철강': 'Icon_Sector=Iron.png',
      '풍력': 'Icon_Sector=WindEnergy.png',
      '수소': 'Icon_Sector=Hydrogen.png',
      '원자력': 'Icon_Sector=NuclarEnergy.png',
      '원전': 'Icon_Sector=NuclarEnergy.png',
      '방산': 'Icon_Sector=DefenceIndustry.png',
      '은행': 'Icon_Sector=Bank.png',
      '보험': 'Icon_Sector=Insurance.png',
      '유통': 'Icon_Sector=Distribution.png',
      '식품': 'Icon_Sector=Food.png',
      '음식료': 'Icon_Sector=Food.png',
      '패션': 'Icon_Sector=Fashion.png',
      '엔터테인먼트': 'Icon_Sector=Entertainment.png',
      '여행': 'Icon_Sector=Travel.png',
      '디스플레이': 'Icon_Sector=Display.png',
      '바이오': 'Icon_Sector=Biotech.png',
      '임플란트': 'Icon_Sector=Implant.png',
      '전선': 'Icon_Sector=Wire.png'
    };

    for (const [key, value] of Object.entries(flexibleMatches)) {
      if (sectorName.toLowerCase().includes(key.toLowerCase()) || 
          key.toLowerCase().includes(sectorName.toLowerCase())) {
        const path = `/img/Sector_Icon/${value}`;
        console.log('Dashboard - 유연한 매칭 성공:', sectorName, '->', key, '->', path);
        return path;
      }
    }

    // 추가 매칭 시도 (더 세밀한 매칭)
    const additionalMatches: { [key: string]: string } = {
      '피부': 'Icon_Sector=SkinCare.png',
      '미용': 'Icon_Sector=SkinCare.png',
      '전지': 'Icon_Sector=SecondaryElectricity.png',
      '배터리': 'Icon_Sector=SecondaryElectricity.png',
      '에너지': 'Icon_Sector=Electricity.png',
      '전력': 'Icon_Sector=Electricity.png',
      '핵': 'Icon_Sector=NuclarEnergy.png',
      '원자력': 'Icon_Sector=NuclarEnergy.png',
      '반도체': 'Icon_Sector=Semiconductor.png',
      '칩': 'Icon_Sector=Semiconductor.png',
      '게임': 'Icon_Sector=Game.png',
      '엔터테인먼트': 'Icon_Sector=Entertainment.png',
      '미디어': 'Icon_Sector=Entertainment.png',
      '화장품': 'Icon_Sector=Cosmatic.png',
      '뷰티': 'Icon_Sector=Cosmatic.png',
      '자동차': 'Icon_Sector=Car.png',
      '차량': 'Icon_Sector=Car.png',
      '건설': 'Icon_Sector=Construction.png',
      '건축': 'Icon_Sector=Construction.png',
      '화학': 'Icon_Sector=Chemistry.png',
      '철강': 'Icon_Sector=Iron.png',
      '금속': 'Icon_Sector=Iron.png',
      '선박': 'Icon_Sector=Vessle.png',
      '조선': 'Icon_Sector=Vessle.png',
      '운송': 'Icon_Sector=Distribution.png',
      '유통': 'Icon_Sector=Distribution.png',
      '식품': 'Icon_Sector=Food.png',
      '음식': 'Icon_Sector=Food.png',
      '패션': 'Icon_Sector=Fashion.png',
      '의류': 'Icon_Sector=Fashion.png',
      '여행': 'Icon_Sector=Travel.png',
      '관광': 'Icon_Sector=Travel.png',
      '디스플레이': 'Icon_Sector=Display.png',
      '화면': 'Icon_Sector=Display.png',
      '바이오': 'Icon_Sector=Biotech.png',
      '생명': 'Icon_Sector=Biotech.png',
      '임플란트': 'Icon_Sector=Implant.png',
      '의료': 'Icon_Sector=Implant.png',
      '전선': 'Icon_Sector=Wire.png',
      '케이블': 'Icon_Sector=Wire.png'
    };

    for (const [key, value] of Object.entries(additionalMatches)) {
      if (sectorName.toLowerCase().includes(key.toLowerCase()) || 
          key.toLowerCase().includes(sectorName.toLowerCase())) {
        const path = `/img/Sector_Icon/${value}`;
        console.log('Dashboard - 추가 매칭 성공:', sectorName, '->', key, '->', path);
        return path;
      }
    }

    console.log('Dashboard - 매칭 실패, 기본 아이콘 사용:', sectorName);
    return '';
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Header currentPage="home" />
        
        {/* 메인 제목 */}
        <div className="main-title-container">
          <div className="main-title">사람들의 반응</div>
          <div className="subtitle">{new Date(targetDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 기준</div>
        </div>
        
        {/* 날짜 변경 컨트롤 - 기존 기능 유지 */}
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
            <button 
              className={`date-filter-btn ${timeFilter === '1개월' ? 'active' : ''}`}
              onClick={() => handleTimeFilterChange('1개월')}
            >
              <span className="date-filter-text">1개월</span>
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
        
        {/* 로딩 상태 */}
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-progress">
            <div className="loading-progress-bar"></div>
          </div>
          <div className="loading-text">데이터를 불러오는 중...</div>
          <div className="loading-text" style={{ fontSize: '14px', color: '#999' }}>
            {targetDate} 날짜의 섹터 데이터를 가져오는 중입니다
          </div>
          <div className="loading-actions">
            <button 
              className="force-reset-btn" 
              onClick={() => {
                console.log('강제 로딩 상태 리셋');
                setLoading(false);
                setError('로딩이 중단되었습니다. 다시 시도해주세요.');
              }}
            >
              로딩 중단
            </button>
          </div>
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
  }

  // 에러가 있거나 데이터가 없을 때도 헤더와 풋터는 표시
  // 단, 로딩 중이거나 POST 데이터가 있을 때는 오류 메시지를 표시하지 않음
  if (error && !loading && !location.state && !isProcessingPostData) {
    return (
      <div className="dashboard-container">
        <Header currentPage="home" />
        
        {/* 메인 제목 */}
        <div className="main-title-container">
          <div className="main-title">사람들의 반응</div>
          <div className="subtitle">{new Date(targetDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 기준</div>
        </div>
        
        {/* 날짜 변경 컨트롤 - 기존 기능 유지 */}
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
            <button 
              className={`date-filter-btn ${timeFilter === '1개월' ? 'active' : ''}`}
              onClick={() => handleTimeFilterChange('1개월')}
            >
              <span className="date-filter-text">1개월</span>
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
        
        {/* 에러 메시지 */}
        <div className="no-data-container">
          <div className="no-data-icon">⚠️</div>
          <h2>데이터가 없거나 오류가 발생했습니다</h2>
          <p>{error}</p>
          <div className="no-data-actions">
            <button className="try-other-date-btn" onClick={() => window.location.reload()}>
              새로고침
            </button>
          </div>
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
  }

  return (
    <div className="dashboard-container">
      <Header currentPage="home" />
      
      {/* 메인 제목 */}
      <div className="main-title-container">
        <div className="main-title">사람들의 반응</div>
        <div className="subtitle">{new Date(targetDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 기준</div>
      </div>
      
      {/* 날짜 변경 컨트롤 - 기존 기능 유지 */}
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
          <button 
            className={`date-filter-btn ${timeFilter === '1개월' ? 'active' : ''}`}
            onClick={() => handleTimeFilterChange('1개월')}
          >
            <span className="date-filter-text">1개월</span>
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
          // POST 데이터가 없고 로딩 중이 아니고 POST 데이터 처리 중이 아닐 때만 오류 메시지 표시
          <div className="favorites-no-data-container">
            <div className="no-data-icon">⚠️</div>
            <h2>데이터가 없거나 오류가 발생했습니다</h2>
            <p>{targetDate} 날짜에 데이터가 없습니다. 다른 날짜를 선택해주세요.</p>
            <div className="no-data-actions">
              <button className="try-other-date-btn" onClick={() => handleTimeFilterChange('1일')}>
                새로고침
              </button>
            </div>
          </div>
        ) : stocks.length === 0 && !location.state && !loading && !isProcessingPostData ? (
          // POST 데이터가 없고 로딩 중이 아니고 POST 데이터 처리 중이 아닐 때만 데이터 없음 메시지 표시
          <div className="favorites-no-data-container">
            <div className="no-data-icon">⚠️</div>
            <h2>데이터가 없거나 오류가 발생했습니다</h2>
            <p>{targetDate} 날짜에 데이터가 없습니다. 다른 날짜를 선택해주세요.</p>
            <div className="no-data-actions">
              <button className="try-other-date-btn" onClick={() => handleTimeFilterChange('1일')}>
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
                      e.stopPropagation(); // 행 클릭 이벤트 전파 방지
                      handleFavoriteToggle(stock.id, stock.sector);
                    }}
                  >
                    {stock.isFavorite ? '★' : '☆'}
                  </div>
                  <div className="stock-rank">{index + 1}</div>
                  <div className="stock-info">
                    {(() => {
                      const iconPath = getSectorIconPath(stock.sector);
                      console.log(`Dashboard - 섹터: ${stock.sector}, 아이콘 경로: ${iconPath}`);
                      
                      return (
                        <div 
                          className="stock-icon" 
                          style={{ 
                            backgroundImage: iconPath ? `url(${iconPath})` : 'none' 
                          }}
                          data-fallback={stock.sector.charAt(0)}
                          onLoad={() => console.log(`Dashboard - 이미지 로드 성공: ${iconPath}`)}
                          onError={() => console.error(`Dashboard - 이미지 로드 실패: ${iconPath}`)}
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
