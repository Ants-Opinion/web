import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface SentimentCriteria {
  positive: {
    min: number;
    max: number;
  };
  negative: {
    min: number;
    max: number;
  };
  neutral: {
    min: number;
    max: number;
  };
}

// 기본 감정 분류 기준 (소수점 고려)
const DEFAULT_CRITERIA: SentimentCriteria = {
  positive: {
    min: 70,
    max: 100
  },
  negative: {
    min: 0,
    max: 40
  },
  neutral: {
    min: 40,
    max: 70
  }
};

// 감정 분류 기준 초기화 (users 컬렉션에 저장)
export const initializeSentimentCriteria = async (): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ 사용자가 로그인되지 않았습니다.');
      return;
    }

    console.log('✅ 현재 로그인된 사용자 UID:', user.uid);
    console.log('📍 데이터베이스 경로:', `/users/${user.uid}`);

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists() || !userDoc.data()?.sentimentCriteria) {
      console.log('🔄 감정 분류 기준을 초기화합니다...');
      console.log('📝 저장할 기본 기준:', DEFAULT_CRITERIA);
      
      await setDoc(userDocRef, {
        sentimentCriteria: DEFAULT_CRITERIA,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log('✅ 감정 분류 기준이 데이터베이스에 저장되었습니다!');
      console.log('📍 저장 위치:', `/users/${user.uid}/sentimentCriteria`);
      console.log('💾 저장된 데이터:', DEFAULT_CRITERIA);
    } else {
      const existingData = userDoc.data()?.sentimentCriteria;
      console.log('✅ 기존 감정 분류 기준이 존재합니다.');
      console.log('📍 위치:', `/users/${user.uid}/sentimentCriteria`);
      console.log('💾 기존 데이터:', existingData);
    }
  } catch (error) {
    console.error('감정 분류 기준 초기화 오류:', error);
  }
};

// 감정 분류 기준 가져오기
export const getSentimentCriteria = async (): Promise<SentimentCriteria> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ 사용자가 로그인되지 않음, 기본 기준 사용');
      return DEFAULT_CRITERIA;
    }

    console.log('🔍 감정 분류 기준 조회 중... 사용자 UID:', user.uid);

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists() && userDoc.data()?.sentimentCriteria) {
      const criteria = userDoc.data().sentimentCriteria as SentimentCriteria;
      console.log('✅ 사용자 감정 분류 기준 로드 성공!');
      console.log('📍 위치:', `/users/${user.uid}/sentimentCriteria`);
      console.log('💾 로드된 데이터:', criteria);
      return criteria;
    } else {
      console.log('❌ 사용자 기준이 없음, 기본 기준으로 초기화');
      await initializeSentimentCriteria();
      return DEFAULT_CRITERIA;
    }
  } catch (error) {
    console.error('❌ 감정 분류 기준 가져오기 오류:', error);
    return DEFAULT_CRITERIA;
  }
};

// 점수를 기준으로 감정 분류 (소수점 고려)
export const classifySentiment = (score: number, criteria: SentimentCriteria): 'positive' | 'negative' | 'neutral' => {
  // 소수점 점수를 고려한 명확한 분류
  // 70.0 이상: 긍정적
  if (score >= criteria.positive.min) {
    return 'positive';
  }
  // 40.0 미만: 부정적  
  else if (score < criteria.negative.max) {
    return 'negative';
  }
  // 40.0 이상 70.0 미만: 중립적
  else {
    return 'neutral';
  }
};

// 감정 분류 기준 업데이트
export const updateSentimentCriteria = async (newCriteria: SentimentCriteria): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('사용자가 로그인되지 않았습니다.');
    }

    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      sentimentCriteria: newCriteria,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log('감정 분류 기준이 업데이트되었습니다:', newCriteria);
  } catch (error) {
    console.error('감정 분류 기준 업데이트 오류:', error);
    throw error;
  }
};
