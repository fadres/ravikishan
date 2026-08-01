import { useState, useEffect, useCallback } from 'react';
import { listFiles, getDownloadUrl, deleteFile } from '../api/upload.js';

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FileList({ refreshKey }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await listFiles(1, 50);
      setFiles(data.files);
    } catch {
      setError('Failed to load files.');
    } finally {
      setLoading(false);
    }
  }, [refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownload = async (id) => {
    try {
      const { url, originalFilename } = await getDownloadUrl(id);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setError('Download failed.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this file permanently?')) return;
    setDeleting(id);
    try {
      await deleteFile(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch {
      setError('Delete failed.');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <span className="w-6 h-6 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
      </div>
    );
  }

  if (error) {
    return <p className="text-rose-300 text-sm">{error}</p>;
  }

  if (files.length === 0) {
    return <p className="text-slate-500 text-sm text-center py-4">No files uploaded yet.</p>;
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3"
        >
          <div className="flex-1 min-w-0 mr-4">
            <p className="text-slate-200 text-sm font-medium truncate">{file.originalFilename}</p>
            <p className="text-slate-500 text-xs">
              {formatSize(file.fileSize)} · {file.mimeType} · {formatDate(file.createdAt)}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => handleDownload(file.id)}
              className="px-3 py-1 rounded-lg bg-aqua-400/10 text-aqua-300 text-xs font-semibold hover:bg-aqua-400/20 transition"
            >
              Download
            </button>
            <button
              onClick={() => handleDelete(file.id)}
              disabled={deleting === file.id}
              className="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-300 text-xs font-semibold hover:bg-rose-500/20 transition disabled:opacity-50"
            >
              {deleting === file.id ? '…' : 'Delete'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
