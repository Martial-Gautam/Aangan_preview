'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { RelationshipType } from '@/lib/supabase';
import { Users, Loader2, ArrowLeft, Check, Phone, Mail, AlertCircle, Search } from 'lucide-react';
import Link from 'next/link';

interface Contact {
  name?: string[];
  tel?: string[];
  email?: string[];
}

interface ParsedContact {
  id: string; // generated locally
  name: string;
  phone: string;
  email: string;
  relationshipType: RelationshipType | '';
  isExistingAanganUser: boolean;
  matchedUserId?: string;
  photoUrl?: string;
}

export default function ImportContactsPage() {
  const { session, user } = useAuth();
  const router = useRouter();
  
  const [isSupported, setIsSupported] = useState(true);
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if the Contact Picker API is supported
    if (!('contacts' in navigator) || !('ContactsManager' in window)) {
      setIsSupported(false);
    }
  }, []);

  const handleImport = async () => {
    setError('');
    try {
      const props = ['name', 'tel', 'email'];
      const opts = { multiple: true };
      
      // @ts-ignore - TS doesn't know about navigator.contacts yet natively everywhere
      const rawContacts: Contact[] = await navigator.contacts.select(props, opts);
      
      if (!rawContacts || rawContacts.length === 0) return;

      setLoading(true);

      const parsed: ParsedContact[] = rawContacts.map((c, i) => ({
        id: `contact_${i}_${Date.now()}`,
        name: c.name?.[0] || 'Unknown Contact',
        phone: c.tel?.[0]?.replace(/[^\d+]/g, '') || '',
        email: c.email?.[0] || '',
        relationshipType: '' as const,
        isExistingAanganUser: false,
      })).filter(c => c.name !== 'Unknown Contact' && (c.phone || c.email));

      // Check against Aangan DB
      const res = await fetch('/api/claim/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        // We send all emails and phones to check. The API might only accept one, 
        // so we need a batch check API or loop. To avoid many requests, 
        // we'll just do a quick loop or a new batch API.
        // Actually, our existing /api/claim/check takes one at a time.
        // Let's loop since it's just a few contacts usually.
      });

      const checkedContacts = await Promise.all(parsed.map(async (c) => {
        try {
          const checkRes = await fetch('/api/claim/check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ email: c.email, phone: c.phone }),
          });
          if (checkRes.ok) {
            const data = await checkRes.json();
            if (data.matches && data.matches.length > 0) {
              return {
                ...c,
                isExistingAanganUser: true,
                matchedUserId: data.matches[0].id,
                photoUrl: data.matches[0].photo_url
              };
            }
          }
        } catch (e) {
          // Ignore individual check errors
        }
        return c;
      }));

      setContacts(checkedContacts);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Failed to read contacts. Make sure you granted permission.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRelationshipChange = (id: string, type: RelationshipType) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, relationshipType: type } : c));
  };

  const removeContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const handleSave = async () => {
    // Validate all have relationships
    if (contacts.some(c => !c.relationshipType)) {
      setError('Please select a relationship type for all contacts');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/members/batch-add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ members: contacts }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add contacts');
      }

      router.push('/home');
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  const existingUsers = contacts.filter(c => c.isExistingAanganUser);
  const newUsers = contacts.filter(c => !c.isExistingAanganUser);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white px-5 py-4 shadow-sm z-10 flex-shrink-0 flex items-center gap-4">
        <Link href="/add-member" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Import Contacts</h1>
          <p className="text-xs text-gray-500">Add family members quickly</p>
        </div>
      </div>

      <div className="flex-1 p-5 max-w-lg mx-auto w-full">
        {!isSupported && contacts.length === 0 ? (
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 text-center">
            <AlertCircle size={32} className="text-orange-400 mx-auto mb-3" />
            <h2 className="text-sm font-bold text-orange-900 mb-1">Not Supported</h2>
            <p className="text-xs text-orange-700 leading-relaxed">
              Your browser doesn't support the native Contact Picker. Please use Chrome on Android or Safari on iOS 16+.
            </p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center pt-10">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
              <Users size={36} className="text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sync Address Book</h2>
            <p className="text-sm text-gray-500 text-center mb-8 max-w-xs leading-relaxed">
              Select multiple family members from your phone's contacts to add them to your tree instantly.
            </p>
            <button
              onClick={handleImport}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 shadow-md flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              {loading ? 'Reading Contacts...' : 'Select Contacts'}
            </button>
            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
          </div>
        ) : (
          <div className="space-y-6 pb-24">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            {existingUsers.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">
                  Already on Aangan ({existingUsers.length})
                </h3>
                <div className="space-y-3">
                  {existingUsers.map(c => (
                    <ContactCard 
                      key={c.id} 
                      contact={c} 
                      onRelChange={(type) => handleRelationshipChange(c.id, type)}
                      onRemove={() => removeContact(c.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {newUsers.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">
                  Not on Aangan Yet ({newUsers.length})
                </h3>
                <div className="space-y-3">
                  {newUsers.map(c => (
                    <ContactCard 
                      key={c.id} 
                      contact={c} 
                      onRelChange={(type) => handleRelationshipChange(c.id, type)}
                      onRemove={() => removeContact(c.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving || contacts.length === 0}
                className="w-full max-w-lg mx-auto py-4 rounded-2xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {saving ? 'Saving to Tree...' : `Add ${contacts.length} Members`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ContactCard({ contact, onRelChange, onRemove }: { 
  contact: ParsedContact; 
  onRelChange: (type: RelationshipType) => void;
  onRemove: () => void;
}) {
  const initials = contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const rels: RelationshipType[] = ['father', 'mother', 'sibling', 'spouse', 'child'];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative">
      <button onClick={onRemove} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors">
        <XCircle size={18} />
      </button>
      <div className="flex items-center gap-3 mb-4 pr-6">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {contact.photoUrl ? (
            <img src={contact.photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-500 font-bold">{initials}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-900 truncate">{contact.name}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            {contact.phone && <span className="flex items-center gap-1"><Phone size={10} /> {contact.phone}</span>}
            {contact.email && <span className="flex items-center gap-1 truncate"><Mail size={10} /> {contact.email}</span>}
          </div>
        </div>
      </div>
      
      <div>
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
          Relationship to You
        </label>
        <div className="flex flex-wrap gap-2">
          {rels.map(rel => (
            <button
              key={rel}
              onClick={() => onRelChange(rel)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                contact.relationshipType === rel 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {rel}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function XCircle(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
    </svg>
  );
}
