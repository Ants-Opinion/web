import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  return (
    <div className="copyright-footer">
      <div className="footer-content">
        <div className="footer-links">
          <a href="/terms" className="footer-link">서비스이용약관</a>
          <span className="footer-separator">|</span>
          <a href="/privacy" className="footer-link">개인정보처리방침</a>
          <span className="footer-separator">|</span>
          <a href="/contact" className="footer-link">문의</a>
        </div>
        <div className="copyright-text">
          © 2025 AntOpinion. All rights reserved. | Since 2025 | Made with ❤️ for better investment decisions
        </div>
      </div>
    </div>
  );
};

export default Footer;
