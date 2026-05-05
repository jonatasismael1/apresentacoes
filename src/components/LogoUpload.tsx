import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface LogoUploadProps {
  label: string;
  value: string;
  onChange: (base64: string) => void;
  className?: string;
}

const LogoUpload: React.FC<LogoUploadProps> = ({ label, value, onChange, className }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxSize = 300;

          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Use WebP compression with 0.8 quality
            const compressedBase64 = canvas.toDataURL('image/webp', 0.8);
            onChange(compressedBase64);
          } else {
            onChange(reader.result as string);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={className}>
      <label className="label">{label}</label>
      <div 
        onClick={() => !value && fileInputRef.current?.click()}
        className={`relative h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${
          value ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-800 hover:border-dbe-blue bg-zinc-900/50 hover:bg-zinc-900'
        }`}
      >
        {value ? (
          <>
            <img src={value} alt="Logo preview" className="h-full w-full object-contain p-4" />
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <div className="text-center p-4">
            <Upload size={24} className="mx-auto mb-2 text-zinc-500" />
            <p className="text-xs text-zinc-400">Clique para upload (Max 2MB)</p>
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
};

export default LogoUpload;
