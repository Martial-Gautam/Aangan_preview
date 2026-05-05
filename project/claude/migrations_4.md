PHASE 4 — THE UNIVERSAL TREE VISION

4.1 — Smart Merge Suggestions
New API route: app/api/suggestions/smart/route.ts
Purpose: Find potential duplicate person nodes across the entire people table (not just by email/phone, but by name + DOB similarity).
Algorithm:
sql-- Find people with similar names and same DOB who are in different owners' trees
SELECT 
  p1.id as person1_id, 
  p1.full_name as name1,
  p1.owner_id as owner1,
  p2.id as person2_id,
  p2.full_name as name2,
  p2.owner_id as owner2,
  p1.date_of_birth
FROM people p1
JOIN people p2 
  ON p1.date_of_birth = p2.date_of_birth
  AND p1.owner_id != p2.owner_id
  AND p1.id != p2.id
  AND p1.user_id IS NULL  -- not yet claimed
  AND p2.user_id IS NULL
WHERE 
  similarity(p1.full_name, p2.full_name) > 0.6;
Requires: Enable pg_trgm extension in Supabase:
sqlCREATE EXTENSION IF NOT EXISTS pg_trgm;
When to run: Once daily via a Supabase scheduled function, OR triggered when a new user completes onboarding.
Store results in new table:
sqlCREATE TABLE merge_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id_1 UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  person_id_2 UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  confidence FLOAT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

4.2 — Merge Confirmation UI
File: components/MergeSuggestionModal.tsx
Triggered: When system finds a high-confidence match between two person nodes across two different users' trees.
UI:

Split screen showing both versions of the person side by side
Left: "In [Owner A]'s tree" — shows name, photo, DOB, relationships
Right: "In [Owner B]'s tree" — same fields
Similarity score: "92% match"
Two buttons: "Yes, same person — Merge" | "No, different people"

Merge action (app/api/merge/confirm/route.ts):

Keep one person node as canonical (prefer the one with user_id set, otherwise the older one)
Re-point all relationships from the duplicate to the canonical node
Delete the duplicate node
Create a user_connections entry between the two owners
Send connection request to both owners for confirmation


4.3 — Degree of Relationship Calculator
File: lib/degree-calculator.ts
Purpose: Given two person IDs on the universal tree, calculate their exact relationship degree.
Algorithm: BFS (Breadth-First Search) through the relationships graph:
typescriptexport function calculateDegree(
  personAId: string,
  personBId: string,
  allRelationships: Relationship[]
): { degree: number; path: string[] } {
  // Build adjacency list from all relationships
  // BFS from personA to personB
  // Return hop count and the path of relationship types traversed
  // Map hop count to human-readable label:
  // 1 hop = immediate family
  // 2 hops = grandparent / aunt / uncle
  // 3 hops = great-grandparent / first cousin
  // 4 hops = second cousin etc.
}
UI: On the member detail sheet (Phase 2.6), show: "You and [Name] are [relationship degree]"

4.4 — Tree Statistics Page
File: app/stats/page.tsx
Purpose: Show the user interesting stats about their family tree. Engages users and shows the value of growing their tree.
Stats to show:

Total members in your direct tree
Total members in your extended connected tree
Oldest member (by DOB) with name
Youngest member
Number of generations spanned
Number of countries / states (if birthplace field added — add it to people table as optional birthplace TEXT)
"Your tree grew X% this month"

Design: Card grid layout. Each stat is a card with a large number, label, and subtle icon. Orange accent color throughout.