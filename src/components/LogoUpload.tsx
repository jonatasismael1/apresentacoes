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
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result as string);
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
