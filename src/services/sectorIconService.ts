// 섹터 아이콘 매핑 서비스
// 모든 페이지에서 공통으로 사용하는 섹터 아이콘 매핑

// 섹터명 → 아이콘 파일명 매핑
const sectorIconMap: { [key: string]: string } = {
  // === 한글 섹터명 ===
  // 금융
  '은행': 'Icon_Sector=Bank.png',
  '보험': 'Icon_Sector=Insurance.png',
  
  // IT/반도체
  'IT': 'Icon_Sector=IT.png',
  '반도체': 'Icon_Sector=Semiconductor.png',
  '디스플레이': 'Icon_Sector=Display.png',
  
  // 게임/엔터테인먼트
  '게임': 'Icon_Sector=Game.png',
  '엔터테인먼트': 'Icon_Sector=Entertainment.png',
  '엔터': 'Icon_Sector=Entertainment.png',
  
  // 화장품/뷰티
  '화장품': 'Icon_Sector=Cosmatic.png',
  '스킨케어': 'Icon_Sector=SkinCare.png',
  '피부미용': 'Icon_Sector=SkinCare.png',
  
  // 자동차/제조
  '자동차': 'Icon_Sector=Car.png',
  '건설': 'Icon_Sector=Construction.png',
  '화학': 'Icon_Sector=Chemistry.png',
  '철강': 'Icon_Sector=Iron.png',
  '조선': 'Icon_Sector=Vessle.png',
  '선박': 'Icon_Sector=Vessle.png',
  
  // 에너지
  '전력': 'Icon_Sector=Electricity.png',
  '전기': 'Icon_Sector=Electricity.png',
  '2차전지': 'Icon_Sector=SecondaryElectricity.png',
  '이차전지': 'Icon_Sector=SecondaryElectricity.png',
  '풍력': 'Icon_Sector=WindEnergy.png',
  '풍력에너지': 'Icon_Sector=WindEnergy.png',
  '수소': 'Icon_Sector=Hydrogen.png',
  '원전': 'Icon_Sector=NuclarEnergy.png',
  '원자력': 'Icon_Sector=NuclarEnergy.png',
  '원자력에너지': 'Icon_Sector=NuclarEnergy.png',
  '핵에너지': 'Icon_Sector=NuclarEnergy.png',
  
  // 방산
  '방산': 'Icon_Sector=DefenceIndustry.png',
  '방산산업': 'Icon_Sector=DefenceIndustry.png',
  
  // 유통/서비스
  '유통': 'Icon_Sector=Distribution.png',
  '여행': 'Icon_Sector=Travel.png',
  '관광': 'Icon_Sector=Travel.png',
  
  // 식품
  '식품': 'Icon_Sector=Food.png',
  '음식료': 'Icon_Sector=Food.png',
  
  // 패션
  '패션': 'Icon_Sector=Fashion.png',
  
  // 바이오/의료
  '바이오': 'Icon_Sector=Biotech.png',
  '바이오테크': 'Icon_Sector=Biotech.png',
  '임플란트': 'Icon_Sector=Implant.png',
  
  // 전선/케이블
  '전선': 'Icon_Sector=Wire.png',
  '케이블': 'Icon_Sector=Wire.png',

  // === 영문 섹터명 ===
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

// 부분 매칭용 키워드 매핑
const partialMatchMap: { [key: string]: string } = {
  '피부': 'Icon_Sector=SkinCare.png',
  '미용': 'Icon_Sector=SkinCare.png',
  '뷰티': 'Icon_Sector=Cosmatic.png',
  '전지': 'Icon_Sector=SecondaryElectricity.png',
  '배터리': 'Icon_Sector=SecondaryElectricity.png',
  '에너지': 'Icon_Sector=Electricity.png',
  '핵': 'Icon_Sector=NuclarEnergy.png',
  '칩': 'Icon_Sector=Semiconductor.png',
  '미디어': 'Icon_Sector=Entertainment.png',
  '차량': 'Icon_Sector=Car.png',
  '건축': 'Icon_Sector=Construction.png',
  '금속': 'Icon_Sector=Iron.png',
  '운송': 'Icon_Sector=Distribution.png',
  '음식': 'Icon_Sector=Food.png',
  '의류': 'Icon_Sector=Fashion.png',
  '화면': 'Icon_Sector=Display.png',
  '생명': 'Icon_Sector=Biotech.png',
  '의료': 'Icon_Sector=Implant.png'
};

/**
 * 섹터명에 해당하는 아이콘 파일명을 반환
 * @param sectorName 섹터명 (한글 또는 영문)
 * @returns 아이콘 파일명 (예: 'Icon_Sector=IT.png') 또는 빈 문자열
 */
export const getSectorIconFileName = (sectorName: string): string => {
  if (!sectorName) return '';

  // 1. 정확한 매칭 시도
  if (sectorIconMap[sectorName]) {
    return sectorIconMap[sectorName];
  }

  // 2. 대소문자 무시 정확한 매칭
  const lowerSectorName = sectorName.toLowerCase();
  for (const [key, value] of Object.entries(sectorIconMap)) {
    if (key.toLowerCase() === lowerSectorName) {
      return value;
    }
  }

  // 3. 부분 매칭 시도 (sectorIconMap)
  for (const [key, value] of Object.entries(sectorIconMap)) {
    if (lowerSectorName.includes(key.toLowerCase()) || 
        key.toLowerCase().includes(lowerSectorName)) {
      return value;
    }
  }

  // 4. 부분 매칭 시도 (partialMatchMap - 키워드 기반)
  for (const [keyword, value] of Object.entries(partialMatchMap)) {
    if (lowerSectorName.includes(keyword.toLowerCase())) {
      return value;
    }
  }

  // 매칭 실패 시 빈 문자열 반환 (기본 아이콘으로 fallback하도록)
  console.warn(`섹터 아이콘 매핑 실패: "${sectorName}"`);
  return '';
};

/**
 * 섹터명에 해당하는 아이콘 전체 경로를 반환
 * @param sectorName 섹터명 (한글 또는 영문)
 * @returns 아이콘 전체 경로 (예: '/img/Sector_Icon/Icon_Sector=IT.png') 또는 빈 문자열
 */
export const getSectorIconPath = (sectorName: string): string => {
  const fileName = getSectorIconFileName(sectorName);
  if (fileName) {
    return `/img/Sector_Icon/${fileName}`;
  }
  return '';
};




