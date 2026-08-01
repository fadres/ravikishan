import { useState, useCallback, useRef } from 'react';
import { getPresignedUrl, confirmUpload } from '../api/upload.js';

const MAX_SIZE = 50 * 1024 * 1024;

export default function FileUploader({ onUploadComplete }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [currentFile, setCurrentFile] = useState(null);
  const fileInputRef = useRef(null);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError('');
    setCurrentFile(null);
  }, []);

  const processFile = useCallback(
    async (file) => {
      setError('');
      setCurrentFile(file);
      setUploading(true);
      setProgress(0);

      try {
        if (file.size > MAX_SIZE) {
          throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds 50MB limit`);
        }

        const { url, key } = await getPresignedUrl(file.name, file.type, file.size);

        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        await new Promise((resolve, reject) => {
          xhr.upload.addEventListener('load', resolve);
          xhr.upload.addEventListener('error', () => reject(new Error('Upload to storage failed')));
          xhr.upload.addEventListener('abort', () => reject(new Error('Upload cancelled')));
          xhr.open('PUT', url);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.send(file);
        });

        setProgress(100);

        await confirmUpload(key, file.name, file.type, file.size);

        if (onUploadComplete) onUploadComplete();
      } catch (err) {
        setError(err.message || 'Upload failed');
        setProgress(0);
      } finally {
        setUploading(false);
      }
    },
    [onUploadComplete],
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleSelect = useCallback(
    (e) => {
      const file = e.target.files[0];
      if (file) processFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [processFile],
  );

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition ${
          dragActive ? 'border-aqua-400 bg-aqua-400/10' : 'border-white/12 bg-white/5'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          id="file-input"
          onChange={handleSelect}
          accept="image/*,.pdf,.txt,.md,.json,.csv,.mp3,.wav,.mp4"
        />
        <label htmlFor="file-input" className="cursor-pointer">
          <div className="text-4xl mb-3">📁</div>
          <p className="text-slate-300 text-sm font-medium">
            Drag and drop a file here, or <span className="text-aqua-300 underline">browse</span>
          </p>
          <p className="text-slate-500 text-xs mt-2">Max 50MB — images, PDFs, text, audio, video</p>
        </label>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {uploading && currentFile && (
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-300 truncate max-w-xs">{currentFile.name}</span>
            <span className="text-aqua-300 font-semibold">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-aqua-400 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
