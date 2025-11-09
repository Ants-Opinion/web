import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  type User
} from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import './Login.css';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

interface SignUpFormData {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
  interests: string[];
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signUpData, setSignUpData] = useState<SignUpFormData>({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    interests: []
  });
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const interestOptions = [
    '기술/IT', '디자인', '비즈니스', '마케팅', '교육', 
    '건강/의료', '예술/문화', '스포츠', '여행', '음식',
    '패션', '게임', '음악', '영화', '독서'
  ];

  const validateSignUpData = (): string | null => {
    if (!signUpData.name.trim()) {
      return '이름을 입력해주세요.';
    }
    if (!signUpData.email.trim()) {
      return '이메일을 입력해주세요.';
    }
    if (signUpData.password.length < 6) {
      return '비밀번호는 6자 이상이어야 합니다.';
    }
    if (signUpData.password !== signUpData.confirmPassword) {
      return '비밀번호가 일치하지 않습니다.';
    }
    if (signUpData.interests.length === 0) {
      return '최소 하나의 관심분야를 선택해주세요.';
    }
    return null;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let userCredential;
      if (isSignUp) {
        // 회원가입 데이터 검증
        const validationError = validateSignUpData();
        if (validationError) {
          setError(validationError);
          setLoading(false);
          return;
        }

        // 계정 생성
        userCredential = await createUserWithEmailAndPassword(
          auth, 
          signUpData.email, 
          signUpData.password
        );

        // 사용자 프로필 업데이트
        await updateProfile(userCredential.user, {
          displayName: signUpData.name
        });

        // Firestore에 사용자 정보 저장
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: signUpData.name,
          email: signUpData.email,
          interests: signUpData.interests,
          createdAt: new Date().toISOString(),
          uid: userCredential.user.uid
        });

        console.log('회원가입 완료! 사용자 정보가 저장되었습니다.');
      } else {
        // 로그인
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }
      
      onLoginSuccess(userCredential.user);
      // 로그인/회원가입 성공 시 홈 페이지로 이동
      // 상태 업데이트를 확실히 반영하기 위해 페이지 리로드
      window.location.href = '/';
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object' && 'code' in error) {
      switch ((error as { code: string }).code) {
      case 'auth/email-already-in-use':
        return '이미 사용 중인 이메일입니다.';
      case 'auth/weak-password':
        return '비밀번호가 너무 약합니다.';
      case 'auth/invalid-email':
        return '올바르지 않은 이메일 형식입니다.';
      case 'auth/user-not-found':
        return '존재하지 않는 계정입니다.';
      case 'auth/wrong-password':
        return '비밀번호가 틀렸습니다.';
      case 'auth/popup-closed-by-user':
        return '로그인 팝업이 닫혔습니다. 팝업 차단을 해제하고 다시 시도해주세요.';
      case 'auth/popup-blocked':
        return '팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.';
      case 'auth/unauthorized-domain':
        return '이 도메인은 인증되지 않았습니다. 관리자에게 문의하세요.';
      case 'auth/operation-not-allowed':
        return 'Google 로그인이 비활성화되어 있습니다.';
      default:
        return (error as { message?: string }).message || '오류가 발생했습니다.';
      }
    }
    return '오류가 발생했습니다.';
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // 팝업 차단 확인
      const popup = window.open('', '_blank', 'width=500,height=600');
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        setError('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
        setLoading(false);
        return;
      }
      popup.close();

      const result = await signInWithPopup(auth, googleProvider);
      onLoginSuccess(result.user);
      // Google 로그인 성공 시 홈 페이지로 이동
      // 상태 업데이트를 확실히 반영하기 위해 페이지 리로드
      window.location.href = '/';
    } catch (error: unknown) {
      console.error('Google 로그인 오류:', error);
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpDataChange = (field: keyof SignUpFormData, value: string | string[]) => {
    setSignUpData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInterestToggle = (interest: string) => {
    setSignUpData(prev => {
      const newInterests = prev.interests.includes(interest)
        ? prev.interests.filter(item => item !== interest)
        : [...prev.interests, interest];
      
      return {
        ...prev,
        interests: newInterests
      };
    });
  };

  const resetForms = () => {
    setEmail('');
    setPassword('');
    setSignUpData({
      email: '',
      name: '',
      password: '',
      confirmPassword: '',
      interests: []
    });
    setError('');
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    resetForms();
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>{isSignUp ? '회원가입' : '로그인'}</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleEmailLogin}>
          {isSignUp ? (
            // 회원가입 폼
            <>
              <div className="form-group">
                <input
                  type="email"
                  placeholder="이메일"
                  value={signUpData.email}
                  onChange={(e) => handleSignUpDataChange('email', e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <input
                  type="text"
                  placeholder="이름"
                  value={signUpData.name}
                  onChange={(e) => handleSignUpDataChange('name', e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <input
                  type="password"
                  placeholder="비밀번호 (6자 이상)"
                  value={signUpData.password}
                  onChange={(e) => handleSignUpDataChange('password', e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <input
                  type="password"
                  placeholder="비밀번호 확인"
                  value={signUpData.confirmPassword}
                  onChange={(e) => handleSignUpDataChange('confirmPassword', e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="interests-label">관심분야 선택 (복수 선택 가능)</label>
                <div className="interests-grid">
                  {interestOptions.map((interest) => (
                    <label key={interest} className="interest-item">
                      <input
                        type="checkbox"
                        checked={signUpData.interests.includes(interest)}
                        onChange={() => handleInterestToggle(interest)}
                      />
                      <span className="checkmark"></span>
                      {interest}
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : (
            // 로그인 폼
            <>
              <div className="form-group">
                <input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}
          
          <button 
            type="submit" 
            className="email-login-btn"
            disabled={loading}
          >
            {loading ? '처리 중...' : (isSignUp ? '회원가입' : '로그인')}
          </button>
        </form>

        <div className="divider">
          <span>또는</span>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="google-login-btn"
          disabled={loading}
        >
          <svg className="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google로 로그인
        </button>
        
        <p className="popup-notice">
          팝업이 차단된 경우 브라우저 설정에서 팝업을 허용해주세요.
        </p>

        <p className="switch-mode">
          {isSignUp ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'}
          <button 
            type="button"
            onClick={switchMode}
            className="switch-btn"
          >
            {isSignUp ? '로그인' : '회원가입'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login; 