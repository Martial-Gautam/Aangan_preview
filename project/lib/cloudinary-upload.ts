'use client';

export async function uploadImageToCloudinaryViaApi(
  file: File,
  accessToken: string,
  folder: string
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', 'avatars');
  formData.append('folder', folder);
  formData.append('media_type', 'image');

  const res = await fetch('/api/media/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to upload image');
  }

  if (!data.url) {
    throw new Error('Upload succeeded but no URL was returned');
  }

  return data.url as string;
}
