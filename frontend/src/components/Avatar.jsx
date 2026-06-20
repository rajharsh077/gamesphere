const Avatar = ({ src, alt, size = 'md', className = '' }) => {
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-9 w-9',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24'
  };

  return (
    <img
      src={src}
      alt={alt}
      className={`inline-flex rounded-full border border-slate-700 bg-slate-950 object-cover ${sizeClasses[size]} ${className}`}
    />
  );
};

export default Avatar;
