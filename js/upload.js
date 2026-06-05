import { supabase } from './supabase_client.js';

export async function uploadImage(file, userId) {
  if (file.size > 5 * 1024 * 1024) {
    alert('이미지는 5MB 이하만 업로드 가능합니다.');
    return null;
  }
  if (!file.type.startsWith('image/')) {
    alert('이미지 파일만 업로드 가능합니다.');
    return null;
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const fileName = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('post-images').upload(fileName, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    console.error('업로드 실패:', error);
    return null;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('post-images').getPublicUrl(fileName);

  return publicUrl;
}

export async function uploadImages(files, userId) {
  if (files.length > 4) {
    alert('이미지는 최대 4장까지 첨부 가능합니다.');
    return [];
  }

  const urls = [];
  for (const file of files) {
    const url = await uploadImage(file, userId);
    if (url) urls.push(url);
  }
  return urls;
}

export function createImagePreview(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}
