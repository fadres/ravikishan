import { useState } from 'react';
import FileUploader from '../../components/FileUploader.jsx';
import FileList from '../../components/FileList.jsx';

export default function UploadPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <p className="text-aqua-300 text-xs font-bold uppercase tracking-[0.2em]">Ravikishan · Storage</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient">File Manager</h1>
        <p className="text-sm text-slate-400 mt-1">Upload, download, and manage files stored in Cloudflare R2.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-bold text-slate-200 mb-4">Upload Files</h2>
        <FileUploader onUploadComplete={() => setRefreshKey((k) => k + 1)} />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-slate-200 mb-4">Uploaded Files</h2>
        <FileList refreshKey={refreshKey} />
      </div>
    </div>
  );
}
