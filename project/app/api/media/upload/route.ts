import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate file path
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const filePath = `${user.id}/${folder}/${timestamp}-${random}.${ext}`;

    // Upload to storage
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    const mediaUrl = urlData.publicUrl;

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
