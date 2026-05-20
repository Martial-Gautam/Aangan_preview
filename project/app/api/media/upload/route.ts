import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getCloudinaryConfig() {
  const cloudinaryUrl = process.env.CLOUDINARY_URL || '';
  if (cloudinaryUrl.startsWith('cloudinary://')) {
    const match = cloudinaryUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (match) {
      return {
        apiKey: decodeURIComponent(match[1]),
        apiSecret: decodeURIComponent(match[2]),
        cloudName: decodeURIComponent(match[3]),
      };
    }
  }

  return {
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  };
}

function buildCloudinarySignature(params: Record<string, string | number>, apiSecret: string) {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && `${value}`.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const supabaseUser = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) || 'media';
    const folder = (formData.get('folder') as string) || 'posts';
    const postId = formData.get('post_id') as string | null;
    const mediaType = (formData.get('media_type') as string) || 'image';
    const sortOrder = parseInt(formData.get('sort_order') as string || '0', 10);

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (50MB max)
    if (file.size > 52428800) {
      return NextResponse.json({ error: 'File too large. Maximum 50MB.' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
      'video/mp4', 'video/quicktime', 'video/webm',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const { apiKey, apiSecret, cloudName } = getCloudinaryConfig();
    if (!apiKey || !apiSecret || !cloudName) {
      return NextResponse.json(
        { error: 'Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_* vars.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const publicId = `${user.id}/${folder}/${timestamp}-${random}`;
    const uploadTimestamp = Math.floor(Date.now() / 1000);
    const cloudinaryFolder = `aangan/${bucket}/${user.id}/${folder}`;
    const signature = buildCloudinarySignature(
      {
        folder: cloudinaryFolder,
        public_id: publicId,
        timestamp: uploadTimestamp,
      },
      apiSecret
    );

    const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
    const cloudinaryForm = new FormData();
    cloudinaryForm.append('file', file, `${publicId}.${ext}`);
    cloudinaryForm.append('api_key', apiKey);
    cloudinaryForm.append('timestamp', String(uploadTimestamp));
    cloudinaryForm.append('folder', cloudinaryFolder);
    cloudinaryForm.append('public_id', publicId);
    cloudinaryForm.append('signature', signature);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      { method: 'POST', body: cloudinaryForm }
    );

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      console.error('Cloudinary upload failed:', errBody);
      return NextResponse.json(
        { error: 'Cloudinary upload failed' },
        { status: 500 }
      );
    }

    const uploadData = await uploadRes.json();
    const mediaUrl = uploadData.secure_url as string;
    if (!mediaUrl) {
      return NextResponse.json({ error: 'Cloudinary did not return a media URL' }, { status: 500 });
    }

    // If a post_id is given, create a media_attachment record
    let attachment = null;
    if (postId) {
      const { data, error: attachError } = await supabase
        .from('media_attachments')
        .insert({
          post_id: postId,
          uploader_id: user.id,
          media_url: mediaUrl,
          media_type: mediaType,
          sort_order: sortOrder,
        })
        .select()
        .single();

      if (attachError) {
        console.error('Attachment record error:', attachError);
      } else {
        attachment = data;
      }
    }

    return NextResponse.json({
      url: mediaUrl,
      media_type: mediaType,
      attachment,
    });
  } catch (err) {
    console.error('Media upload error:', err);
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
