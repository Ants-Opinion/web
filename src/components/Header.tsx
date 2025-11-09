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
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/');
      setMobileMenuOpen(false);
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
    setMobileMenuOpen(false);
  };

  const handleMypageClick = () => {
    navigate('/mypage');
    setMobileMenuOpen(false);
  };

  const handleLoginClick = () => {
    navigate('/login');
    setMobileMenuOpen(false);
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
          style={{ objectFit: 'contain' }}
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
        
        {/* 우측 버튼들 - 데스크톱 */}
        <div className="header-buttons-desktop">
          {user ? (
            <>
              {/* 마이페이지 버튼 */}
              {showMypage && (
                <button className="header-btn mypage-btn" onClick={handleMypageClick}>
                  <div className="header-btn-text">마이페이지</div>
                </button>
              )}
              
              {/* 로그아웃 버튼 */}
              <button className="header-btn logout-btn" onClick={handleLogout}>
                <div className="header-btn-text">로그아웃</div>
              </button>
            </>
          ) : (
            /* 로그인 버튼 */
            <button className="header-btn login-btn" onClick={handleLoginClick}>
              <div className="header-btn-text">로그인</div>
            </button>
          )}
        </div>

        {/* 햄버거 메뉴 버튼 - 모바일 */}
        <div className="header-buttons-mobile">
          <button 
            className="hamburger-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="메뉴"
          >
            <span className={`hamburger-icon ${mobileMenuOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        </div>

        {/* 모바일 메뉴 드롭다운 */}
        {mobileMenuOpen && (
          <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
            <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
              {user ? (
                <>
                  {showMypage && (
                    <button className="mobile-menu-item" onClick={handleMypageClick}>
                      마이페이지
                    </button>
                  )}
                  <button className="mobile-menu-item" onClick={handleLogout}>
                    로그아웃
                  </button>
                </>
              ) : (
                <button className="mobile-menu-item" onClick={handleLoginClick}>
                  로그인
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Header;
