import React from 'react';
import './ReactionModal.css';

interface ReactionItem {
  id: string;
  title: string;
  content: string;
  source: string;
  time: string;
  views: number;
}

interface ReactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  reactions: ReactionItem[];
  type: 'positive' | 'negative' | 'neutral';
  sectorName?: string;
  headline?: string;
}

const ReactionModal: React.FC<ReactionModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  reactions, 
  type,
  sectorName = '수소',
  headline = ''
}) => {
  if (!isOpen) return null;

  const getTypeColor = () => {
    switch (type) {
      case 'positive': return '#ff6b6b';
      case 'negative': return '#4dabf7';
      case 'neutral': return '#adb5bd';
      default: return '#6c757d';
    }
  };

  const getTypeText = () => {
    switch (type) {
      case 'positive': return '긍정적';
      case 'negative': return '부정적';
      case 'neutral': return '중립적';
      default: return '';
    }
  };

  // 채널별로 데이터 그룹화
  const groupReactionsByChannel = () => {
    const grouped: { [key: string]: ReactionItem[] } = {};
    
    reactions.forEach((reaction) => {
      if (!grouped[reaction.source]) {
        grouped[reaction.source] = [];
      }
      grouped[reaction.source].push(reaction);
    });
    
    return grouped;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* 모달 헤더 */}
        <div className="modal-header">
          <div className="modal-title-section">
            <h2 className="modal-main-title">
              {sectorName}에 대한 사람들의 {getTypeText()} 반응
            </h2>
            <div className="modal-subtitle">
              AI 요약
            </div>
            <div className="modal-headline" style={{ color: getTypeColor() }}>
              {headline || '요약이 없습니다.'}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* 모달 콘텐츠 */}
        <div className="modal-content">
          {reactions.length > 0 ? (
            Object.entries(groupReactionsByChannel()).map(([channelName, channelReactions]) => (
              <div key={channelName} className="channel-section">
                <div className="channel-header">
                  <span className="channel-name">
                    텔레그램 · {channelName}
                  </span>
                </div>
                <div className="posts-container">
                  {channelReactions.map((reaction, index) => (
                    <div key={reaction.id} className="post-item">
                      <div className="post-meta">
                        <span className="post-date">
                          {reaction.time}
                        </span>
                        <span className="post-views">
                          조회수 {reaction.views.toLocaleString()}
                        </span>
                      </div>
                      <div className="post-content">
                        {reaction.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="no-reactions">
              {getTypeText()} 반응이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReactionModal;
