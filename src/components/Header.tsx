import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import './Header.css';

interface HeaderProps {
  currentPage?: string;
  showLogout?: boolean;
  showMypage?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  currentPage = 'home', 
  // showLogout = true, 
  showMypage = true 
}) => {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  const handleFavoritesClick = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate('/favorites');
    }
  };

  return (
    <>
      {/* 헤더 배경 */}
      <div className="dashboard-header">
        {/* 로고 */}
        <img 
          className="logo" 
          src="/img/mainLogo.png" 
          alt="로고" 
          onClick={() => navigate('/')} 
        />
        
        {/* 네비게이션 메뉴 */}
        <div className="nav-menu">
          <div 
            className={`nav-item ${currentPage === 'home' ? 'active' : 'inactive'}`}
            onClick={() => navigate('/')}
          >
            홈
          </div>
          <div 
            className={`nav-item ${currentPage === 'favorites' ? 'active' : 'inactive'}`}
            onClick={handleFavoritesClick}
          >
            즐겨찾기
          </div>
        </div>
        
        {/* 우측 버튼들 */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {user ? (
            <>
              {/* 마이페이지 버튼 */}
              {showMypage && (
                <button className="mypage-btn" onClick={() => navigate('/mypage')}>
                  <div className="mypage-text">마이페이지</div>
                </button>
              )}
              
              {/* 로그아웃 버튼 */}
              <button className="logout-btn" onClick={handleLogout}>
                <div className="logout-text">로그아웃</div>
              </button>
            </>
          ) : (
            /* 로그인 버튼 */
            <button className="logout-btn" onClick={() => navigate('/login')}>
              <div className="logout-text">로그인</div>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default Header;
