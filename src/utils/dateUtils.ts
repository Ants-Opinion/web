/**
 * 서울 시간(UTC+9) 기준 날짜 유틸리티 함수들
 */

/**
 * 서울 시간 기준으로 현재 날짜를 YYYY-MM-DD 형식으로 반환
 */
export const getSeoulDateString = (date: Date = new Date()): string => {
  // toLocaleString을 사용하여 서울 시간대로 변환
  const seoulDateStr = date.toLocaleString('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return seoulDateStr; // 'YYYY-MM-DD' 형식
};

/**
 * 서울 시간 기준으로 어제 날짜를 YYYY-MM-DD 형식으로 반환
 */
export const getSeoulYesterdayString = (): string => {
  const now = new Date();
  // 서울 시간대로 현재 날짜 구하기
  const seoulNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  seoulNow.setDate(seoulNow.getDate() - 1);

  const year = seoulNow.getFullYear();
  const month = String(seoulNow.getMonth() + 1).padStart(2, '0');
  const day = String(seoulNow.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * 주어진 날짜에서 일수를 더하거나 빼서 YYYY-MM-DD 형식으로 반환
 * (이미 YYYY-MM-DD 형식인 문자열을 기준으로 계산)
 */
export const addDaysToDateString = (dateString: string, days: number): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // 로컬 날짜로 생성
  date.setDate(date.getDate() + days);

  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');

  return `${newYear}-${newMonth}-${newDay}`;
};
