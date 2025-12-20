import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getSentimentCriteria, /* classifySentiment, */ initializeSentimentCriteria } from '../services/sentimentService';
import { getSectorIconPath } from '../services/sectorIconService';
// import { getRealStockData } from '../services/realDataService';
import Header from './Header';
import Footer from './Footer';
import ReactionModal from './ReactionModal';
import Calendar from './Calendar';
import './SectorDetail.css';

interface ReactionItem {
  id: string;
  title: string;
  content: string;
  source: string;
  time: string;
  views: number;
}

interface DetailReactionItem {
  id: string;
  title: string;
  content: string;
  source: string;
  time: string;
  views: number;
  score: number;
  sector: string;
  date: string;
}

interface SectorDetailData {
  sectorId: string;
  date: string;
  summary: {
    positive: string;
    negative: string;
    neutral: string;
  };
  headline: {
    positive: string;
    negative: string;
    neutral: string;
  };
  reactions: ReactionItem[];
  counts: {
    positive: number;
    negative: number;
    neutral: number;
  };
  icon?: string; // 섹터별 아이콘 URL
}

const SectorDetail: React.FC = () => {
  const { sectorId } = useParams<{ sectorId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<SectorDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'positive' | 'negative' | 'neutral'>('positive');
  const [modalTitle, setModalTitle] = useState('');
  const [modalReactions, setModalReactions] = useState<ReactionItem[]>([]);
  // const [sentimentCriteria, setSentimentCriteria] = useState<SentimentCriteria | null>(null);
  const [timeFilter, setTimeFilter] = useState<'1일' | '1주'>('1일');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState({ x: 0, y: 0 });
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [showFormulaTooltip, setShowFormulaTooltip] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const infoTooltipRef = useRef<HTMLSpanElement>(null);
  const infoTooltipWrapperRef = useRef<HTMLSpanElement>(null);
  const formulaTooltipRef = useRef<HTMLSpanElement>(null);
  const formulaTooltipWrapperRef = useRef<HTMLSpanElement>(null);
  const [totalScore, setTotalScore] = useState<number>(0);

  // 오늘 기준 날짜 (오늘 -1일) 확인 함수
  const getLatestDateString = (): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  useEffect(() => {
    // 사용자 인증 상태 확인
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

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

  // Info 툴팁 위치 조정
  useEffect(() => {
    if (showInfoTooltip && infoTooltipRef.current && infoTooltipWrapperRef.current) {
      const tooltip = infoTooltipRef.current;
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

  // Formula 툴팁 위치 조정
  useEffect(() => {
    if (showFormulaTooltip && formulaTooltipRef.current && formulaTooltipWrapperRef.current) {
      const tooltip = formulaTooltipRef.current;
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
  }, [showFormulaTooltip]);

  useEffect(() => {
    // URL 파라미터에서 timeFilter와 date 읽어오기
    const filter = searchParams.get('filter') || '1일';
    const date = searchParams.get('date') || '';
    
    // URL 디코딩 처리
    const decodedFilter = decodeURIComponent(filter);
    const decodedDate = decodeURIComponent(date);
    
    setTimeFilter(decodedFilter as '1일' | '1주');
    setSelectedDate(decodedDate);
    console.log(`선택된 시간 필터: ${decodedFilter}, 선택된 날짜: ${decodedDate}`);
    
    // 1일 필터인데 날짜가 없으면 기본값으로 실제 데이터가 있는 날짜 설정
    if (decodedFilter === '1일' && !decodedDate) {
      const defaultDate = '2025-08-17'; // 실제 데이터가 있는 날짜
      setSelectedDate(defaultDate);
      console.log(`1일 필터에 날짜가 없어 기본값으로 설정: ${defaultDate}`);
    }
  }, [searchParams]);



    useEffect(() => {
    const fetchSectorDetail = async () => {
      if (!sectorId) return;

      try {
        setLoading(true);
        setError('');
        console.log(`=== 섹터 ${sectorId} 세부 정보 로딩 시작 ===`);
        console.log(`선택된 시간 필터: ${timeFilter}`);
        console.log(`선택된 날짜: ${selectedDate || '없음'}`);
        console.log(`현재 시간: ${new Date().toISOString()}`);

        // 감정 분류 기준 초기화 및 로드
        console.log('감정 분류 기준 초기화 시작...');
        await initializeSentimentCriteria();
      const criteria = await getSentimentCriteria();
      // setSentimentCriteria(criteria);
        console.log('감정 분류 기준 로드 완료:', criteria);

        let sectorData;
        
        if (timeFilter === '1주') {
          // 1주 필터: 7일간 데이터 합산
          console.log('1주 필터 선택: 7일간 데이터 합산 중...');
          sectorData = await loadWeekSectorData(sectorId, selectedDate || new Date().toISOString().split('T')[0]);
        } else {
          // 1일 필터: 단일 날짜 데이터
          console.log('1일 필터 선택: 단일 날짜 데이터 로딩 중...');
          sectorData = await loadDailySectorData(sectorId);
        }

        if (sectorData) {
          setData(sectorData);
          
          // 종합점수 가져오기
          const score = await getTotalScoreForSector(sectorId, selectedDate || new Date().toISOString().split('T')[0]);
          setTotalScore(score);
          console.log('종합점수:', score);
          
          console.log('=== 섹터 데이터 로딩 완료 ===');
          console.log('데이터 구조:', {
            sectorId: sectorData.sectorId,
            date: sectorData.date,
            counts: sectorData.counts,
            summaryKeys: Object.keys(sectorData.summary),
            summaryValues: sectorData.summary,
            headlineKeys: Object.keys(sectorData.headline),
            headlineValues: sectorData.headline,
            reactionsCount: sectorData.reactions.length,
            reactionsSample: sectorData.reactions.slice(0, 2), // 처음 2개만 표시
            icon: sectorData.icon
          });
          console.log('데이터 소스 경로:', `sector_detail/${sectorData.sectorId}/dates/${sectorData.date}`);
          console.log('로딩된 데이터 날짜:', sectorData.date);
          console.log('선택된 날짜:', selectedDate || '없음');
        } else {
          // 선택한 날짜에 데이터가 없는 경우
          const selectedDateDisplay = selectedDate ? new Date(selectedDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '오늘';
          const errorMessage = `섹터 "${sectorId}"의 ${selectedDateDisplay} ${timeFilter === '1일' ? '데이터를 찾을 수 없습니다' : timeFilter === '1주' ? '최근 7일간 데이터를 찾을 수 없습니다' : '최근 30일간 데이터를 찾을 수 없습니다'}. 다른 날짜를 선택하거나 홈으로 돌아가서 다른 섹터를 확인해보세요.`;
          setError(errorMessage);
          console.log('=== 섹터 데이터 로딩 실패 ===');
          console.log('오류 메시지:', errorMessage);
          console.log('시도한 데이터베이스 경로:');
          console.log(`- sector_detail/${sectorId}/dates/${selectedDate || '오늘'}`);
          console.log(`- sector_score/${sectorId}/dates/${selectedDate || '오늘'}`);
        }
      } catch (err) {
        console.error('=== 섹터 세부 정보 로딩 오류 ===');
        console.error('오류 객체:', err);
        console.error('오류 타입:', typeof err);
        console.error('오류 메시지:', err instanceof Error ? err.message : '알 수 없는 오류');
        console.error('오류 스택:', err instanceof Error ? err.stack : '스택 정보 없음');
        
        let errorMessage = '데이터를 불러오는 중 오류가 발생했습니다.';
        
        if (err instanceof Error) {
          if (err.message.includes('permission-denied')) {
            errorMessage = '데이터에 접근할 권한이 없습니다. 로그인 상태를 확인해주세요.';
          } else if (err.message.includes('not-found')) {
            errorMessage = `섹터 "${sectorId}"의 데이터를 찾을 수 없습니다.`;
          } else if (err.message.includes('unavailable')) {
            errorMessage = '서비스가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.';
          } else {
            errorMessage = `데이터 로딩 오류: ${err.message}`;
          }
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
        console.log('=== 데이터 로딩 프로세스 완료 ===');
      }
    };

    // selectedDate가 있을 때만 실행
    if (selectedDate) {
      fetchSectorDetail();
    } else {
      console.log('selectedDate가 없어 데이터 로딩을 건너뜁니다.');
    }
  }, [sectorId, timeFilter, selectedDate]); // selectedDate가 변경될 때만 재실행



  const loadWeekSectorData = async (sectorId: string, baseDate: string) => {
    const weekData: SectorDetailData[] = [];
    const base = new Date(baseDate);

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(base);
      currentDate.setDate(base.getDate() - i);
      const formattedDate = currentDate.toISOString().split('T')[0];
      const dailyData = await getSectorDetailData(sectorId, formattedDate);
      if (dailyData) {
        weekData.push(dailyData);
      }
    }

    if (weekData.length === 0) return null;

    const aggregatedCounts = weekData.reduce((acc, curr) => {
      acc.positive += curr.counts.positive;
      acc.negative += curr.counts.negative;
      acc.neutral += curr.counts.neutral;
      return acc;
    }, { positive: 0, negative: 0, neutral: 0 });

    const aggregatedReactions = weekData.flatMap(d => d.reactions);
    const firstAvailableData = weekData[0]; // Use the most recent available data for summary/icon

    return {
      sectorId: firstAvailableData.sectorId,
      date: baseDate, // Display the base date for the aggregated view
      summary: firstAvailableData.summary,
      headline: firstAvailableData.headline, // 헤드라인 정보 포함
      reactions: aggregatedReactions,
      counts: aggregatedCounts,
      icon: firstAvailableData.icon, // 아이콘 정보 포함
    };
  };





  // 섹터 상세 데이터 가져오기
  const getSectorDetailData = async (sectorId: string, date: string): Promise<SectorDetailData | null> => {
    try {
      console.log(`getSectorDetailData 호출: sectorId=${sectorId}, date=${date}`);
      
      // 1. 먼저 sector_detail 컬렉션에서 해당 날짜의 문서를 찾습니다
      let sectorData = await tryGetFromSectorDetail(sectorId, date);
      
      // 2. sector_detail에서 찾지 못한 경우 sector_score에서 시도
      if (!sectorData) {
        console.log(`sector_detail에서 데이터를 찾지 못함, sector_score에서 시도...`);
        sectorData = await tryGetFromSectorScore(sectorId, date);
      }
      
      // 3. 다른 날짜 검색은 하지 않음 (선택된 날짜만 사용)
      if (!sectorData) {
        console.log(`선택된 날짜 ${date}에서 데이터를 찾을 수 없습니다.`);
      }
      
      return sectorData;
    } catch (error) {
      console.error('섹터 상세 데이터 가져오기 오류:', error);
      return null;
    }
  };

  // sector_detail 컬렉션에서 데이터 가져오기 시도
  // 데이터 경로: /sector_detail/IT/dates/2025-08-23
  const tryGetFromSectorDetail = async (sectorId: string, date: string): Promise<SectorDetailData | null> => {
    try {
      // 새로운 데이터베이스 구조: /sector_detail/IT/dates/2025-08-23
      const docRef = doc(db, 'sector_detail', sectorId, 'dates', date);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log(`sector_detail에서 데이터 발견: ${sectorId}/${date}`, data);
        console.log('데이터 구조:', {
          summary: data.summary,
          headline: data.headline, // 헤드라인 정보 포함
          reactions: data.reactions,
          counts: data.counts,
          icon: data.icon
        });
        
        // Firebase 콘솔에서 보이는 데이터 구조에 맞게 처리
        // summary: { positive: { headline: "...", summary: "..." }, negative: {...}, neutral: {...} }
        const processedSummary = {
          positive: data.summary?.positive?.summary || data.summary?.positive || '요약 없음',
          negative: data.summary?.negative?.summary || data.summary?.negative || '요약 없음',
          neutral: data.summary?.neutral?.summary || data.summary?.neutral || '요약 없음'
        };

        // headline 데이터 처리
        const processedHeadline = {
          positive: data.summary?.positive?.headline || data.headline?.positive || '헤드라인 없음',
          negative: data.summary?.negative?.headline || data.headline?.negative || '헤드라인 없음',
          neutral: data.summary?.neutral?.headline || data.headline?.neutral || '헤드라인 없음'
        };

        const processedCounts = {
          positive: data.counts?.positive || 0,
          negative: data.counts?.negative || 0,
          neutral: data.counts?.neutral || 0
        };

        console.log('원본 데이터:', data);
        console.log('처리된 요약:', processedSummary);
        console.log('처리된 헤드라인:', processedHeadline);
        console.log('처리된 카운트:', processedCounts);
        
        return convertToSectorDetailData({
          sectorId: sectorId,
          date: date,
          summary: processedSummary,
          headline: processedHeadline,
          reactions: data.reactions || [],
          counts: processedCounts,
          icon: data.icon, // 섹터별 아이콘 URL 가져오기
        });
      }
      
      // 기존 구조도 시도 (하위 호환성)
      console.log(`새로운 구조에서 데이터를 찾지 못함, 기존 구조 시도: sector_detail/${date}`);
      const oldDocRef = doc(db, 'sector_detail', date);
      const oldDocSnap = await getDoc(oldDocRef);

      if (oldDocSnap.exists()) {
        const oldData = oldDocSnap.data();
        const sectorKeys = Object.keys(oldData).filter(key =>
          key.toLowerCase() === sectorId.toLowerCase() ||
          key.toLowerCase().includes(sectorId.toLowerCase())
        );

        if (sectorKeys.length > 0) {
          const foundSectorKey = sectorKeys[0];
          const sectorData = oldData[foundSectorKey];
          
          // 기존 구조에서도 동일한 처리 적용
          const processedSummary = {
            positive: sectorData.summary?.positive?.summary || sectorData.summary?.positive || '요약 없음',
            negative: sectorData.summary?.negative?.summary || sectorData.summary?.negative || '요약 없음',
            neutral: sectorData.summary?.neutral?.summary || sectorData.summary?.neutral || '요약 없음'
          };

          // headline 데이터 처리
          const processedHeadline = {
            positive: sectorData.summary?.positive?.headline || sectorData.headline?.positive || '헤드라인 없음',
            negative: sectorData.summary?.negative?.headline || sectorData.headline?.negative || '헤드라인 없음',
            neutral: sectorData.summary?.neutral?.headline || sectorData.headline?.neutral || '헤드라인 없음'
          };

          const processedCounts = {
            positive: sectorData.counts?.positive || 0,
            negative: sectorData.counts?.negative || 0,
            neutral: sectorData.counts?.neutral || 0
          };

          return convertToSectorDetailData({
            sectorId: foundSectorKey,
            date: date,
            summary: processedSummary,
            headline: processedHeadline,
            reactions: sectorData.reactions,
            counts: processedCounts,
            icon: sectorData.icon,
          });
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching from sector_detail for ${sectorId} on ${date}:`, error);
      return null;
    }
  };

  // sector_score 컬렉션에서 데이터 가져오기 시도
  const tryGetFromSectorScore = async (sectorId: string, date: string): Promise<SectorDetailData | null> => {
    try {
      // 새로운 데이터베이스 구조: /sector_score/IT/dates/2025-08-23
      const docRef = doc(db, 'sector_score', sectorId, 'dates', date);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log(`sector_score에서 데이터 발견: ${sectorId}/${date}`, data);
        
        // sector_score에서도 동일한 처리 적용
        const processedCounts = {
          positive: data.positive_count || data.positive || 0,
          negative: data.negative_count || data.negative || 0,
          neutral: data.neutral_count || data.neutral || 0
        };

        return convertToSectorDetailData({
          sectorId: sectorId,
          date: date,
          summary: { positive: '요약 없음', negative: '요약 없음', neutral: '요약 없음' },
          headline: { positive: '요약 없음', negative: '요약 없음', neutral: '요약 없음' }, // 헤드라인 정보 포함
          reactions: [], // No reactions in sector_score
          counts: processedCounts,
          icon: undefined, // sector_score에는 아이콘이 없음
        });
      }
      
      // 기존 구조도 시도 (하위 호환성)
      console.log(`새로운 구조에서 데이터를 찾지 못함, 기존 구조 시도: sector_score/${date}`);
      const oldDocRef = doc(db, 'sector_score', date);
      const oldDocSnap = await getDoc(oldDocRef);

      if (oldDocSnap.exists()) {
        const oldData = oldDocSnap.data();
        const sectorKeys = Object.keys(oldData).filter(key =>
          key.toLowerCase() === sectorId.toLowerCase() ||
          key.toLowerCase().includes(sectorId.toLowerCase())
        );

        if (sectorKeys.length > 0) {
          const foundSectorKey = sectorKeys[0];
          const sectorScoreData = oldData[foundSectorKey];
          
          // sector_score에서도 동일한 처리 적용
          const processedCounts = {
            positive: sectorScoreData.positive_count || sectorScoreData.positive || 0,
            negative: sectorScoreData.negative_count || sectorScoreData.negative || 0,
            neutral: sectorScoreData.neutral_count || sectorScoreData.neutral || 0
          };

          return convertToSectorDetailData({
            sectorId: foundSectorKey,
            date: date,
            summary: { positive: '요약 없음', negative: '요약 없음', neutral: '요약 없음' },
            headline: { positive: '요약 없음', negative: '요약 없음', neutral: '요약 없음' }, // 헤드라인 정보 포함
            reactions: [],
            counts: processedCounts,
            icon: undefined,
          });
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching from sector_score for ${sectorId} on ${date}:`, error);
      return null;
    }
  };



  // 데이터를 SectorDetailData 형식으로 변환
  const convertToSectorDetailData = (sectorData: Record<string, unknown>): SectorDetailData => {
    return {
      sectorId: (sectorData.sectorId as string) || 'Unknown',
      date: (sectorData.date as string) || '',
      summary: {
        positive: (sectorData.summary as Record<string, unknown>)?.positive as string || '요약 없음',
        negative: (sectorData.summary as Record<string, unknown>)?.negative as string || '요약 없음',
        neutral: (sectorData.summary as Record<string, unknown>)?.neutral as string || '요약 없음',
      },
      headline: {
        positive: (sectorData.headline as Record<string, unknown>)?.positive as string || '요약 없음',
        negative: (sectorData.headline as Record<string, unknown>)?.negative as string || '요약 없음',
        neutral: (sectorData.headline as Record<string, unknown>)?.neutral as string || '요약 없음',
      },
      reactions: (sectorData.reactions as ReactionItem[]) || [],
      counts: {
        positive: (sectorData.counts as Record<string, unknown>)?.positive as number || 0,
        negative: (sectorData.counts as Record<string, unknown>)?.negative as number || 0,
        neutral: (sectorData.counts as Record<string, unknown>)?.neutral as number || 0,
      },
      icon: (sectorData.icon as string) || undefined, // 섹터별 아이콘 URL
    };
  };

  // 1일 데이터 로드 함수
  const loadDailySectorData = async (sectorId: string): Promise<SectorDetailData | null> => {
    try {
      // selectedDate가 반드시 있어야 함 (1일 필터에서는 날짜 선택 필수)
      if (!selectedDate) {
        console.log('1일 필터에서는 날짜를 선택해야 합니다.');
        return null;
      }
      
      console.log(`1일 데이터 로드 시작: ${selectedDate}`);
      
      // 선택된 날짜의 데이터만 시도 (다른 날짜 검색하지 않음)
      const sectorData = await getSectorDetailData(sectorId, selectedDate);
      
      if (sectorData) {
        console.log(`${selectedDate} 날짜에서 데이터 발견!`);
        return sectorData;
      } else {
        console.log(`${selectedDate} 날짜에 데이터가 없습니다.`);
        return null;
      }
    } catch (error) {
      console.error('1일 데이터 로드 함수 오류:', error);
      return null;
    }
  };

  // 섹터의 종합점수 가져오기 (sector_score 컬렉션의 1번 필드)
  const getTotalScoreForSector = async (sectorId: string, date: string): Promise<number> => {
    try {
      console.log(`종합점수 가져오기: ${sectorId}, ${date}`);
      
      // sector_score/{date} 문서에서 해당 섹터의 1번 필드 값 가져오기
      const scoreDocRef = doc(db, 'sector_score', date);
      const scoreDocSnap = await getDoc(scoreDocRef);
      
      if (scoreDocSnap.exists()) {
        const scoreData = scoreDocSnap.data();
        const sectorData = scoreData[sectorId];
        
        if (sectorData && sectorData['1'] !== undefined) {
          const score = sectorData['1'];
          console.log(`섹터 ${sectorId}의 종합점수: ${score}`);
          return typeof score === 'number' ? score : 0;
        }
      }
      
      console.log(`섹터 ${sectorId}의 종합점수를 찾을 수 없습니다.`);
      return 0;
    } catch (error) {
      console.error('종합점수 가져오기 오류:', error);
      return 0;
    }
  };

  const handleFilterChange = (filter: '1일' | '1주') => {
    const latestDate = getLatestDateString();

    // 1주 필터로 변경하는 경우 또는 오늘 기준 날짜가 아닌 경우 로그인 필요
    if (!user && (filter === '1주' || selectedDate !== latestDate)) {
      navigate('/login');
      return;
    }

    setTimeFilter(filter);
    if (filter === '1일') {
      setSearchParams({ filter, date: selectedDate });
    } else {
      setSearchParams({ filter });
    }
    console.log(`필터 변경: ${filter}`);
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



  // 캘린더 관련 함수들
  const handleDateClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // 로그인하지 않은 경우 캘린더 열기 불가 (날짜 변경 방지)
    if (!user) {
      navigate('/login');
      return;
    }

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

  // 이전 날짜로 이동
  const handlePreviousDay = () => {
    // 로그인하지 않은 경우 날짜 변경 불가
    if (!user) {
      navigate('/login');
      return;
    }

    if (!selectedDate) return;
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    const newDate = currentDate.toISOString().split('T')[0];
    setSelectedDate(newDate);
    setSearchParams({ filter: timeFilter, date: newDate });
  };

  // 다음 날짜로 이동
  const handleNextDay = () => {
    // 로그인하지 않은 경우 날짜 변경 불가
    if (!user) {
      navigate('/login');
      return;
    }

    if (!selectedDate) return;
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    const newDate = currentDate.toISOString().split('T')[0];
    setSelectedDate(newDate);
    setSearchParams({ filter: timeFilter, date: newDate });
  };

  const handleDateSelect = (date: string) => {
    const latestDate = getLatestDateString();

    // 오늘 기준 날짜(오늘 -1일)가 아닌 날짜를 선택하면 로그인 필요
    if (!user && date !== latestDate) {
      navigate('/login');
      return;
    }

    setSelectedDate(date);
    setIsCalendarOpen(false);
  };

  // 상세 반응 데이터 가져오기
  const getDetailReactions = async (type: 'positive' | 'negative' | 'neutral', date: string): Promise<DetailReactionItem[]> => {
    try {
      console.log(`상세 반응 데이터 가져오기 시작: ${type}, ${date}`);
      
      // 데이터베이스 경로: /sector_detail/IT/detail_dates/2025-08-15
      const docRef = doc(db, 'sector_detail', sectorId!, 'detail_dates', date);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.log(`상세 데이터가 존재하지 않음: ${sectorId}/detail_dates/${date}`);
        return [];
      }
      
      const data = docSnap.data();
      console.log('상세 데이터 원본:', data);
      console.log('데이터 키들:', Object.keys(data));
      
      // 각 채널의 구조 확인
      for (const [key, value] of Object.entries(data)) {
        if (key !== 'icon' && key !== 'sector') {
          console.log(`채널 "${key}" 구조:`, value);
          if (value && typeof value === 'object') {
            console.log(`채널 "${key}" 키들:`, Object.keys(value));
            if ('posts' in value) {
              console.log(`채널 "${key}" posts 구조:`, (value as Record<string, unknown>).posts);
            }
            if ('score' in value) {
              console.log(`채널 "${key}" score:`, (value as Record<string, unknown>).score);
            }
          }
        }
      }
      
      // Firebase 콘솔에서 보이는 데이터 구조에 맞게 처리
      // 구조: {채널명} 하위에 {posts}와 {score} 필드가 있고, 
      // {posts} 하위에 인티저로 0부터 증가하는 숫자 필드 하위에 {contents}, {time}, {views}가 있음
      const filteredData: DetailReactionItem[] = [];
      
      // 모든 채널을 순회하면서 score에 따른 필터링
      console.log(`=== ${type} 반응 필터링 시작 ===`);
      let totalChannels = 0;
      let channelsWithPosts = 0;
      let channelsMatchingCriteria = 0;
      
      for (const [channelName, channelData] of Object.entries(data)) {
        if (channelName === 'icon' || channelName === 'sector') continue; // 메타데이터 제외
        
        totalChannels++;
        
        if (channelData && typeof channelData === 'object' && 'posts' in channelData && 'score' in channelData) {
          const channelScore = (channelData as Record<string, unknown>).score as number || 0;
          const posts = (channelData as Record<string, unknown>).posts;
          
          console.log(`채널 "${channelName}": score=${channelScore}, posts 존재=${!!posts}`);
          
          // 채널의 score를 확인하여 필터링
          let shouldIncludeChannel = false;
          
          switch (type) {
            case 'positive':
              shouldIncludeChannel = channelScore >= 70; // 70점 이상
              break;
            case 'negative':
              shouldIncludeChannel = channelScore < 40;  // 40점 미만
              break;
            case 'neutral':
              shouldIncludeChannel = channelScore >= 40 && channelScore < 70; // 40점 이상 70점 미만
              break;
            default:
              shouldIncludeChannel = false;
          }
          
          console.log(`  채널 "${channelName}": 조건 만족=${shouldIncludeChannel} (${type} 기준: ${type === 'positive' ? 'score >= 70' : type === 'negative' ? 'score < 40' : '40 <= score < 70'})`);
          
          if (posts && typeof posts === 'object') {
            channelsWithPosts++;
            const postKeys = Object.keys(posts);
            console.log(`  채널 "${channelName}": posts 키 개수=${postKeys.length}, 키들=${postKeys.join(', ')}`);
            
            if (shouldIncludeChannel) {
              channelsMatchingCriteria++;
              let postCount = 0;
              
              // posts 하위의 숫자 필드들을 순회 (0, 1, 2, ...)
              for (const [postIndex, postData] of Object.entries(posts)) {
                // postIndex가 숫자인지 확인 (0, 1, 2, ...)
                if (!isNaN(Number(postIndex))) {
                  const post = postData as Record<string, unknown>;
                  const content = (post.contents as string) || (post.content as string) || '';
                  
                  if (content) {
                    postCount++;
                    filteredData.push({
                      id: `${channelName}_${postIndex}`,
                      title: channelName,
                      content: content,
                      source: channelName,
                      time: (post.time as string) || new Date().toISOString(),
                      views: (post.views as number) || 0,
                      score: channelScore,
                      sector: sectorId!,
                      date: date
                    });
                  }
                }
              }
              
              console.log(`  채널 "${channelName}": 추가된 포스트 수=${postCount}`);
            }
          } else {
            console.log(`  채널 "${channelName}": posts가 없거나 객체가 아님`);
          }
        } else {
          console.log(`채널 "${channelName}": posts 또는 score 필드가 없음`);
        }
      }
      
      console.log(`=== ${type} 반응 필터링 결과 ===`);
      console.log(`전체 채널 수: ${totalChannels}`);
      console.log(`posts가 있는 채널 수: ${channelsWithPosts}`);
      console.log(`조건을 만족하는 채널 수: ${channelsMatchingCriteria}`);
      console.log(`최종 필터링된 포스트 수: ${filteredData.length}`);
      
      console.log(`필터링된 ${type} 반응 데이터:`, filteredData);
      console.log(`총 ${filteredData.length}개의 ${type} 반응을 찾았습니다.`);
      
      // 각 채널별로 몇 개의 포스트가 있는지 확인
      const channelCounts: { [key: string]: number } = {};
      filteredData.forEach(item => {
        channelCounts[item.title] = (channelCounts[item.title] || 0) + 1;
      });
      console.log('채널별 포스트 수:', channelCounts);
      
      return filteredData;
      
    } catch (error) {
      console.error(`상세 반응 데이터 가져오기 오류 (${type}):`, error);
      return [];
    }
  };

  const openModal = async (type: 'positive' | 'negative' | 'neutral') => {
    try {
      setModalType(type);
      setModalTitle(type === 'positive' ? '긍정적 반응' : type === 'negative' ? '부정적 반응' : '중립적 반응');
      
      // 선택된 날짜 또는 오늘 날짜 사용
      const targetDate = selectedDate || new Date().toISOString().split('T')[0];
      console.log(`모달 열기: ${type}, 날짜: ${targetDate}`);
      
      // 상세 반응 데이터 가져오기
      const detailReactions = await getDetailReactions(type, targetDate);
      
      // 기존 reactions 데이터와 상세 데이터를 결합
      const combinedReactions = detailReactions.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        source: item.source,
        time: item.time,
        views: item.views || 0 // 데이터베이스에서 가져온 views 값 사용
      }));
      
      // 모달 데이터 설정
      setModalReactions(combinedReactions);
      setModalOpen(true);
      
      // ReactionModal에 전달할 데이터 로깅
      console.log(`모달에 전달할 ${type} 반응 데이터:`, combinedReactions);
      console.log(`views 데이터 확인:`, combinedReactions.map(item => ({ id: item.id, views: item.views })));
      
    } catch (error) {
      console.error(`모달 열기 오류 (${type}):`, error);
      setModalOpen(true); // 오류가 발생해도 모달은 열기
    }
  };

  // 돌아가기 버튼 클릭 핸들러
  const handleGoBack = () => {
    // 현재 선택된 기간필터와 날짜를 POST 방식으로 전송
    const postData = {
      timeFilter: timeFilter,
      targetDate: selectedDate
    };
    
    console.log('=== 돌아가기 버튼 클릭 ===');
    console.log('현재 timeFilter:', timeFilter);
    console.log('현재 selectedDate:', selectedDate);
    console.log('POST 데이터:', postData);
    console.log('이전 페이지:', location.state?.fromPage);
    console.log('========================');
    
    // 이전 페이지에 따라 적절한 페이지로 이동
    const fromPage = location.state?.fromPage;
    if (fromPage === 'favorites') {
      // 즐겨찾기 페이지로 돌아가기
      navigate('/favorites', { 
        state: { postData },
        replace: true 
      });
    } else {
      // 기본적으로 대시보드로 돌아가기
      navigate('/', { 
        state: { postData },
        replace: true 
      });
    }
  };

  if (loading) {
    return (
      <div className="sector-detail-container">
        <Header currentPage="sector" />

        {/* Loading Content */}
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>데이터를 불러오는 중...</h2>
          <p>섹터 "{sectorId}"의 정보를 가져오고 있습니다.</p>
          <div className="loading-progress">
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="sector-detail-container">
        <Header currentPage="sector" />

        {/* Main Content */}
        <div className="main-content">
          {/* Section Info */}
          <div className="section-info">
            <div className="section-icon">
              <span className="sector-initial">{sectorId?.charAt(0) || 'S'}</span>
            </div>
            <div className="section-details">
              <h1 className="section-title">{sectorId || '섹터'}</h1>
              <div className="section-date">
                {timeFilter === '1주' && selectedDate
                  ? `${formatDateRange(selectedDate)} 기준`
                  : selectedDate
                  ? `${new Date(selectedDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 기준`
                  : '오늘 기준'}
              </div>
            </div>
          </div>



          {/* Error Content */}
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h2>오류가 발생했습니다</h2>
            <p>{error}</p>
            <div className="error-actions">
              <button className="back-home-btn" onClick={handleGoBack}>
                홈으로 돌아가기
              </button>
              <button className="try-again-btn" onClick={() => window.location.reload()}>
                다시 시도하기
              </button>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

    if (!data) {
    return (
      <div className="sector-detail-container">
        <Header currentPage="sector" />

        {/* No Data Content */}
        <div className="error-container">
          <div className="error-icon">📊</div>
          <h2>데이터를 찾을 수 없습니다</h2>
          <p>{error || `섹터 "${sectorId}"의 데이터를 찾을 수 없습니다.`}</p>
          <div className="error-actions">
            <button className="back-home-btn" onClick={handleGoBack}>
              홈으로 돌아가기
            </button>
            <button className="try-again-btn" onClick={() => window.location.reload()}>
              다시 시도하기
            </button>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  const totalReactions = data.counts.positive + data.counts.negative + data.counts.neutral;
  const positivePercentage = totalReactions > 0 ? Math.round((data.counts.positive / totalReactions) * 100) : 0;
  const negativePercentage = totalReactions > 0 ? Math.round((data.counts.negative / totalReactions) * 100) : 0;
  const neutralPercentage = totalReactions > 0 ? Math.round((data.counts.neutral / totalReactions) * 100) : 0;

  return (
    <div className="sector-detail-container">
      <Header currentPage="sector" />

      {/* Main Content */}
      <div className="main-content">
        {/* Section Info */}
        <div className="section-info">
          <div className="section-icon">
            {(() => {
              const iconPath = getSectorIconPath(data.sectorId);
              console.log('섹터 ID:', data.sectorId);
              console.log('아이콘 경로:', iconPath);
              
              return iconPath ? (
                <img 
                  src={iconPath} 
                  alt={`${data.sectorId} icon`} 
                  className="sector-detail-icon"
                  onLoad={() => console.log('이미지 로드 성공:', iconPath)}
                  onError={(e) => {
                    console.error('이미지 로드 실패:', iconPath, e);
                    // 이미지 로드 실패 시 span으로 대체
                    const target = e.target as HTMLImageElement;
                    if (target.parentElement) {
                      target.style.display = 'none';
                      const span = document.createElement('span');
                      span.textContent = data.sectorId.charAt(0);
                      span.style.color = '#0B1215';
                      span.style.fontSize = '16px';
                      span.style.fontFamily = 'Pretendard';
                      span.style.fontWeight = '600';
                      target.parentElement.appendChild(span);
                    }
                  }}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <span>{data.sectorId.charAt(0)}</span>
              );
            })()}
          </div>
          <div className="section-details">
            <h1 className="main-title">{data.sectorId}</h1>
            <p className="section-date">
              {timeFilter === '1주' && selectedDate
                ? `${formatDateRange(selectedDate)} 기준`
                : selectedDate
                ? `${new Date(selectedDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 기준`
                : '오늘 기준'}
              <span 
                ref={infoTooltipWrapperRef}
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
                  <span ref={infoTooltipRef} className="info-tooltip">
                    현재 화면의 데이터는 전일 하루 동안(00시~24시) 수집된 결과이며, 매일 00시 경에 최신 정보로 갱신됩니다.
                  </span>
                )}
              </span>
            </p>
          </div>
          <div className="back-button-container">
            <button className="back-button" onClick={handleGoBack}>
              <img src="/img/icon_Chvron=chvron_left.png" alt="돌아가기" className="back-icon" />
              <span className="back-text">돌아가기</span>
            </button>
          </div>
        </div>

        {/* Filter and Date Container */}
        <div className="filter-date-container">
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${timeFilter === '1일' ? 'active' : ''}`}
              onClick={() => handleFilterChange('1일')}
            >
              1일
            </button>
            <button 
              className={`filter-btn ${timeFilter === '1주' ? 'active' : ''}`}
              onClick={() => handleFilterChange('1주')}
            >
              1주
            </button>

          </div>
          
          {/* Date Selector */}
          <div className="date-selector">
            <button className="date-arrow" onClick={handlePreviousDay} disabled={loading}>‹</button>
            <div className="date-display" onClick={handleDateClick} style={{ cursor: 'pointer' }}>
              {selectedDate || new Date().toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <button className="date-arrow" onClick={handleNextDay} disabled={loading}>›</button>
          </div>
        </div>

        {/* Content Cards */}
        <div className="content-cards">
          {/* People's Reaction Score Card */}
          <div className="reaction-score-card">
            <div className="card-header">
              <h2>사람들의 반응 종합점수</h2>
            </div>
            <div className="score-card-content">
              <div className="score-card-left">
                <p>{data.sectorId} 종목에 대한 사람들의 의견을 AI가 종합점수로 표현 하였어요.</p>
                <span className="source">
                  산식: 전체 분야에 대한 의견 비율 대비 해당 분야의 긍정 의견의 비율
                  <span 
                    ref={formulaTooltipWrapperRef}
                    className="formula-icon-wrapper"
                    onMouseEnter={!isMobile ? () => setShowFormulaTooltip(true) : undefined}
                    onMouseLeave={!isMobile ? () => setShowFormulaTooltip(false) : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFormulaTooltip(!showFormulaTooltip);
                    }}
                  >
                    <span className="formula-icon">ⓘ</span>
                    {showFormulaTooltip && (
                      <span ref={formulaTooltipRef} className="formula-tooltip">
                        추후 공개 예정
                      </span>
                    )}
                  </span>
                </span>
              </div>
              <div className="score-card-right">
                <span className="total-score">{totalScore.toFixed(1)}<span className="score-unit">점</span></span>
              </div>
            </div>
          </div>

          {/* People's Reaction Ratio Card */}
          <div className="reaction-ratio-card">
            <div className="card-header">
              <h2>사람들의 반응 비율</h2>
              <p>{data.sectorId} 종목에 대한 사람들의 긍정・부정・중립적 의견 비율이에요.</p>
              <span className="source">출처: 텔레그램 채널</span>
            </div>
            <div className="chart-container">
              <div className="donut-chart">
                <svg width="280" height="280" viewBox="0 0 280 280">
                  {/* 배경 원 (회색) */}
                  <circle
                    cx="140"
                    cy="140"
                    r="84"
                    fill="none"
                    stroke="#F0F0F0"
                    strokeWidth="27"
                  />
                  
                  {/* 긍정적 반응 (빨간색) */}
                  <circle
                    cx="140"
                    cy="140"
                    r="84"
                    fill="none"
                    stroke="#EB2F45"
                    strokeWidth="27"
                    strokeDasharray={`${(positivePercentage / 100) * 528} 528`}
                    transform="rotate(-90 140 140)"
                    strokeLinecap="round"
                  />
                  
                  {/* 부정적 반응 (파란색) */}
                  <circle
                    cx="140"
                    cy="140"
                    r="84"
                    fill="none"
                    stroke="#107AEB"
                    strokeWidth="27"
                    strokeDasharray={`${(negativePercentage / 100) * 528} 528`}
                    transform={`rotate(${-90 + (positivePercentage * 3.6)} 140 140)`}
                    strokeLinecap="round"
                  />
                  
                  {/* 중립적 반응 (회색) */}
                  <circle
                    cx="140"
                    cy="140"
                    r="84"
                    fill="none"
                    stroke="#969696"
                    strokeWidth="27"
                    strokeDasharray={`${(neutralPercentage / 100) * 528} 528`}
                    transform={`rotate(${-90 + (positivePercentage * 3.6) + (negativePercentage * 3.6)} 140 140)`}
                    strokeLinecap="round"
                  />
                  
                  {/* 중앙 텍스트 */}
                  <text x="140" y="140" textAnchor="middle" dy=".3em" className="donut-chart-center">
                    {totalReactions}개
                  </text>
                </svg>
              </div>
              <div className="chart-legend">
                <div className="legend-item positive">
                  <span className="label">긍정적 반응</span>
                  <span className="percentage">{positivePercentage}%</span>
                  <span className="count">{data.counts.positive}개</span>
                </div>
                <div className="legend-item negative">
                  <span className="label">부정적 반응</span>
                  <span className="percentage">{negativePercentage}%</span>
                  <span className="count">{data.counts.negative}개</span>
                  </div>
                <div className="legend-item neutral">
                  <span className="label">중립적 반응</span>
                  <span className="percentage">{neutralPercentage}%</span>
                  <span className="count">{data.counts.neutral}개</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reaction Summary Card */}
          <div className="reaction-summary-card">
            <div className="card-header">
              <h2>반응 요약</h2>
              <p>수소 종목에 대한 사람들의 반응을 모아봤어요!</p>
              <span className="source">출처: 텔레그램 채널</span>
              </div>

            {/* Positive Reactions */}
            <div className="reaction-section">
              <div className="reaction-header">
                <h3 className="positive">긍정적 반응</h3>
              </div>
              <div className="reaction-content">
                <h4>{data.headline.positive !== '헤드라인 없음' ? data.headline.positive : '긍정적 반응 없음'}</h4>
                <p>{data.summary.positive !== '요약 없음' ? data.summary.positive : '긍정적 반응에 대한 요약이 없습니다.'}</p>
              </div>
              <div className="reaction-footer">
                <a 
                  href="#" 
                  className={`view-reactions-link ${data.counts.positive > 0 ? 'active' : 'inactive'}`}
                  onClick={(e) => {
                    e.preventDefault();
                    openModal('positive');
                  }}
                >
                  더보기 &gt;
                </a>
              </div>
            </div>

            {/* Negative Reactions */}
            <div className="reaction-section">
              <div className="reaction-header">
                <h3 className="negative">부정적 반응</h3>
              </div>
              <div className="reaction-content">
                <h4>{data.headline.negative !== '헤드라인 없음' ? data.headline.negative : '부정적 반응 없음'}</h4>
                <p>{data.summary.negative !== '요약 없음' ? data.summary.negative : '부정적 반응에 대한 요약이 없습니다.'}</p>
              </div>
              <div className="reaction-footer">
                <a 
                  href="#" 
                  className={`view-reactions-link ${data.counts.negative > 0 ? 'active' : 'inactive'}`}
                  onClick={(e) => {
                    e.preventDefault();
                    openModal('negative');
                  }}
                >
                  더보기 &gt;
                </a>
              </div>
            </div>

            {/* Neutral Reactions */}
            <div className="reaction-section">
              <div className="reaction-header">
                <h3 className="neutral">중립적 반응</h3>
              </div>
              <div className="reaction-content">
                <h4>{data.headline.neutral !== '헤드라인 없음' ? data.headline.neutral : '중립적 반응 없음'}</h4>
                <p>{data.summary.neutral !== '요약 없음' ? data.summary.neutral : '중립적 반응에 대한 요약이 없습니다.'}</p>
              </div>
              <div className="reaction-footer">
                <a 
                  href="#" 
                  className={`view-reactions-link ${data.counts.neutral > 0 ? 'active' : 'inactive'}`}
                  onClick={(e) => {
                    e.preventDefault();
                    openModal('neutral');
                  }}
                >
                  더보기 &gt;
                </a>
              </div>
            </div>
              </div>

        </div>
          </div>

      <Footer />

      {/* Reaction Modal */}
      {modalOpen && (
          <ReactionModal
            isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
            title={modalTitle}
            reactions={modalReactions}
            type={modalType}
            sectorName={data.sectorId}
            headline={modalType === 'positive' ? data.headline.positive : 
                     modalType === 'negative' ? data.headline.negative : 
                     data.headline.neutral}
          />
        )}

      {/* Calendar Component */}
      <Calendar
        isOpen={isCalendarOpen}
        onClose={handleCalendarClose}
        onDateSelect={handleDateSelect}
        selectedDate={selectedDate || new Date().toISOString().split('T')[0]}
        position={calendarPosition}
      />
    </div>
  );
};

export default SectorDetail;
