import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import './Header.css';

interface HeaderProps {
  user: any;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('로그아웃 성공');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  const handleMyPageClick = () => {
    navigate('/mypage');
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-left">
          <h1 className="app-title" onClick={() => navigate('/')}>
            AntOpinion
          </h1>
        </div>
        
        <div className="header-center">
          <nav className="nav-menu">
            <button className="nav-btn" onClick={() => navigate('/')}>
              홈
            </button>
            <button className="nav-btn">
              즐겨찾기
            </button>
          </nav>
        </div>

        <div className="header-right">
          {user && (
            <button className="mypage-btn" onClick={handleMyPageClick}>
              마이페이지
            </button>
          )}
          
          {user ? (
            <button className="logout-btn" onClick={handleLogout}>
              로그아웃
            </button>
          ) : (
            <button className="login-btn" onClick={() => navigate('/login')}>
              로그인
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
