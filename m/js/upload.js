import { supabase } from './supabase_client.js';

const MAX_UPLOAD_BYTES = 1024 * 1024;

/** 업로드 전 canvas 리사이즈 (긴 변 최대 maxSize) + 1MB 이하 JPEG 압축 */
export async function resizeImage(file, maxSize = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      if (width > maxSize || height > maxSize) {
        if (width >= height) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

      const compress = (q) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('이미지 변환에 실패했습니다.'));
              return;
            }
            if (blob.size <= MAX_UPLOAD_BYTES || q <= 0.5) {
              const baseName = (file.name || 'image').replace(/\.[^.]+$/, '') || 'image';
              resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() }));
              return;
            }
            compress(Math.max(0.5, q - 0.1));
          },
          'image/jpeg',
          q
        );
      };

      compress(quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 불러올 수 없습니다.'));
    };

    img.src = objectUrl;
  });
}

export async function uploadImage(file, userId) {
  if (!file.type.startsWith('image/')) {
    alert('이미지 파일만 업로드 가능합니다.');
    return null;
  }

  let uploadFile = file;
  try {
    uploadFile = await resizeImage(file);
  } catch (e) {
    console.warn('이미지 리사이즈 실패, 원본 업로드 시도', e);
    if (file.size > 5 * 1024 * 1024) {
      alert('이미지는 5MB 이하만 업로드 가능합니다.');
      return null;
    }
  }

  if (uploadFile.size > MAX_UPLOAD_BYTES) {
    alert('이미지 압축 후에도 1MB를 초과합니다. 다른 사진을 선택해주세요.');
    return null;
  }

  const fileName = `${userId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage.from('post-images').upload(fileName, uploadFile, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'image/jpeg',
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
