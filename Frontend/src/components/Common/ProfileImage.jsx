import { useState } from 'react';
import axiosInstance from '@api/axiosInstance';

const ProfileImage = ({
  profileImage,
  firstName,
  lastName,
  size = 'md',
  px,
  title,
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);

  const sizes = {
    xs: 'w-8 h-8 text-xs',
    sm: 'w-12 h-12 text-sm',
    md: 'w-16 h-16 text-lg',
    lg: 'w-24 h-24 text-xl',
    xl: 'w-32 h-32 text-2xl'
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    const baseUrl = axiosInstance.defaults.baseURL.replace('/api', '');

    if (typeof imagePath === 'string' && imagePath.startsWith('http')) return imagePath;

    if (typeof imagePath === 'string' && imagePath.includes('serve/')) {
      return `${baseUrl}/api/files/${imagePath}`;
    }

    const filename = typeof imagePath === 'string' ? imagePath.split('/').pop() : imagePath;
    return `${baseUrl}/api/files/render/profile/${filename}`;
  };

  const getInitials = () => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase();
  };

  const sizeClass = px ? '' : sizes[size];
  const sizeStyle = px ? { width: px, height: px } : {};
  const showImage = profileImage && !imageError;

  return showImage ? (
    <img
      src={getImageUrl(profileImage)}
      alt={title || 'Profile'}
      title={title}
      className={`${sizeClass} rounded-full object-cover flex-shrink-0 border-2 border-surface ${className}`}
      style={sizeStyle}
      onError={() => setImageError(true)}
    />
  ) : (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0 border-2 border-surface bg-[var(--module-accent)] ${className}`}
      style={{ ...sizeStyle, ...(px ? { fontSize: px * 0.38 } : {}) }}
      title={title}
    >
      <span className="font-medium text-white">
        {getInitials()}
      </span>
    </div>
  );
};

export default ProfileImage;