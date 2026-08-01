import { api } from './client.js';

export async function getPresignedUrl(fileName, contentType, fileSize) {
  return api('/api/upload/presigned-url', {
    method: 'POST',
    body: { fileName, contentType, fileSize },
  });
}

export async function confirmUpload(key, fileName, contentType, fileSize) {
  return api('/api/upload/confirm', {
    method: 'POST',
    body: { key, fileName, contentType, fileSize },
  });
}

export async function listFiles(page = 1, perPage = 20) {
  return api(`/api/upload/files?page=${page}&perPage=${perPage}`);
}

export async function getFileDetails(id) {
  return api(`/api/upload/files/${id}`);
}

export async function getDownloadUrl(id) {
  return api(`/api/upload/files/${id}/download`);
}

export async function deleteFile(id) {
  return api(`/api/upload/files/${id}`, { method: 'DELETE' });
}

export async function getUploadMeta() {
  return api('/api/upload/meta');
}
