import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type RelationshipType = 'father' | 'mother' | 'sibling' | 'spouse' | 'child';
export type Gender = 'male' | 'female' | 'other';

export interface Profile {
  id: string;
  full_name: string;
  gender: Gender | null;
  date_of_birth: string | null;
  photo_url: string | null;
  phone: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Person {
  id: string;
  user_id: string | null;
  owner_id: string;
  full_name: string;
  gender: Gender | null;
  date_of_birth: string | null;
  photo_url: string | null;
  email: string | null;
  phone_number: string | null;
  is_self: boolean;
  created_at: string;
  updated_at: string;
}

export interface Relationship {
  id: string;
  person_id: string;
  related_person_id: string;
  relationship_type: RelationshipType;
  owner_id: string;
  created_at: string;
}

export interface FamilyMember extends Person {
  relationship_type: RelationshipType;
  relationship_id: string;
}
