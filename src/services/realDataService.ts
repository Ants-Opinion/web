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
// const getPreviousDate = (dateStr: string): string => {
//   const date = new Date(dateStr);
//   date.setDate(date.getDate() - 1);
//   return date.toISOString().split('T')[0];
// };

// dates 경로에서 counts 데이터 가져오기
// const getSectorCountsForDate = async (sectorId: string, date: string): Promise<{positive: number, negative: number, neutral: number} | null> => {
//   try {
//     console.log(`섹터 ${sectorId}의 ${date} dates counts 데이터 가져오기...`);
//     
//     const dateDocRef = doc(db, `sector_detail/${sectorId}/dates`, date);
//     const dateDoc = await getDoc(dateDocRef);
//     
//     if (dateDoc.exists()) {
//       const data = dateDoc.data();
//       console.log(`섹터 ${sectorId} ${date} dates 데이터:`, data);
//       
//       const counts = {
//         positive: data.counts?.positive || 0,
//         negative: data.counts?.negative || 0,
//         neutral: data.counts?.neutral || 0
//       };
//       
//       console.log(`섹터 ${sectorId} ${date} counts:`, counts);
//       return counts;
//     } else {
//       console.log(`섹터 ${sectorId} ${date} dates 문서가 존재하지 않습니다.`);
//       return null;
//     }
//   } catch (error) {
//     console.error(`섹터 ${sectorId} 날짜 ${date} dates counts 가져오기 오류:`, error);
//     return null;
//   }
// };

// 특정 날짜의 섹터 데이터 가져오기 (sector_score에서 1번 필드 값 사용)
// const getSectorDataForDate = async (sectorId: string, date: string): Promise<DateData | null> => {
//   try {
//     console.log(`섹터 ${sectorId}의 ${date} sector_score 데이터 가져오기...`);
//     
//     // sector_score 경로에서 해당 날짜 문서 가져오기
//     const sectorScoreDocRef = doc(db, `sector_score/${date}`);
//     const sectorScoreDoc = await getDoc(sectorScoreDocRef);
//     
//     if (sectorScoreDoc.exists()) {
//       const data = sectorScoreDoc.data();
//       console.log(`섹터 ${sectorId} ${date} sector_score 데이터:`, data);
//       
//       // 해당 섹터의 1번 필드 값 찾기
//       const sectorData = data[sectorId];
//       if (sectorData && sectorData[1]) {
//         const score = sectorData[1];
//         console.log(`섹터 ${sectorId} ${date} 1번 필드 값:`, score);
//         
//         return {
//           score: score,
//           counts: {
//             positive: 0, // counts는 별도로 계산
//             negative: 0,
//             neutral: 0
//           }
//         };
//       } else {
//         console.log(`섹터 ${sectorId} ${date} 1번 필드 데이터가 없습니다.`);
//         return null;
//       }
//     } else {
//       console.log(`섹터 ${sectorId} ${date} sector_score 문서가 존재하지 않습니다.`);
//       return null;
//     }
//   } catch (error) {
//     console.error(`섹터 ${sectorId} 날짜 ${date} sector_score 가져오기 오류:`, error);
//     return null;
//   }
// };

// 섹터별 종목 목록 가져오기 (섹터 문서에서 직접)
// const getStocksInSector = async (sectorId: string): Promise<string[]> => {
//   try {
//     console.log(`섹터 ${sectorId} 문서에서 종목 목록 가져오기 시도...`);
//     
//     // 섹터 문서 직접 가져오기
//     const sectorDocRef = doc(db, 'sector_detail', sectorId);
//     const sectorDoc = await getDoc(sectorDocRef);
//     
//     if (sectorDoc.exists()) {
//       const sectorData = sectorDoc.data();
//       console.log(`섹터 ${sectorId} 문서 데이터:`, sectorData);
//       
//       // 문서에서 종목 목록 찾기 (필드명을 추정해서 시도)
//       const possibleFields = ['stocks', 'companies', 'items', 'list', 'names'];
//       
//       for (const field of possibleFields) {
//         if (sectorData[field] && Array.isArray(sectorData[field])) {
//           console.log(`섹터 ${sectorId}에서 ${field} 필드에서 종목 발견:`, sectorData[field]);
//           return sectorData[field];
//         }
//       }
//       
//       // 만약 배열 필드가 없다면, 모든 키를 종목명으로 간주
//       const allKeys = Object.keys(sectorData);
//       console.log(`섹터 ${sectorId}의 모든 키:`, allKeys);
//       
//       // 시스템 필드 제외하고 종목명으로 간주
//       const stockNames = allKeys.filter(key => 
//         !key.startsWith('_') && 
//         key !== 'createdAt' && 
//         key !== 'updatedAt' &&
//         key !== 'name' &&
//         key !== 'description'
//       );
//       
//       console.log(`섹터 ${sectorId}에서 추출한 종목명:`, stockNames);
//       return stockNames;
//     } else {
//       console.log(`섹터 ${sectorId} 문서가 존재하지 않습니다.`);
//       return [];
//     }
//   } catch (error) {
//     console.error(`섹터 ${sectorId} 종목 목록 가져오기 오류:`, error);
//     return [];
//   }
// };

// 특정 종목의 특정 날짜 데이터 가져오기
// const getStockDetailForDate = async (sectorId: string, stockName: string, date: string): Promise<DateData | null> => {
//   try {
//     const stockDocRef = doc(db, `sector_detail/${sectorId}/detail_dates/${stockName}/dates`, date);
//     const stockDoc = await getDoc(stockDocRef);
//     
//     if (stockDoc.exists()) {
//       const data = stockDoc.data();
//       return {
//         score: data.score || 0,
//         counts: {
//           positive: data.counts?.positive || 0,
//           negative: data.counts?.negative || 0,
//           neutral: data.counts?.neutral || 0
//         }
//       };
//     }
//     return null;
//   } catch (error) {
//     console.error(`종목 ${stockName} 날짜 ${date} 데이터 가져오기 오류:`, error);
//     return null;
//   }
// };

// 변화율 계산
// const calculateChangeRate = (current: number, previous: number): number => {
//   if (previous === 0) return 0;
//   return Math.round(((current - previous) / previous) * 100);
// };

// 반응 비율 계산
// const calculateReactionRate = (counts: { positive: number; negative: number; neutral: number }): number => {
//   const total = counts.positive + counts.negative + counts.neutral;
//   if (total === 0) return 0;
//   return Math.round((counts.positive / total) * 100);
// };

// 실제 섹터 데이터 가져오기
export const getRealStockData = async (targetDate: string): Promise<StockData[]> => {
  console.log('🚀 getRealStockData 함수 시작:', targetDate);
  
  try {
    console.log('실제 섹터 데이터 가져오기 시작... (sector_score 기반)', targetDate);
    
    // 기준 날짜와 전전일 날짜 계산
    const baseDate = new Date(targetDate);
    const previousDate = new Date(baseDate);
    previousDate.setDate(baseDate.getDate() - 1);
    const previousDateString = previousDate.toISOString().split('T')[0];
    
    console.log(`기준 날짜: ${targetDate}, 전전일 날짜: ${previousDateString}`);
    
    // 기준 날짜 데이터 가져오기
    const data: Record<string, unknown> = {};
    const previousData: Record<string, unknown> = {};
    
    // sector_score/2025-08-23 문서 가져오기
    const scoreDocRef = doc(db, 'sector_score', targetDate);
    const scoreDocSnap = await getDoc(scoreDocRef);
    
    if (scoreDocSnap.exists()) {
      const scoreData = scoreDocSnap.data();
      console.log(`✅ ${targetDate} 문서에서 데이터 발견:`, Object.keys(scoreData).length, '개 섹터');
      console.log('📊 발견된 섹터들:', Object.keys(scoreData));
      
      // 각 섹터의 데이터를 data 객체에 저장
      for (const [sectorId, sectorData] of Object.entries(scoreData)) {
        data[sectorId] = sectorData;
      }
    } else {
      console.log(`❌ ${targetDate} 문서가 존재하지 않습니다.`);
      console.log('🔍 빈 배열 반환 - 데이터 없음');
      console.log('📝 함수 종료: 빈 배열 반환');
      return [];
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
    
    // 데이터를 찾지 못한 경우
    if (Object.keys(data).length === 0) {
      console.log(`⚠️ ${targetDate} 날짜에 섹터 데이터를 찾을 수 없습니다.`);
      console.log('📊 data 객체 내용:', data);
      console.log('📊 previousData 객체 내용:', previousData);
      console.log('📝 함수 종료: 빈 배열 반환 (데이터 없음)');
      return [];
    }
    
    console.log(`✅ ${targetDate} 날짜에 ${Object.keys(data).length}개 섹터 데이터 발견:`, Object.keys(data));
    
    // 섹터 데이터를 StockData 형태로 변환
    const sectorDataList: StockData[] = [];

    for (const [sectorId, sectorValue] of Object.entries(data)) {
      try {
        // 데이터 유효성 검증
        if (!sectorValue || typeof sectorValue !== 'object') {
          console.log(`섹터 ${sectorId}: 유효하지 않은 데이터 구조, 건너뜀`);
          continue;
        }
        
        // 0번과 1번 문서 존재 여부 확인
        if (!(sectorValue as Record<string, unknown>)['0'] || !(sectorValue as Record<string, unknown>)['1']) {
          console.log(`섹터 ${sectorId}: 0번 또는 1번 문서 누락, 건너뜀`);
          continue;
        }
        
        // 기준 날짜의 1번 필드 값 (종합점수)
        const currentScore = (sectorValue as Record<string, unknown>)['1'];
        if (typeof currentScore !== 'number' || isNaN(currentScore)) {
          console.log(`섹터 ${sectorId}: 유효하지 않은 점수 데이터, 건너뜀`);
          continue;
        }
        
        // 전전일의 1번 필드 값
        const previousScore = (previousData[sectorId] as Record<string, unknown>)?.['1'] as number || 0;
        
        // 전전일 차이 계산 (백분율)
        const scoreChange = previousScore > 0 ? ((currentScore - previousScore) / previousScore) * 100 : 0;
        
        // 소수점 둘째자리에서 반올림하여 소수 첫째자리까지
        const roundedCurrentScore = parseFloat(currentScore.toFixed(1));
        const roundedScoreChange = parseFloat(scoreChange.toFixed(1));
        
        // 전일 데이터 카운트 (0번 문서)
        const d0 = (sectorValue as Record<string, unknown>)['0'] as Record<string, unknown>;
        const p0: number = Number((d0.positive as number) || (d0.pos as number) || 0);
        const n0: number = Number((d0.negative as number) || (d0.neg as number) || 0);
        const u0: number = Number((d0.neutral as number) || (d0.neu as number) || 0);
        const t0 = p0 + n0 + u0;
        
        // 데이터가 모두 0인 경우 건너뜀 (유효하지 않은 데이터)
        if (t0 === 0) {
          console.log(`섹터 ${sectorId}: 모든 카운트가 0, 건너뜀`);
          continue;
        }

        // 전전일 데이터 카운트 (1번 문서)
        const d1 = (sectorValue as Record<string, unknown>)['1'] as Record<string, unknown>;
        const p1: number = Number((d1.positive as number) || (d1.pos as number) || 0);
        const n1: number = Number((d1.negative as number) || (d1.neg as number) || 0);
        const u1: number = Number((d1.neutral as number) || (d1.neu as number) || 0);
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

        console.log(`섹터 ${sectorId} 데이터 처리 완료:`, {
          score: roundedCurrentScore,
          positive: p0,
          negative: n0,
          neutral: u0,
          total: t0
        });

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

    console.log(`🎯 총 가져온 섹터 수: ${sectorDataList.length}개`);
    console.log('📊 최종 반환할 데이터:', sectorDataList.map(s => ({ sector: s.sector, score: s.totalScore })));
    // 1번 필드 값 기준 내림차순 정렬
    const sortedData = sectorDataList.sort((a, b) => b.totalScore - a.totalScore);
    console.log('📝 함수 종료: 정렬된 데이터 반환');
    return sortedData;
    
  } catch (error) {
    console.error('실제 섹터 데이터 가져오기 오류:', error);
    
    // Firebase 관련 오류 상세 로깅
    if (error instanceof Error) {
      console.error('오류 메시지:', error.message);
      console.error('오류 스택:', error.stack);
    }
    
    // 400 Bad Request 오류인 경우
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Firebase 오류 코드:', (error as { code: string }).code);
    }
    
    return [];
  }
};
