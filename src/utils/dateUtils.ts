/**
 * 서울 시간(UTC+9) 기준 날짜 유틸리티 함수들
 */

/**
 * 서울 시간 기준으로 현재 날짜를 YYYY-MM-DD 형식으로 반환
 */
export const getSeoulDateString = (date: Date = new Date()): string => {
  const seoulTime = new Date(date.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
  return seoulTime.toISOString().split('T')[0];
};

/**
 * 서울 시간 기준으로 어제 날짜를 YYYY-MM-DD 형식으로 반환
 */
export const getSeoulYesterdayString = (): string => {
  const now = new Date();
  const seoulTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
  seoulTime.setDate(seoulTime.getDate() - 1);
  return seoulTime.toISOString().split('T')[0];
};

/**
 * 주어진 날짜에서 일수를 더하거나 빼서 YYYY-MM-DD 형식으로 반환
 * (이미 YYYY-MM-DD 형식인 문자열을 기준으로 계산)
 */
export const addDaysToDateString = (dateString: string, days: number): string => {
  const date = new Date(dateString + 'T00:00:00+09:00'); // 서울 시간으로 파싱
  date.setDate(date.getDate() + days);
  // 서울 시간 기준으로 변환
  const seoulTime = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  return seoulTime.toISOString().split('T')[0];
};
