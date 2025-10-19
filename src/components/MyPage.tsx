import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import Header from './Header';
import Footer from './Footer';
import './MyPage.css';

const MyPage: React.FC = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // 폼 상태
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const loadUserData = async () => {
      try {
        setLoading(true);
        // 사용자 데이터 로딩 로직
      } catch (err) {
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user, navigate]);

  const clearMessages = () => {
    setMessage('');
    setError('');
  };

  const handleDisplayNameUpdate = async () => {
    if (!user) return;

    try {
      setSaving(true);
      await updateProfile(user, { displayName });
      setMessage('이름이 성공적으로 업데이트되었습니다.');
    } catch (err) {
      console.error('이름 업데이트 오류:', err);
      setError('이름 업데이트 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!user) return;

    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (newPassword.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    try {
      setSaving(true);
      await updatePassword(user, newPassword);
      setMessage('비밀번호가 성공적으로 변경되었습니다.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      console.error('비밀번호 업데이트 오류:', err);
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'auth/requires-recent-login') {
        setError('보안을 위해 다시 로그인한 후 비밀번호를 변경해주세요.');
      } else {
        setError('비밀번호 변경 중 오류가 발생했습니다.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;

    try {
      setSaving(true);
      await sendPasswordResetEmail(auth, user.email);
      setMessage('비밀번호 재설정 이메일이 발송되었습니다.');
    } catch (err) {
      console.error('비밀번호 재설정 오류:', err);
      setError('비밀번호 재설정 이메일 발송 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mypage-container">
        <Header currentPage="mypage" />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mypage-container">
      <Header currentPage="mypage" />
      
      <div className="mypage-content">
        <div className="mypage-header">
          <h1>마이페이지</h1>
          <p>계정 정보와 설정을 관리하세요</p>
        </div>

        {/* 메시지 표시 */}
        {message && (
          <div className="message success">
            {message}
            <button onClick={clearMessages} className="close-btn">×</button>
          </div>
        )}

        {error && (
          <div className="message error">
            {error}
            <button onClick={clearMessages} className="close-btn">×</button>
          </div>
        )}

        <div className="mypage-sections">
          {/* 계정 정보 섹션 */}
          <section className="mypage-section">
            <h2>계정 정보</h2>
            <div className="form-group">
              <label>이메일</label>
              <input 
                type="email" 
                value={user?.email || ''} 
                className="form-input disabled"
                disabled 
              />
            </div>
            
            <div className="form-group">
              <label>이름</label>
              <div className="input-with-button">
                <input 
                  type="text" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="form-input"
                  placeholder="이름을 입력하세요"
                />
                <button 
                  onClick={handleDisplayNameUpdate}
                  disabled={saving}
                  className="update-btn"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label>가입일</label>
              <input 
                type="text" 
                value={user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('ko-KR') : '알 수 없음'} 
                className="form-input disabled"
                disabled 
              />
            </div>
          </section>

          {/* 비밀번호 변경 섹션 */}
          <section className="mypage-section">
            <h2>비밀번호 변경</h2>
            <div className="form-group">
              <label>새 비밀번호</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-input"
                placeholder="새 비밀번호 (최소 6자)"
              />
            </div>
            
            <div className="form-group">
              <label>비밀번호 확인</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input"
                placeholder="비밀번호 확인"
              />
            </div>
            
            <div className="button-group">
              <button 
                onClick={handlePasswordUpdate}
                disabled={saving || !newPassword || !confirmPassword}
                className="primary-btn"
              >
                {saving ? '변경 중...' : '비밀번호 변경'}
              </button>
              
              <button 
                onClick={handlePasswordReset}
                disabled={saving}
                className="secondary-btn"
              >
                {saving ? '발송 중...' : '재설정 이메일 발송'}
              </button>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MyPage;