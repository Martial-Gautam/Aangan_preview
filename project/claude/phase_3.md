PHASE 3 — COMPLETE THE CORE FEATURES

3.1 — Create app/notifications/page.tsx
Purpose: Move all connection requests and suggestions OUT of the profile page into a dedicated notifications screen.
Why: The profile page is currently overloaded. Connection requests get buried.
Content:

Header: "Notifications"
Section 1: "Connection Requests" — same UI as currently in profile page
Section 2: "People You May Know" — same suggestions UI as currently in profile page
Empty state: "No notifications yet. When someone adds you to their tree, you'll see it here."

Remove from app/profile/page.tsx:

pendingRequests state and all related code
suggestions state and all related code
The Connection Requests section JSX
The People You May Know section JSX
The fetchPendingRequests function
The fetchSuggestions function
The handleConnectionResponse function
The handleSendConnection function


3.2 — Update components/BottomNav.tsx
Current tabs: Family | Add | Profile
New tabs: Family | Add | Notifications | Profile
typescriptconst navItems = [
  { href: '/home', label: 'Family', icon: Home },
  { href: '/add-member', label: 'Add', icon: UserPlus },
  { href: '/notifications', label: 'Alerts', icon: Bell },
  { href: '/profile', label: 'Profile', icon: User },
];
Add notification badge: In BottomNav.tsx, fetch pending request count on mount:
typescriptconst [pendingCount, setPendingCount] = useState(0);
// Fetch count from /api/connections/pending on mount
// Show red dot badge on Bell icon if count > 0

3.3 — Relationship Inference Engine
File: lib/inference-engine.ts
Purpose: When User A adds a new family member, automatically infer additional relationships and surface them as suggestions.
Rules to implement:
If self → father AND father → person = child:
  → suggest: person is sibling of self

If self → father AND father → person = spouse:
  → suggest: person is step-mother of self

If self → sibling AND sibling → person = child:
  → suggest: person is nephew/niece of self

If self → child AND self → spouse:
  → suggest: spouse is parent of child too
New DB table needed:
sqlCREATE TABLE suggested_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  to_person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  suggested_type TEXT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0.8,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suggested_owner ON suggested_relationships(owner_id);
When to run: After every successful call to /api/members/add, trigger inference for that owner's full relationship set.
New API route: app/api/inference/run/route.ts

Called internally after member add
Loads all relationships for owner
Runs inference rules
Inserts new rows into suggested_relationships (ignoring duplicates)

UI for suggestions: On the home screen, show a subtle banner above the tree: "We found 2 possible new connections. Review them." Tap → bottom sheet showing the suggestions with Accept / Ignore buttons.

3.4 — Contact Import
File: app/import-contacts/page.tsx
Purpose: Let users bulk-import family members from phone contacts instead of adding one by one.
API used: Browser Web Contact Picker API
javascriptconst contacts = await navigator.contacts.select(
  ['name', 'tel', 'email'],
  { multiple: true }
);
Availability: Works on Android Chrome and iOS Safari 16+. On desktop or unsupported browsers, show a message: "Contact import is available on mobile browsers."
Flow:

User taps "Import Contacts" (button on add-member page or home empty state)
Browser shows native contact picker
User selects contacts
App calls /api/claim/check for each contact's phone/email to see if they're already on Aangan
Show results in two groups:

"Already on Aangan" — these are existing users, just add relationship
"Not on Aangan yet" — these will be added as placeholder nodes


For each contact, user assigns relationship type (Father / Mother / Sibling etc.)
Confirm → batch add all selected contacts

New API route: app/api/members/batch-add/route.ts

Same logic as /api/members/add but accepts an array of members
Runs all inserts in a single transaction


3.5 — Search Within Tree
Add to app/home/page.tsx:
A floating search bar at the top of the canvas:
tsx<div className="absolute top-4 left-4 right-4 z-20">
  <div className="bg-white rounded-2xl shadow-md border border-gray-100 flex items-center px-3 py-2 gap-2">
    <Search size={16} className="text-gray-400" />
    <input
      value={searchQuery}
      onChange={e => setSearchQuery(e.target.value)}
      placeholder="Search family members..."
      className="flex-1 text-sm outline-none"
    />
  </div>
</div>
Behavior: Filter people array by name match. Nodes that don't match get opacity: 0.2 style applied. Matching nodes get a highlight ring. Clear search → all nodes return to normal.
Implementation: Pass searchQuery into FamilyFlow, apply opacity style inside FamilyNode based on whether name includes query string.