'use client';

import { useEffect, useState } from 'react';

export function OnboardingTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('canhgiacso-tutorial-seen');
    if (!hasSeenTutorial) {
      localStorage.setItem('canhgiacso-tutorial-seen', 'true');
      const timer = window.setTimeout(() => setShowTutorial(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const steps = [
    {
      title: '👋 Chào mừng đến Cảnh Giác Số',
      description: 'Trang web này giúp bạn nhận diện và xử lý các kịch bản lừa đảo trực tuyến phổ biến thông qua các tình huống mô phỏng tương tác.',
    },
    {
      title: '🎮 Cách hoạt động',
      description: 'Bạn sẽ gặp 42 tình huống thực tế. Mỗi tình huống bạn có 3 lựa chọn. Hãy chọn hành động an toàn nhất để bảo vệ tài sản và cảnh giác của bạn.',
    },
    {
      title: '🔐 An toàn dữ liệu',
      description: 'Không cần cung cấp bất kỳ thông tin thực. Mọi số tiền chỉ dùng cho đào tạo. Dữ liệu của bạn được bảo vệ bởi HDBank IT Security.',
    },
    {
      title: '📚 Cẩm nang',
      description: 'Ghé thăm phần "Cẩm nang" để đọc các bài viết hướng dẫn chi tiết về các kỹ thuật lừa đảo và cách phòng chống.',
    },
    {
      title: '🏆 Thành tích',
      description: 'Hoàn thành các tình huống để mở khóa huy hiệu và chứng chỉ. Theo dõi tiến độ của bạn trong mục "Thành tích".',
    },
    {
      title: '👤 Tài khoản',
      description: 'Bạn có thể chơi dưới dạng khách, hoặc tạo tài khoản để lưu tiến độ của mình và nhận chứng chỉ chính thức.',
    },
  ];

  if (!showTutorial) return null;

  const currentStep = steps[step];

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-modal">
        <button
          className="tutorial-close"
          onClick={() => setShowTutorial(false)}
          aria-label="Đóng hướng dẫn"
        >
          ✕
        </button>

        <div className="tutorial-content">
          <h2>{currentStep.title}</h2>
          <p>{currentStep.description}</p>
        </div>

        <div className="tutorial-controls">
          <button
            className="tutorial-btn tutorial-btn-secondary"
            onClick={() => setShowTutorial(false)}
            disabled={step === 0}
          >
            {step === 0 ? 'Bỏ qua' : 'Quay lại'}
          </button>

          <div className="tutorial-steps">
            {steps.map((_, index) => (
              <span
                key={index}
                className={`tutorial-step-dot ${index === step ? 'active' : ''}`}
                aria-label={`Bước ${index + 1}`}
              />
            ))}
          </div>

          <button
            className="tutorial-btn tutorial-btn-primary"
            onClick={() => {
              if (step < steps.length - 1) {
                setStep(step + 1);
              } else {
                setShowTutorial(false);
              }
            }}
          >
            {step === steps.length - 1 ? 'Bắt đầu' : 'Tiếp theo'}
          </button>
        </div>
      </div>
    </div>
  );
}
