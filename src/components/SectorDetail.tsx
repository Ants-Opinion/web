import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import PieChart from './PieChart';
import ReactionModal from './ReactionModal';
import { getSentimentCriteria, classifySentiment, initializeSentimentCriteria, type SentimentCriteria } from '../services/sentimentService';
import './SectorDetail.css';

interface ReactionItem {
  title: string;
  content: string;
  source: string;
  time: string;
  views: number;
}

interface SectorDetailData {
  counts: {
    positive: number;
    negative: number;
    neutral: number;
  };
  summary: {
    positive: {
      headline: string | null;
      summary: string | null;
    };
    negative: {
      headline: string | null;
      summary: string | null;
    };
    neutral: {
      headline: string | null;
      summary: string | null;
    };
  };
  detailReactions: {
    positive: ReactionItem[];
    negative: ReactionItem[];
    neutral: ReactionItem[];
  };
}

const SectorDetail: React.FC = () => {
  const { sectorId } = useParams<{ sectorId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SectorDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'positive' | 'negative' | 'neutral'>('positive');
  const [modalTitle, setModalTitle] = useState('');
  const [sentimentCriteria, setSentimentCriteria] = useState<SentimentCriteria | null>(null);

  useEffect(() => {
    const fetchSectorDetail = async () => {
      if (!sectorId) return;

      try {
        setLoading(true);
        console.log(`섹터 ${sectorId} 세부 정보 로딩 시작...`);

        // 감정 분류 기준 초기화 및 로드
        await initializeSentimentCriteria();
        const criteria = await getSentimentCriteria();
        setSentimentCriteria(criteria);
        console.log('감정 분류 기준 로드 완료:', criteria);

        // 최신 날짜 데이터 가져오기 (2025-08-15 고정)
        const dateDocRef = doc(db, `sector_detail/${sectorId}/dates`, '2025-08-15');
        const dateDoc = await getDoc(dateDocRef);

        // detail_dates 데이터 가져오기
        const detailDateDocRef = doc(db, `sector_detail/${sectorId}/detail_dates`, '2025-08-15');
        const detailDateDoc = await getDoc(detailDateDocRef);

        if (dateDoc.exists()) {
          const docData = dateDoc.data();
          const detailData = detailDateDoc.exists() ? detailDateDoc.data() : {};
          console.log(`섹터 ${sectorId} 데이터:`, docData);
          console.log(`섹터 ${sectorId} 상세 데이터:`, detailData);

          setData({
            counts: {
              positive: docData.counts?.positive || 0,
              negative: docData.counts?.negative || 0,
              neutral: docData.counts?.neutral || 0
            },
            summary: {
              positive: {
                headline: docData.summary?.positive?.headline || null,
                summary: docData.summary?.positive?.summary || null
              },
              negative: {
                headline: docData.summary?.negative?.headline || null,
                summary: docData.summary?.negative?.summary || null
              },
              neutral: {
                headline: docData.summary?.neutral?.headline || null,
                summary: docData.summary?.neutral?.summary || null
              }
            },
            detailReactions: {
              positive: parseDetailReactions(detailData, 'positive', criteria),
              negative: parseDetailReactions(detailData, 'negative', criteria),
              neutral: parseDetailReactions(detailData, 'neutral', criteria)
            }
          });
        } else {
          setError('해당 섹터의 데이터를 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error('섹터 세부 정보 로딩 오류:', err);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchSectorDetail();
  }, [sectorId]);

  const handleBack = () => {
    window.history.back();
  };

  // detail_dates 데이터 파싱 함수 (새로운 감정 분류 기준 사용)
  const parseDetailReactions = (detailData: any, type: 'positive' | 'negative' | 'neutral', criteria: SentimentCriteria): ReactionItem[] => {
    const reactions: ReactionItem[] = [];
    
    if (!detailData) {
      console.log(`${type} 반응: detailData가 없습니다.`);
      return reactions;
    }

    if (!criteria) {
      console.log(`${type} 반응: 감정 분류 기준이 없습니다.`);
      return reactions;
    }

    console.log(`${type} 반응 파싱 시작 (기준: ${criteria[type].min}-${criteria[type].max}점):`, detailData);

    // detailData의 각 채널을 순회 (예: "Brain and Body Research")
    Object.keys(detailData).forEach(channelName => {
      const channelData = detailData[channelName];
      console.log(`채널 ${channelName} 데이터:`, channelData);
      
      if (channelData && channelData.posts && Array.isArray(channelData.posts)) {
        console.log(`채널 ${channelName}의 posts 개수:`, channelData.posts.length);
        
        channelData.posts.forEach((post: any, postIndex: number) => {
          console.log(`채널 ${channelName} 포스트 ${postIndex}:`, {
            score: post.score,
            content: post.content ? post.content.substring(0, 50) + '...' : 'No content',
            time: post.time,
            views: post.views
          });
          
          // 새로운 감정 분류 기준 사용
          let postType: 'positive' | 'negative' | 'neutral' = 'neutral';
          
          if (typeof post.score === 'number') {
            postType = classifySentiment(post.score, criteria);
            console.log(`포스트 분류: score=${post.score} -> ${postType} (기준: 긍정=${criteria.positive.min}-${criteria.positive.max}, 부정=${criteria.negative.min}-${criteria.negative.max}, 중립=${criteria.neutral.min}-${criteria.neutral.max})`);
          } else {
            console.log(`포스트 ${postIndex}: score가 숫자가 아님 (${typeof post.score}), 중립으로 분류`);
          }
          
          if (postType === type && post.content) {
            console.log(`${type} 반응에 추가:`, channelName, `(점수: ${post.score})`);
            reactions.push({
              title: channelName, // 채널명을 제목으로 사용
              content: post.content,
              source: channelName,
              time: post.time || '2025년 07월 21일 15:20',
              views: post.views || 0
            });
          }
        });
      } else {
        console.log(`채널 ${channelName}: posts 데이터가 없거나 배열이 아닙니다.`);
      }
    });

    console.log(`${type} 반응 최종 결과:`, reactions.length, '개');
    return reactions.slice(0, 10); // 최대 10개만 반환
  };

  const handleReactionModalOpen = (type: 'positive' | 'negative' | 'neutral') => {
    setModalType(type);
    setModalTitle(sectorId || '');
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  if (loading) {
    return (
      <div className="sector-detail-container">
        <div className="loading">데이터를 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sector-detail-container">
        <div className="error">{error}</div>
        <button onClick={handleBack} className="back-button">
          돌아가기
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="sector-detail-container">
        <div className="error">데이터가 없습니다.</div>
        <button onClick={handleBack} className="back-button">
          돌아가기
        </button>
      </div>
    );
  }

  const totalOpinions = data.counts.positive + data.counts.negative + data.counts.neutral;

  return (
    <div className="sector-detail-container">
      {/* 헤더 */}
      <div className="sector-header">
        <button onClick={handleBack} className="back-button">
          ← 돌아가기
        </button>
        <h1 className="sector-title">{sectorId}</h1>
        <div className="update-info">
          화장품 오늘 00:00 기준
        </div>
      </div>

      {/* 필터 버튼 */}
      <div className="filter-buttons">
        <button className="filter-btn active">1일</button>
        <button className="filter-btn">1주</button>
        <button className="filter-btn">1개월</button>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="main-content">
        {/* 사람들의 반응 요약 */}
        <div className="reaction-summary">
          <h2>사람들의 반응 요약</h2>
          <p className="summary-subtitle">
            수소 종목에 대한 사람들의 반응을 모아봤어요!
          </p>
          <p className="summary-source">
            출처: 텔레그램 채널, 컴프가
          </p>

          {/* 원그래프와 의견 */}
          <div className="chart-and-opinions">
            <div className="chart-container">
              <PieChart 
                positive={data.counts.positive}
                negative={data.counts.negative}
                neutral={data.counts.neutral}
              />
            </div>

            <div className="opinions-container">
              {/* 긍정적 반응 */}
              <div className="opinion-section positive">
                <div className="opinion-section-header">
                  <h3>긍정적 반응</h3>
                  <button 
                    className="reaction-detail-btn positive"
                    onClick={() => handleReactionModalOpen('positive')}
                  >
                    <span className="btn-icon">🔍</span>
                    주요반응보기
                  </button>
                </div>
                <div className="opinion-content">
                  <div className="opinion-header">
                    {data.summary.positive.headline || '긍정적 의견이 없습니다.'}
                  </div>
                  {data.summary.positive.summary && (
                    <div className="opinion-summary">
                      {data.summary.positive.summary}
                    </div>
                  )}
                </div>
              </div>

              {/* 부정적 반응 */}
              <div className="opinion-section negative">
                <div className="opinion-section-header">
                  <h3>부정적 반응</h3>
                  <button 
                    className="reaction-detail-btn negative"
                    onClick={() => handleReactionModalOpen('negative')}
                  >
                    <span className="btn-icon">🔍</span>
                    주요반응보기
                  </button>
                </div>
                <div className="opinion-content">
                  <div className="opinion-header">
                    {data.summary.negative.headline || '부정적 의견이 없습니다.'}
                  </div>
                  {data.summary.negative.summary && (
                    <div className="opinion-summary">
                      {data.summary.negative.summary}
                    </div>
                  )}
                </div>
              </div>

              {/* 중립적 반응 */}
              <div className="opinion-section neutral">
                <div className="opinion-section-header">
                  <h3>중립적 반응</h3>
                  <button 
                    className="reaction-detail-btn neutral"
                    onClick={() => handleReactionModalOpen('neutral')}
                  >
                    <span className="btn-icon">🔍</span>
                    주요반응보기
                  </button>
                </div>
                <div className="opinion-content">
                  <div className="opinion-header">
                    {data.summary.neutral.headline || '중립적 의견이 없습니다.'}
                  </div>
                  {data.summary.neutral.summary && (
                    <div className="opinion-summary">
                      {data.summary.neutral.summary}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 통계 정보 */}
        <div className="stats-info">
          <div className="stat-item">
            <span className="stat-label">총 의견 수:</span>
            <span className="stat-value">{totalOpinions}개</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">긍정 비율:</span>
            <span className="stat-value positive">
              {totalOpinions > 0 ? Math.round((data.counts.positive / totalOpinions) * 100) : 0}%
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">부정 비율:</span>
            <span className="stat-value negative">
              {totalOpinions > 0 ? Math.round((data.counts.negative / totalOpinions) * 100) : 0}%
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">중립 비율:</span>
            <span className="stat-value neutral">
              {totalOpinions > 0 ? Math.round((data.counts.neutral / totalOpinions) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* 반응 상세 모달 */}
        {data && (
          <ReactionModal
            isOpen={modalOpen}
            onClose={handleModalClose}
            title={modalTitle}
            reactions={data.detailReactions[modalType]}
            type={modalType}
          />
        )}
      </div>
    </div>
  );
};

export default SectorDetail;
