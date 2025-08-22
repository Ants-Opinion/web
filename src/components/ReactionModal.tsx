import React from 'react';
import './ReactionModal.css';

interface ReactionItem {
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
}

const ReactionModal: React.FC<ReactionModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  reactions, 
  type 
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* 모달 헤더 */}
        <div className="modal-header">
          <div className="modal-title-section">
            <h2 className="modal-main-title">
              {title}에 대한 사람들의 {getTypeText()} 반응
            </h2>
            <div className="modal-subtitle">
              AI 요약
            </div>
            <div className="modal-headline" style={{ color: getTypeColor() }}>
              {reactions.length > 0 ? reactions[0].title : '반응이 없습니다.'}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* 모달 콘텐츠 */}
        <div className="modal-content">
          {reactions.length > 0 ? (
            reactions.map((reaction, index) => (
              <div key={index} className="reaction-item">
                <div className="reaction-header">
                  <span className="reaction-source">
                    텔레그램 · {reaction.source}
                  </span>
                  <div className="reaction-meta">
                    <span className="reaction-date">
                      {reaction.time}
                    </span>
                    <span className="reaction-views">
                      조회수 {reaction.views.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="reaction-content">
                  <div className="reaction-highlight">
                    ※ {getTypeText()}하는 전력시스템의 핵심인 AMI
                  </div>
                  <div className="reaction-text">
                    {reaction.content}
                  </div>
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
