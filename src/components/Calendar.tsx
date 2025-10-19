import React, { useState, useEffect, useRef } from 'react';
import './Calendar.css';

interface CalendarProps {
  isOpen: boolean;
  onClose: () => void;
  onDateSelect: (date: string) => void;
  selectedDate: string;
  position: { x: number; y: number };
}

const Calendar: React.FC<CalendarProps> = ({ 
  isOpen, 
  onClose, 
  onDateSelect, 
  selectedDate, 
  position 
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const selectedDateObj = new Date(selectedDate);
    return new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), 1);
  });
  const calendarRef = useRef<HTMLDivElement>(null);

  // 선택된 날짜를 Date 객체로 변환
  const selectedDateObj = new Date(selectedDate);

  // 선택된 날짜가 변경될 때 현재 월 업데이트
  useEffect(() => {
    const newSelectedDate = new Date(selectedDate);
    setCurrentMonth(new Date(newSelectedDate.getFullYear(), newSelectedDate.getMonth(), 1));
  }, [selectedDate]);

  // 현재 월의 첫 번째 날과 마지막 날 계산
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  // const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  // 달력 시작일 (이전 달의 일부 날짜 포함)
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

  // 달력에 표시할 모든 날짜 생성
  const calendarDays = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    calendarDays.push(date);
  }

  // 이전 달로 이동
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // 다음 달로 이동
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // 날짜 선택
  const handleDateClick = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    onDateSelect(dateString);
    onClose();
  };

  // 외부 클릭 시 캘린더 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // ESC 키로 캘린더 닫기
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="calendar-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000
      }}
    >
      <div 
        ref={calendarRef}
        className="calendar-container"
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          zIndex: 10001
        }}
      >
        {/* 캘린더 헤더 */}
        <div className="calendar-header">
          <button className="calendar-nav-btn" onClick={goToPreviousMonth}>
            ‹
          </button>
          <div className="calendar-month-year">
            {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
          </div>
          <button className="calendar-nav-btn" onClick={goToNextMonth}>
            ›
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="calendar-weekdays">
          <div className="calendar-weekday">일</div>
          <div className="calendar-weekday">월</div>
          <div className="calendar-weekday">화</div>
          <div className="calendar-weekday">수</div>
          <div className="calendar-weekday">목</div>
          <div className="calendar-weekday">금</div>
          <div className="calendar-weekday">토</div>
        </div>

        {/* 날짜 그리드 */}
        <div className="calendar-days">
          {calendarDays.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
            const isSelected = date.toDateString() === selectedDateObj.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            
            return (
              <button
                key={index}
                className={`calendar-day ${
                  !isCurrentMonth ? 'other-month' : ''
                } ${
                  isSelected ? 'selected' : ''
                } ${
                  isToday ? 'today' : ''
                }`}
                onClick={() => handleDateClick(date)}
                disabled={!isCurrentMonth}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
