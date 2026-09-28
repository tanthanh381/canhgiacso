'use client';

interface ShareConfig {
  title: string;
  text: string;
  url: string;
}

export function ShareButtons({ certificateCode, accuracy, completedScenarios }: { certificateCode?: string; accuracy?: number; completedScenarios?: number }) {
  const shareText = `Tôi vừa hoàn thành khóa đào tạo Cảnh Giác Số! ${accuracy ? `Độ chính xác: ${accuracy}%` : ''} ${completedScenarios ? `Đã hoàn thành: ${completedScenarios} tình huống` : ''} - Hãy kiểm tra kỹ năng phòng vệ số của bạn!`;
  const shareUrl = 'https://canhgiacso.com';

  const shareConfigs: Record<string, ShareConfig> = {
    facebook: {
      title: 'Facebook',
      text: 'Share on Facebook',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
    },
    twitter: {
      title: 'Twitter',
      text: 'Share on Twitter',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    linkedin: {
      title: 'LinkedIn',
      text: 'Share on LinkedIn',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
    email: {
      title: 'Email',
      text: 'Share via Email',
      url: `mailto:?subject=${encodeURIComponent('Cảnh Giác Số - Khóa đào tạo an toàn thông tin')}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`,
    },
  };

  const handleShare = async (platform: keyof typeof shareConfigs) => {
    if (platform === 'native' && navigator.share) {
      try {
        await navigator.share({
          title: 'Cảnh Giác Số',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // Fall through to regular sharing
      }
    }

    const config = shareConfigs[platform];
    if (config) {
      window.open(config.url, '_blank', 'width=600,height=400');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('✓ Link đã được sao chép!');
    } catch {
      alert('Không thể sao chép link. Vui lòng thử lại.');
    }
  };

  return (
    <div className="share-section">
      <p style={{ textAlign: 'center', margin: '0 0 12px 0', fontSize: '12px', fontWeight: 600 }}>
        🔗 Chia sẻ kết quả của bạn
      </p>
      <div className="share-buttons">
        <button
          className="share-btn"
          onClick={() => handleShare('facebook')}
          aria-label="Chia sẻ lên Facebook"
          title="Chia sẻ lên Facebook"
        >
          f
        </button>
        <button
          className="share-btn"
          onClick={() => handleShare('twitter')}
          aria-label="Chia sẻ lên Twitter"
          title="Chia sẻ lên Twitter"
        >
          𝕏
        </button>
        <button
          className="share-btn"
          onClick={() => handleShare('linkedin')}
          aria-label="Chia sẻ lên LinkedIn"
          title="Chia sẻ lên LinkedIn"
        >
          in
        </button>
        <button
          className="share-btn"
          onClick={() => handleShare('email')}
          aria-label="Chia sẻ qua Email"
          title="Chia sẻ qua Email"
        >
          ✉
        </button>
        {navigator.share && (
          <button
            className="share-btn"
            onClick={() => handleShare('native')}
            aria-label="Chia sẻ"
            title="Chia sẻ"
          >
            📤
          </button>
        )}
        <button
          className="share-btn"
          onClick={handleCopyLink}
          aria-label="Sao chép link"
          title="Sao chép link"
        >
          🔗
        </button>
      </div>
    </div>
  );
}
