import { doc, getDoc } from 'firebase/firestore';
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

// 가장 최근 날짜 가져오기 (인덱스 문제 해결을 위해 단순화)
export const getLatestDate = async (): Promise<string> => {
  try {
    // 인덱스 문제를 피하기 위해 고정된 최신 날짜 사용
    console.log('고정된 최신 날짜 사용: 2025-08-15');
    return '2025-08-15';
  } catch (error) {
    console.error('최신 날짜 가져오기 오류:', error);
    return '2025-08-15';
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

// 특정 날짜의 섹터 데이터 가져오기 (detail_dates에서 score 평균 계산)
const getSectorDataForDate = async (sectorId: string, date: string): Promise<DateData | null> => {
  try {
    console.log(`섹터 ${sectorId}의 ${date} detail_dates 데이터 가져오기...`);
    
    // detail_dates 경로에서 해당 날짜 문서 가져오기
    const detailDateDocRef = doc(db, `sector_detail/${sectorId}/detail_dates`, date);
    const detailDateDoc = await getDoc(detailDateDocRef);
    
    if (detailDateDoc.exists()) {
      const data = detailDateDoc.data();
      console.log(`섹터 ${sectorId} ${date} detail_dates 데이터:`, data);
      
      // 각 채널별 score 값 추출 및 평균 계산
      let averageScore = 0;
      const allScores: number[] = [];
      
      // 데이터의 각 채널을 순회하면서 score 값 수집
      Object.keys(data).forEach(channelName => {
        const channelData = data[channelName];
        if (channelData && typeof channelData === 'object' && 'score' in channelData) {
          const score = channelData.score;
          if (typeof score === 'number' && !isNaN(score)) {
            allScores.push(score);
            console.log(`섹터 ${sectorId} 채널 "${channelName}" score:`, score);
          }
        }
      });
      
      // 수집된 모든 score의 평균 계산
      if (allScores.length > 0) {
        averageScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
        console.log(`섹터 ${sectorId} 전체 score 평균:`, averageScore, '(', allScores.length, '개 채널)');
      } else {
        console.log(`섹터 ${sectorId}: score 데이터를 찾을 수 없습니다.`);
      }
      
      // dates 경로에서 counts 데이터 가져오기
      const countsData = await getSectorCountsForDate(sectorId, date);
      const finalCounts = countsData || { positive: 0, negative: 0, neutral: 0 };
      
      return {
        score: averageScore,
        counts: finalCounts
      };
    } else {
      console.log(`섹터 ${sectorId} ${date} detail_dates 문서가 존재하지 않습니다.`);
      return null;
    }
  } catch (error) {
    console.error(`섹터 ${sectorId} 날짜 ${date} detail_dates 데이터 가져오기 오류:`, error);
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
    const scoreDocRef = doc(db, 'sector_score', targetDate);
    const scoreDocSnap = await getDoc(scoreDocRef);

    if (!scoreDocSnap.exists()) {
      console.warn(`sector_score/${targetDate} 문서를 찾을 수 없습니다.`);
      return [];
    }

    const data = scoreDocSnap.data() as Record<string, any>;
    const sectorDataList: StockData[] = [];

    for (const [sectorId, sectorValue] of Object.entries(data)) {
      try {
        // 전일(0), 전전일(1) 데이터 추출
        const d0 = sectorValue?.['0'] || {};
        const d1 = sectorValue?.['1'] || {};

        // 전일 데이터 카운트
        const p0: number = Number(d0.positive || d0.pos || 0);
        const n0: number = Number(d0.negative || d0.neg || 0);
        const u0: number = Number(d0.neutral || d0.neu || 0);
        const t0 = p0 + n0 + u0;

        // 전전일 데이터 카운트
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

        // 종합점수는 전일 긍정 비율을 대표값으로 사용, 변화는 p.p. 차이
        const totalScore = positivePct0;
        const scoreDiff = positivePct0 - positivePct1;

        // 반응 비율: 전일 긍정 비율
        const reactionRate = positivePct0;
        const reactionDiff = positiveDiff;

        // 나머지 컬럼의 변화도 p.p 차이로 표기
        const positiveChange = positiveDiff;
        const negativeChange = negativePct0 - negativePct1;
        const neutralChange  = neutralPct0 - neutralPct1;

        sectorDataList.push({
          id: sectorId,
          name: sectorId,
          sector: sectorId,
          totalScore: totalScore,
          positiveOpinions: p0,
          negativeOpinions: n0,
          neutralOpinions: u0,
          reactionRate: reactionRate,
          scoreChange: scoreDiff,
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
    // 전일 긍정 비율 기준 내림차순 정렬
    return sectorDataList.sort((a, b) => b.totalScore - a.totalScore);
  } catch (error) {
    console.error('실제 섹터 데이터 가져오기 오류:', error);
    return [];
  }
};
