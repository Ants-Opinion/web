import { doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';

// 실제 데이터 타입 정의
interface StockData {
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

interface DateData {
  score: number;
  counts: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

// 가장 최근 날짜 가져오기
export const getLatestDate = async (): Promise<string> => {
  try {
    // 오늘 날짜의 하루 전을 기준으로 설정
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    
    console.log(`오늘 날짜: ${today.toISOString().split('T')[0]}, 기준일자: ${yesterdayString}`);
    return yesterdayString;
  } catch (error) {
    console.error('최신 날짜 가져오기 오류:', error);
    // 오류 발생 시 기본값으로 어제 날짜 반환
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
};

// 전일 날짜 계산 (간단한 구현)
const getPreviousDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
};

// dates 경로에서 counts 데이터 가져오기
const getSectorCountsForDate = async (sectorId: string, date: string): Promise<{positive: number, negative: number, neutral: number} | null> => {
  try {
    console.log(`섹터 ${sectorId}의 ${date} dates counts 데이터 가져오기...`);
    
    const dateDocRef = doc(db, `sector_detail/${sectorId}/dates`, date);
    const dateDoc = await getDoc(dateDocRef);
    
    if (dateDoc.exists()) {
      const data = dateDoc.data();
      console.log(`섹터 ${sectorId} ${date} dates 데이터:`, data);
      
      const counts = {
        positive: data.counts?.positive || 0,
        negative: data.counts?.negative || 0,
        neutral: data.counts?.neutral || 0
      };
      
      console.log(`섹터 ${sectorId} ${date} counts:`, counts);
      return counts;
    } else {
      console.log(`섹터 ${sectorId} ${date} dates 문서가 존재하지 않습니다.`);
      return null;
    }
  } catch (error) {
    console.error(`섹터 ${sectorId} 날짜 ${date} dates counts 가져오기 오류:`, error);
    return null;
  }
};

// 특정 날짜의 섹터 데이터 가져오기 (sector_score에서 1번 필드 값 사용)
const getSectorDataForDate = async (sectorId: string, date: string): Promise<DateData | null> => {
  try {
    console.log(`섹터 ${sectorId}의 ${date} sector_score 데이터 가져오기...`);
    
    // sector_score 경로에서 해당 날짜 문서 가져오기
    const sectorScoreDocRef = doc(db, `sector_score/${date}`);
    const sectorScoreDoc = await getDoc(sectorScoreDocRef);
    
    if (sectorScoreDoc.exists()) {
      const data = sectorScoreDoc.data();
      console.log(`섹터 ${sectorId} ${date} sector_score 데이터:`, data);
      
      // 해당 섹터의 1번 필드 값 찾기
      const sectorData = data[sectorId];
      if (sectorData && sectorData[1]) {
        const score = sectorData[1];
        console.log(`섹터 ${sectorId} ${date} 1번 필드 값:`, score);
        
        return {
          score: score,
          counts: {
            positive: 0, // counts는 별도로 계산
            negative: 0,
            neutral: 0
          }
        };
      } else {
        console.log(`섹터 ${sectorId} ${date} 1번 필드 데이터가 없습니다.`);
        return null;
      }
    } else {
      console.log(`섹터 ${sectorId} ${date} sector_score 문서가 존재하지 않습니다.`);
      return null;
    }
  } catch (error) {
    console.error(`섹터 ${sectorId} 날짜 ${date} sector_score 가져오기 오류:`, error);
    return null;
  }
};

// 섹터별 종목 목록 가져오기 (섹터 문서에서 직접)
const getStocksInSector = async (sectorId: string): Promise<string[]> => {
  try {
    console.log(`섹터 ${sectorId} 문서에서 종목 목록 가져오기 시도...`);
    
    // 섹터 문서 직접 가져오기
    const sectorDocRef = doc(db, 'sector_detail', sectorId);
    const sectorDoc = await getDoc(sectorDocRef);
    
    if (sectorDoc.exists()) {
      const sectorData = sectorDoc.data();
      console.log(`섹터 ${sectorId} 문서 데이터:`, sectorData);
      
      // 문서에서 종목 목록 찾기 (필드명을 추정해서 시도)
      const possibleFields = ['stocks', 'companies', 'items', 'list', 'names'];
      
      for (const field of possibleFields) {
        if (sectorData[field] && Array.isArray(sectorData[field])) {
          console.log(`섹터 ${sectorId}에서 ${field} 필드에서 종목 발견:`, sectorData[field]);
          return sectorData[field];
        }
      }
      
      // 만약 배열 필드가 없다면, 모든 키를 종목명으로 간주
      const allKeys = Object.keys(sectorData);
      console.log(`섹터 ${sectorId}의 모든 키:`, allKeys);
      
      // 시스템 필드 제외하고 종목명으로 간주
      const stockNames = allKeys.filter(key => 
        !key.startsWith('_') && 
        key !== 'createdAt' && 
        key !== 'updatedAt' &&
        key !== 'name' &&
        key !== 'description'
      );
      
      console.log(`섹터 ${sectorId}에서 추출한 종목명:`, stockNames);
      return stockNames;
    } else {
      console.log(`섹터 ${sectorId} 문서가 존재하지 않습니다.`);
      return [];
    }
  } catch (error) {
    console.error(`섹터 ${sectorId} 종목 목록 가져오기 오류:`, error);
    return [];
  }
};

// 특정 종목의 특정 날짜 데이터 가져오기
const getStockDetailForDate = async (sectorId: string, stockName: string, date: string): Promise<DateData | null> => {
  try {
    const stockDocRef = doc(db, `sector_detail/${sectorId}/detail_dates/${stockName}/dates`, date);
    const stockDoc = await getDoc(stockDocRef);
    
    if (stockDoc.exists()) {
      const data = stockDoc.data();
      return {
        score: data.score || 0,
        counts: {
          positive: data.counts?.positive || 0,
          negative: data.counts?.negative || 0,
          neutral: data.counts?.neutral || 0
        }
      };
    }
    return null;
  } catch (error) {
    console.error(`종목 ${stockName} 날짜 ${date} 데이터 가져오기 오류:`, error);
    return null;
  }
};

// 변화율 계산
const calculateChangeRate = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
};

// 반응 비율 계산
const calculateReactionRate = (counts: { positive: number; negative: number; neutral: number }): number => {
  const total = counts.positive + counts.negative + counts.neutral;
  if (total === 0) return 0;
  return Math.round((counts.positive / total) * 100);
};

// 실제 섹터 데이터 가져오기
export const getRealStockData = async (targetDate: string = '2025-08-18'): Promise<StockData[]> => {
  try {
    console.log('실제 섹터 데이터 가져오기 시작... (sector_score 기반)', targetDate);
    
    // Firebase 인증 상태 확인
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.error('사용자가 인증되지 않았습니다.');
      return [];
    }
    
    console.log('인증된 사용자:', user.uid);
    
    // 기준 날짜와 전전일 날짜 계산
    const baseDate = new Date(targetDate);
    const previousDate = new Date(baseDate);
    previousDate.setDate(baseDate.getDate() - 1);
    const previousDateString = previousDate.toISOString().split('T')[0];
    
    console.log(`기준 날짜: ${targetDate}, 전전일 날짜: ${previousDateString}`);
    
    // 기준 날짜 데이터 가져오기 (새로운 구조 시도)
    let data: Record<string, any> = {};
    let previousData: Record<string, any> = {};
    
    try {
      // 올바른 구조: sector_score/2025-08-23 문서 하위에 섹터들이 있음
      console.log(`${targetDate} 날짜의 섹터 데이터를 가져오는 중...`);
      
      // 타임아웃 설정 (10초)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('데이터 로딩 타임아웃')), 10000);
      });
      
      const dataPromise = (async () => {
        // sector_score/2025-08-23 문서 가져오기
        const scoreDocRef = doc(db, 'sector_score', targetDate);
        const scoreDocSnap = await getDoc(scoreDocRef);
        
        if (scoreDocSnap.exists()) {
          const scoreData = scoreDocSnap.data();
          console.log(`${targetDate} 문서에서 데이터 발견:`, Object.keys(scoreData).length, '개 섹터');
          
          // 각 섹터의 데이터를 data 객체에 저장
          for (const [sectorId, sectorData] of Object.entries(scoreData)) {
            data[sectorId] = sectorData;
          }
        } else {
          console.log(`${targetDate} 문서가 존재하지 않습니다.`);
          return;
        }
        
        // 전전일 데이터도 가져오기 (변화량 계산용)
        const previousScoreDocRef = doc(db, 'sector_score', previousDateString);
        const previousScoreDocSnap = await getDoc(previousScoreDocRef);
        
        if (previousScoreDocSnap.exists()) {
          const previousScoreData = previousScoreDocSnap.data();
          console.log(`${previousDateString} 전전일 데이터 발견:`, Object.keys(previousScoreData).length, '개 섹터');
          
          // 각 섹터의 전전일 데이터를 previousData 객체에 저장
          for (const [sectorId, sectorData] of Object.entries(previousScoreData)) {
            previousData[sectorId] = sectorData;
          }
        }
      })();
      
      // 타임아웃과 데이터 로딩을 경쟁시킴
      await Promise.race([dataPromise, timeoutPromise]);
      
      // 데이터를 찾지 못한 경우
      if (Object.keys(data).length === 0) {
        console.log(`${targetDate} 날짜에 섹터 데이터를 찾을 수 없습니다.`);
        return [];
      }
    } catch (error) {
      console.error('데이터 가져오기 중 오류:', error);
      return [];
    }
    
    const sectorDataList: StockData[] = [];

    for (const [sectorId, sectorValue] of Object.entries(data)) {
      try {
        // 기준 날짜의 1번 필드 값 (종합점수)
        const currentScore = sectorValue?.['1'] || 0;
        
        // 전전일의 1번 필드 값
        const previousScore = previousData[sectorId]?.['1'] || 0;
        
        // 전전일 차이 계산 (백분율)
        const scoreChange = previousScore > 0 ? ((currentScore - previousScore) / previousScore) * 100 : 0;
        
        // 소수점 둘째자리에서 반올림하여 소수 첫째자리까지
        const roundedCurrentScore = parseFloat(currentScore.toFixed(1));
        const roundedScoreChange = parseFloat(scoreChange.toFixed(1));
        
        // 전일 데이터 카운트 (기존 로직 유지)
        const d0 = sectorValue?.['0'] || {};
        const p0: number = Number(d0.positive || d0.pos || 0);
        const n0: number = Number(d0.negative || d0.neg || 0);
        const u0: number = Number(d0.neutral || d0.neu || 0);
        const t0 = p0 + n0 + u0;

        // 전전일 데이터 카운트
        const d1 = sectorValue?.['1'] || {};
        const p1: number = Number(d1.positive || d1.pos || 0);
        const n1: number = Number(d1.negative || d1.neg || 0);
        const u1: number = Number(d1.neutral || d1.neu || 0);
        const t1 = p1 + n1 + u1;

        // 전일/전전일 퍼센티지 (모든 변화는 퍼센트 포인트 기반)
        const positivePct0 = t0 > 0 ? Math.round((p0 / t0) * 100) : 0;
        const negativePct0 = t0 > 0 ? Math.round((n0 / t0) * 100) : 0;
        const neutralPct0  = t0 > 0 ? Math.round((u0 / t0) * 100) : 0;

        const positivePct1 = t1 > 0 ? Math.round((p1 / t1) * 100) : 0;
        const negativePct1 = t1 > 0 ? Math.round((n1 / t1) * 100) : 0;
        const neutralPct1  = t1 > 0 ? Math.round((u1 / t1) * 100) : 0;

        // 반응 비율: 전일 긍정 비율
        const reactionRate = positivePct0;
        const reactionDiff = positivePct0 - positivePct1;

        // 나머지 컬럼의 변화도 p.p 차이로 표기
        const positiveChange = positivePct0 - positivePct1;
        const negativeChange = negativePct0 - negativePct1;
        const neutralChange  = neutralPct0 - neutralPct1;

        sectorDataList.push({
          id: sectorId,
          name: sectorId,
          sector: sectorId,
          totalScore: roundedCurrentScore, // 1번 필드 값 사용
          positiveOpinions: p0,
          negativeOpinions: n0,
          neutralOpinions: u0,
          reactionRate: reactionRate,
          scoreChange: roundedScoreChange, // 전전일 차이 (1번 필드 값 차이)
          positiveChange: positiveChange,
          negativeChange: negativeChange,
          neutralChange: neutralChange,
          reactionChange: reactionDiff,
          isFavorite: false,
          updatedAt: targetDate
        });
      } catch (innerErr) {
        console.error(`섹터 ${sectorId} 처리 중 오류:`, innerErr);
      }
    }

    console.log('총 가져온 섹터 수:', sectorDataList.length);
    // 1번 필드 값 기준 내림차순 정렬
    return sectorDataList.sort((a, b) => b.totalScore - a.totalScore);
  } catch (error) {
    console.error('실제 섹터 데이터 가져오기 오류:', error);
    
    // Firebase 관련 오류 상세 로깅
    if (error instanceof Error) {
      console.error('오류 메시지:', error.message);
      console.error('오류 스택:', error.stack);
    }
    
    // 400 Bad Request 오류인 경우
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Firebase 오류 코드:', (error as any).code);
    }
    
    return [];
  }
};
