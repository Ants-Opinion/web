import { db, auth } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';

export interface FavoriteSector {
  id: string;
  userId: string;
  sectorId: string;
  sectorName: string;
  addedAt: Date;
}

// 즐겨찾기 추가
export const addToFavorites = async (sectorId: string, sectorName: string): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('사용자가 로그인되지 않았습니다.');
    }

    const favoriteRef = doc(collection(db, 'favorites'));
    const favoriteData = {
      id: favoriteRef.id,
      userId: user.uid,
      sectorId,
      sectorName,
      addedAt: new Date()
    };

    await setDoc(favoriteRef, favoriteData);
    console.log('즐겨찾기에 추가됨:', sectorName);
  } catch (error) {
    console.error('즐겨찾기 추가 오류:', error);
    throw error;
  }
};

// 즐겨찾기 제거
export const removeFromFavorites = async (sectorId: string): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('사용자가 로그인되지 않았습니다.');
    }

    // 사용자 ID와 섹터 ID로 즐겨찾기 문서 찾기
    const favoritesRef = collection(db, 'favorites');
    const q = query(
      favoritesRef,
      where('userId', '==', user.uid),
      where('sectorId', '==', sectorId)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docToDelete = querySnapshot.docs[0];
      await deleteDoc(docToDelete.ref);
      console.log('즐겨찾기에서 제거됨:', sectorId);
    }
  } catch (error) {
    console.error('즐겨찾기 제거 오류:', error);
    throw error;
  }
};

// 사용자의 모든 즐겨찾기 조회
export const getUserFavorites = async (): Promise<FavoriteSector[]> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('사용자가 로그인되지 않았습니다.');
    }

    const favoritesRef = collection(db, 'favorites');
    const q = query(
      favoritesRef,
      where('userId', '==', user.uid)
    );
    
    const querySnapshot = await getDocs(q);
    const favorites: FavoriteSector[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      favorites.push({
        id: doc.id,
        userId: data.userId,
        sectorId: data.sectorId,
        sectorName: data.sectorName,
        addedAt: data.addedAt instanceof Date ? data.addedAt : data.addedAt.toDate()
      });
    });

    // 클라이언트에서 정렬 (Firestore 인덱스 문제 방지)
    return favorites.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
  } catch (error) {
    console.error('즐겨찾기 조회 오류:', error);
    throw error;
  }
};

// 특정 섹터가 즐겨찾기에 있는지 확인
export const isSectorFavorite = async (sectorId: string): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return false;
    }

    const favoritesRef = collection(db, 'favorites');
    const q = query(
      favoritesRef,
      where('userId', '==', user.uid),
      where('sectorId', '==', sectorId)
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('즐겨찾기 확인 오류:', error);
    return false;
  }
};

// 사용자의 즐겨찾기 개수 조회
export const getFavoriteCount = async (): Promise<number> => {
  try {
    const favorites = await getUserFavorites();
    return favorites.length;
  } catch (error) {
    console.error('즐겨찾기 개수 조회 오류:', error);
    return 0;
  }
};
