import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const databaseUrl = process.env.DATABASE_URL!;

export async function POST(req: NextRequest) {
  try {
    // Validate auth
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

    const body = await req.json();
    const { full_name, gender, date_of_birth, photo_url, email, phone_number, is_self, relationship_type } = body;

    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return NextResponse.json({ error: 'Name is required (min 2 characters)' }, { status: 400 });
    }

    if (!is_self && !relationship_type) {
      return NextResponse.json({ error: 'relationship_type is required' }, { status: 400 });
    }

    // Connect directly to PostgreSQL — bypasses PostgREST schema cache entirely
    const sql = postgres(databaseUrl, { ssl: 'require' });

    try {
      const [selfPerson] = await sql`
        SELECT id
        FROM people
        WHERE owner_id = ${user.id} AND is_self = true
        LIMIT 1
      `;

      if (!selfPerson) {
        return NextResponse.json({ error: 'Could not find your profile' }, { status: 400 });
      }

      const [person] = await sql`
        INSERT INTO people (owner_id, full_name, gender, date_of_birth, photo_url, email, phone_number, is_self)
        VALUES (
          ${user.id},
          ${full_name.trim()},
          ${gender || null},
          ${date_of_birth || null},
          ${photo_url || null},
          ${email || null},
          ${phone_number || null},
          ${is_self ?? false}
        )
        RETURNING *
      `;

      if (!is_self) {
        await sql`
          INSERT INTO relationships (owner_id, person_id, related_person_id, relationship_type)
          VALUES (
            ${user.id},
            ${selfPerson.id},
            ${person.id},
            ${relationship_type}
          )
        `;
      }

      let requestCreated = false;
      if (!is_self && (email || phone_number)) {
        const [matchedByEmail] = email
          ? await sql`
              SELECT id
              FROM auth.users
              WHERE lower(email) = lower(${email})
              LIMIT 1
            `
          : [];

        const [matchedByPhone] = !matchedByEmail && phone_number
          ? await sql`
              SELECT id
              FROM profiles
              WHERE phone = ${phone_number}
              LIMIT 1
            `
          : [];

        const matchedUserId = matchedByEmail?.id || matchedByPhone?.id || null;

        if (matchedUserId && matchedUserId !== user.id) {
          const [existingRequest] = await sql`
            SELECT id
            FROM connection_requests
            WHERE from_user_id = ${user.id}
              AND to_user_id = ${matchedUserId}
              AND person_id = ${person.id}
              AND status IN ('pending', 'accepted')
            LIMIT 1
          `;

          if (!existingRequest) {
            await sql`
              INSERT INTO connection_requests (
                from_user_id,
                to_user_id,
                person_id,
                relationship_type,
                status,
                type,
                initiated_by
              )
              VALUES (
                ${user.id},
                ${matchedUserId},
                ${person.id},
                ${relationship_type},
                'pending',
                'direct',
                'adder'
              )
            `;
            requestCreated = true;
          }
        }
      }

      return NextResponse.json({ person, request_created: requestCreated });
    } finally {
      await sql.end();
    }
  } catch (err) {
    console.error('Add member API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
