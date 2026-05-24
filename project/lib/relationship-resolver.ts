import type { Person, Relationship } from './tree-to-flow';

export type RelationTerm = {
  hindi: string;
  english: string;
  notes?: string;
};

export type RelationshipResolution = {
  term: RelationTerm;
  pathIds: string[];
  relPath: string[];
  multiplePaths: boolean;
  chainEnglish: string;
  chainHindi: string;
  alternatives?: Array<{
    term: RelationTerm;
    pathIds: string[];
    relPath: string[];
    chainEnglish: string;
    chainHindi: string;
  }>;
};

type Gender = 'male' | 'female' | 'unknown';

type Edge = {
  targetId: string;
  relType: string;
};

function normalizeGender(raw?: string | null): Gender {
  if (!raw) return 'unknown';
  const g = raw.toLowerCase();
  if (g.startsWith('m')) return 'male';
  if (g.startsWith('f')) return 'female';
  return 'unknown';
}

function getAge(person?: Person | null): number | null {
  const dob = (person as any)?.date_of_birth as string | null | undefined;
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function compareAge(a?: Person | null, b?: Person | null): 'older' | 'younger' | 'unknown' {
  const ageA = getAge(a);
  const ageB = getAge(b);
  if (ageA === null || ageB === null) return 'unknown';
  if (ageA === ageB) return 'unknown';
  return ageA > ageB ? 'older' : 'younger';
}

function reverseRelType(relType: string, parent?: Person | null): string {
  switch (relType) {
    case 'father':
    case 'mother':
      return 'child';
    case 'child': {
      const gender = normalizeGender(parent?.gender);
      if (gender === 'male') return 'father';
      if (gender === 'female') return 'mother';
      return 'parent';
    }
    case 'spouse':
      return 'spouse';
    case 'sibling':
      return 'sibling';
    default:
      return relType;
  }
}

function buildAdjacency(peopleById: Map<string, Person>, relationships: Relationship[]): Map<string, Edge[]> {
  const adj = new Map<string, Edge[]>();

  const pushEdge = (fromId: string, edge: Edge) => {
    if (!adj.has(fromId)) adj.set(fromId, []);
    adj.get(fromId)!.push(edge);
  };

  for (const rel of relationships) {
    pushEdge(rel.person_id, { targetId: rel.related_person_id, relType: rel.relationship_type });

    const parent = peopleById.get(rel.person_id) || null;
    const reverseType = reverseRelType(rel.relationship_type, parent);
    pushEdge(rel.related_person_id, { targetId: rel.person_id, relType: reverseType });
  }

  return adj;
}

function isParentRel(relType: string) {
  return relType === 'father' || relType === 'mother' || relType === 'parent';
}

function isSiblingRel(relType: string) {
  return relType === 'sibling';
}

function resolveDirect(
  relType: string,
  selfGender: Gender,
  targetGender: Gender,
  ageOrder: 'older' | 'younger' | 'unknown'
): RelationTerm {
  switch (relType) {
    case 'father':
      return { hindi: 'Pitaji', english: 'Father' };
    case 'mother':
      return { hindi: 'Maa', english: 'Mother' };
    case 'spouse': {
      if (selfGender === 'male') return { hindi: 'Patni', english: 'Wife' };
      if (selfGender === 'female') return { hindi: 'Pati', english: 'Husband' };
      return { hindi: 'Jeevan Saathi', english: 'Spouse', notes: 'Gender unknown' };
    }
    case 'sibling': {
      if (targetGender === 'male') {
        if (ageOrder === 'older') return { hindi: 'Bhaiya', english: 'Elder Brother' };
        if (ageOrder === 'younger') return { hindi: 'Chhota Bhai', english: 'Younger Brother' };
        return { hindi: 'Bhai', english: 'Brother', notes: 'Age order unknown' };
      }
      if (targetGender === 'female') {
        if (ageOrder === 'older') return { hindi: 'Didi', english: 'Elder Sister' };
        if (ageOrder === 'younger') return { hindi: 'Chhoti Behen', english: 'Younger Sister' };
        return { hindi: 'Behen', english: 'Sister', notes: 'Age order unknown' };
      }
      return { hindi: 'Bhai/Behen', english: 'Sibling', notes: 'Gender unknown' };
    }
    case 'child': {
      if (targetGender === 'male') return { hindi: 'Beta', english: 'Son' };
      if (targetGender === 'female') return { hindi: 'Beti', english: 'Daughter' };
      return { hindi: 'Bachcha', english: 'Child', notes: 'Gender unknown' };
    }
    case 'parent': {
      if (targetGender === 'male') return { hindi: 'Pitaji', english: 'Father' };
      if (targetGender === 'female') return { hindi: 'Maa', english: 'Mother' };
      return { hindi: 'Mata/Pita', english: 'Parent', notes: 'Gender unknown' };
    }
    default:
      return { hindi: 'Rishtedaar', english: 'Relative' };
  }
}

function stepLabel(
  relType: string,
  fromPerson: Person | null,
  toPerson: Person | null,
  language: 'english' | 'hindi'
): string {
  const toGender = normalizeGender(toPerson?.gender);
  const order = compareAge(fromPerson, toPerson);

  if (language === 'english') {
    switch (relType) {
      case 'father':
        return 'Father';
      case 'mother':
        return 'Mother';
      case 'parent':
        if (toGender === 'male') return 'Father';
        if (toGender === 'female') return 'Mother';
        return 'Parent';
      case 'child':
        if (toGender === 'male') return 'Son';
        if (toGender === 'female') return 'Daughter';
        return 'Child';
      case 'sibling':
        if (toGender === 'male') {
          if (order === 'older') return 'Elder Brother';
          if (order === 'younger') return 'Younger Brother';
          return 'Brother';
        }
        if (toGender === 'female') {
          if (order === 'older') return 'Elder Sister';
          if (order === 'younger') return 'Younger Sister';
          return 'Sister';
        }
        return 'Sibling';
      case 'spouse':
        if (toGender === 'male') return 'Husband';
        if (toGender === 'female') return 'Wife';
        return 'Spouse';
      default:
        return relType;
    }
  }

  switch (relType) {
    case 'father':
      return 'Pitaji';
    case 'mother':
      return 'Maa';
    case 'parent':
      if (toGender === 'male') return 'Pitaji';
      if (toGender === 'female') return 'Maa';
      return 'Mata/Pita';
    case 'child':
      if (toGender === 'male') return 'Beta';
      if (toGender === 'female') return 'Beti';
      return 'Bachcha';
    case 'sibling':
      if (toGender === 'male') {
        if (order === 'older') return 'Bhaiya';
        if (order === 'younger') return 'Chhota Bhai';
        return 'Bhai';
      }
      if (toGender === 'female') {
        if (order === 'older') return 'Didi';
        if (order === 'younger') return 'Chhoti Behen';
        return 'Behen';
      }
      return 'Bhai/Behen';
    case 'spouse':
      if (toGender === 'male') return 'Pati';
      if (toGender === 'female') return 'Patni';
      return 'Jeevan Saathi';
    default:
      return relType;
  }
}

function buildChain(
  pathIds: string[],
  relPath: string[],
  peopleById: Map<string, Person>
): { chainEnglish: string; chainHindi: string } {
  if (pathIds.length <= 1) {
    return { chainEnglish: 'ME', chainHindi: 'Main' };
  }

  const englishSteps: string[] = ['ME'];
  const hindiSteps: string[] = ['Main'];

  for (let i = 0; i < relPath.length; i++) {
    const fromPerson = peopleById.get(pathIds[i]) || null;
    const toPerson = peopleById.get(pathIds[i + 1]) || null;
    englishSteps.push(stepLabel(relPath[i], fromPerson, toPerson, 'english'));
    hindiSteps.push(stepLabel(relPath[i], fromPerson, toPerson, 'hindi'));
  }

  return {
    chainEnglish: englishSteps.join(' -> '),
    chainHindi: hindiSteps.join(' -> '),
  };
}

function resolveGrandparent(first: string, second: string): RelationTerm {
  if (first === 'father') {
    if (second === 'father') return { hindi: 'Dada', english: 'Paternal Grandfather' };
    if (second === 'mother') return { hindi: 'Dadi', english: 'Paternal Grandmother' };
  }
  if (first === 'mother') {
    if (second === 'father') return { hindi: 'Nana', english: 'Maternal Grandfather' };
    if (second === 'mother') return { hindi: 'Nani', english: 'Maternal Grandmother' };
  }
  return { hindi: 'Dada/Nana', english: 'Grandparent', notes: 'Side unknown' };
}

function resolveParentSibling(
  parentRel: string,
  parentPerson: Person | null,
  siblingPerson: Person | null,
  peopleById: Map<string, Person>
): RelationTerm {
  const siblingGender = normalizeGender(siblingPerson?.gender);
  if (parentRel === 'father') {
    if (siblingGender === 'male') {
      const order = compareAge(parentPerson, siblingPerson);
      if (order === 'older') return { hindi: 'Tau', english: 'Paternal Uncle (elder)' };
      if (order === 'younger') return { hindi: 'Chacha', english: 'Paternal Uncle (younger)' };
      return { hindi: 'Chacha', english: 'Paternal Uncle', notes: 'Age order unknown' };
    }
    if (siblingGender === 'female') return { hindi: 'Bua', english: 'Paternal Aunt' };
    return { hindi: 'Bua/Chacha', english: 'Paternal Aunt/Uncle', notes: 'Gender unknown' };
  }

  if (parentRel === 'mother') {
    if (siblingGender === 'male') return { hindi: 'Mama', english: 'Maternal Uncle' };
    if (siblingGender === 'female') return { hindi: 'Maasi', english: 'Maternal Aunt' };
    return { hindi: 'Mama/Maasi', english: 'Maternal Aunt/Uncle', notes: 'Gender unknown' };
  }

  if (parentRel === 'parent') {
    if (siblingGender === 'male') return { hindi: 'Chacha/Mama', english: 'Uncle', notes: 'Parent side unknown' };
    if (siblingGender === 'female') return { hindi: 'Bua/Maasi', english: 'Aunt', notes: 'Parent side unknown' };
    return { hindi: 'Bua/Mama', english: 'Aunt/Uncle', notes: 'Parent side unknown' };
  }

  return { hindi: 'Rishtedaar', english: 'Relative' };
}

function resolveSiblingChild(
  siblingPerson: Person | null,
  childPerson: Person | null
): RelationTerm {
  const siblingGender = normalizeGender(siblingPerson?.gender);
  const childGender = normalizeGender(childPerson?.gender);
  if (siblingGender === 'male') {
    if (childGender === 'male') return { hindi: 'Bhatija', english: "Brother's Son" };
    if (childGender === 'female') return { hindi: 'Bhatiji', english: "Brother's Daughter" };
    return { hindi: 'Bhatija/Bhatiji', english: "Brother's Child", notes: 'Gender unknown' };
  }
  if (siblingGender === 'female') {
    if (childGender === 'male') return { hindi: 'Bhaanja', english: "Sister's Son" };
    if (childGender === 'female') return { hindi: 'Bhanji', english: "Sister's Daughter" };
    return { hindi: 'Bhaanja/Bhanji', english: "Sister's Child", notes: 'Gender unknown' };
  }
  return { hindi: 'Bhatija/Bhaanja', english: 'Niece/Nephew', notes: 'Sibling gender unknown' };
}

function resolveSiblingSpouse(siblingPerson: Person | null): RelationTerm {
  const siblingGender = normalizeGender(siblingPerson?.gender);
  if (siblingGender === 'male') return { hindi: 'Bhabhi', english: "Brother's Wife" };
  if (siblingGender === 'female') return { hindi: 'Jija', english: "Sister's Husband" };
  return { hindi: 'Bhabhi/Jija', english: 'Sibling-in-law', notes: 'Sibling gender unknown' };
}

function resolveChildSpouse(childPerson: Person | null): RelationTerm {
  const childGender = normalizeGender(childPerson?.gender);
  if (childGender === 'male') return { hindi: 'Bahu', english: "Son's Wife" };
  if (childGender === 'female') return { hindi: 'Damaad', english: "Daughter's Husband" };
  return { hindi: 'Bahu/Damaad', english: 'Child-in-law', notes: 'Child gender unknown' };
}

function resolveGrandchild(childPerson: Person | null, grandchild: Person | null): RelationTerm {
  const childGender = normalizeGender(childPerson?.gender);
  const grandGender = normalizeGender(grandchild?.gender);
  if (childGender === 'male') {
    if (grandGender === 'male') return { hindi: 'Pota', english: "Son's Son" };
    if (grandGender === 'female') return { hindi: 'Poti', english: "Son's Daughter" };
    return { hindi: 'Pota/Poti', english: "Son's Child", notes: 'Grandchild gender unknown' };
  }
  if (childGender === 'female') {
    if (grandGender === 'male') return { hindi: 'Nati', english: "Daughter's Son" };
    if (grandGender === 'female') return { hindi: 'Natin', english: "Daughter's Daughter" };
    return { hindi: 'Nati/Natin', english: "Daughter's Child", notes: 'Grandchild gender unknown' };
  }
  return { hindi: 'Nati/Pota', english: 'Grandchild', notes: 'Child gender unknown' };
}

function resolveSpouseParent(parentPerson: Person | null): RelationTerm {
  const parentGender = normalizeGender(parentPerson?.gender);
  if (parentGender === 'male') return { hindi: 'Sasur', english: 'Father-in-law' };
  if (parentGender === 'female') return { hindi: 'Saas', english: 'Mother-in-law' };
  return { hindi: 'Sasur/Saas', english: 'Parent-in-law', notes: 'Gender unknown' };
}

function resolveSpouseSibling(
  selfGender: Gender,
  spousePerson: Person | null,
  siblingPerson: Person | null
): RelationTerm {
  const siblingGender = normalizeGender(siblingPerson?.gender);
  if (selfGender === 'female') {
    if (siblingGender === 'male') {
      const order = compareAge(spousePerson, siblingPerson);
      if (order === 'older') return { hindi: 'Jeth', english: "Husband's Elder Brother" };
      if (order === 'younger') return { hindi: 'Devar', english: "Husband's Younger Brother" };
      return { hindi: 'Devar/Jeth', english: "Husband's Brother", notes: 'Age order unknown' };
    }
    if (siblingGender === 'female') return { hindi: 'Nanad', english: "Husband's Sister" };
    return { hindi: 'Nanad/Devar', english: "Husband's Sibling", notes: 'Gender unknown' };
  }

  if (selfGender === 'male') {
    if (siblingGender === 'male') return { hindi: 'Sala', english: "Wife's Brother" };
    if (siblingGender === 'female') return { hindi: 'Sali', english: "Wife's Sister" };
    return { hindi: 'Sala/Sali', english: "Wife's Sibling", notes: 'Gender unknown' };
  }

  return { hindi: 'Sala/Nanad', english: 'Spouse sibling', notes: 'Self gender unknown' };
}

function resolveSpouseSiblingSpouse(
  selfGender: Gender,
  spousePerson: Person | null,
  siblingPerson: Person | null
): RelationTerm {
  const siblingGender = normalizeGender(siblingPerson?.gender);
  if (selfGender === 'female') {
    if (siblingGender === 'male') {
      const order = compareAge(spousePerson, siblingPerson);
      if (order === 'older') return { hindi: 'Jethani', english: "Husband's Elder Brother's Wife" };
      if (order === 'younger') return { hindi: 'Devrani', english: "Husband's Younger Brother's Wife" };
      return { hindi: 'Jethani/Devrani', english: "Husband's Brother's Wife", notes: 'Age order unknown' };
    }
    if (siblingGender === 'female') return { hindi: 'Nandoi', english: "Husband's Sister's Husband" };
    return { hindi: 'Nandoi/Jethani', english: "Spouse sibling's spouse", notes: 'Sibling gender unknown' };
  }

  if (selfGender === 'male') {
    if (siblingGender === 'male') return { hindi: 'Sala ki Patni', english: "Wife's Brother's Wife" };
    if (siblingGender === 'female') return { hindi: 'Bahnoi/Jija', english: "Wife's Sister's Husband" };
    return { hindi: 'Sala/Sali ka Jeevan Saathi', english: "Wife's sibling's spouse", notes: 'Sibling gender unknown' };
  }

  return { hindi: 'Spouse ke sibling ka jeevan saathi', english: "Spouse sibling's spouse", notes: 'Self gender unknown' };
}

function resolveSpouseSiblingChild(
  selfGender: Gender,
  siblingPerson: Person | null,
  childPerson: Person | null
): RelationTerm {
  const siblingGender = normalizeGender(siblingPerson?.gender);
  const childGender = normalizeGender(childPerson?.gender);
  const childWord = childGender === 'male' ? 'Beta' : childGender === 'female' ? 'Beti' : 'Bachcha';
  const childEnglish = childGender === 'male' ? 'Son' : childGender === 'female' ? 'Daughter' : 'Child';

  if (selfGender === 'female') {
    if (siblingGender === 'male') return { hindi: `Devar/Jeth ka ${childWord}`, english: `Husband's Brother's ${childEnglish}`, notes: 'Age order unknown' };
    if (siblingGender === 'female') return { hindi: `Nanad ka ${childWord}`, english: `Husband's Sister's ${childEnglish}` };
  }

  if (selfGender === 'male') {
    if (siblingGender === 'male') return { hindi: `Sala ka ${childWord}`, english: `Wife's Brother's ${childEnglish}` };
    if (siblingGender === 'female') return { hindi: `Sali ka ${childWord}`, english: `Wife's Sister's ${childEnglish}` };
  }

  return { hindi: `Spouse ke sibling ka ${childWord}`, english: `Spouse sibling's ${childEnglish}`, notes: 'Self or sibling gender unknown' };
}

function resolveParentSiblingSpouse(
  parentRel: string,
  siblingPerson: Person | null
): RelationTerm {
  const siblingGender = normalizeGender(siblingPerson?.gender);
  if (parentRel === 'father') {
    if (siblingGender === 'female') return { hindi: 'Fufa', english: "Father's Sister's Husband" };
    if (siblingGender === 'male') return { hindi: 'Chachi', english: "Father's Brother's Wife", notes: 'Defaults to younger brother' };
  }
  if (parentRel === 'mother') {
    if (siblingGender === 'male') return { hindi: 'Mami', english: "Mother's Brother's Wife" };
    if (siblingGender === 'female') return { hindi: 'Maasa', english: "Mother's Sister's Husband" };
  }
  if (parentRel === 'parent') {
    if (siblingGender === 'female') return { hindi: 'Fufa/Maasa', english: "Aunt's Husband", notes: 'Parent side unknown' };
    if (siblingGender === 'male') return { hindi: 'Chachi/Mami', english: "Uncle's Wife", notes: 'Parent side unknown' };
    return { hindi: 'In-law', english: 'In-law', notes: 'Parent side unknown' };
  }
  return { hindi: 'Rishtedaar', english: 'In-law', notes: 'Side unknown' };
}

function resolveCousin(
  parentRel: string,
  parentPerson: Person | null,
  siblingPerson: Person | null,
  cousinPerson: Person | null
): RelationTerm {
  const siblingGender = normalizeGender(siblingPerson?.gender);
  const cousinGender = normalizeGender(cousinPerson?.gender);

  if (parentRel === 'father') {
    if (siblingGender === 'female') {
      if (cousinGender === 'male') return { hindi: 'Phupera Bhai', english: 'Paternal Cousin (Bua side)' };
      if (cousinGender === 'female') return { hindi: 'Phuperi Behen', english: 'Paternal Cousin (Bua side)' };
      return { hindi: 'Phupera/Phuperi', english: 'Paternal Cousin', notes: 'Cousin gender unknown' };
    }
    if (siblingGender === 'male') {
      const order = compareAge(parentPerson, siblingPerson);
      const prefix = order === 'older' ? 'Tau' : 'Chacha';
      if (cousinGender === 'male') return { hindi: `${prefix} ka beta`, english: 'Paternal Cousin (uncle side)' };
      if (cousinGender === 'female') return { hindi: `${prefix} ki beti`, english: 'Paternal Cousin (uncle side)' };
      return { hindi: `${prefix} ka bachcha`, english: 'Paternal Cousin', notes: 'Cousin gender unknown' };
    }
  }

  if (parentRel === 'mother') {
    if (siblingGender === 'male') {
      if (cousinGender === 'male') return { hindi: 'Mamera Bhai', english: 'Maternal Cousin (Mama side)' };
      if (cousinGender === 'female') return { hindi: 'Mameri Behen', english: 'Maternal Cousin (Mama side)' };
      return { hindi: 'Mamera/Mameri', english: 'Maternal Cousin', notes: 'Cousin gender unknown' };
    }
    if (siblingGender === 'female') {
      if (cousinGender === 'male') return { hindi: 'Masera Bhai', english: 'Maternal Cousin (Maasi side)' };
      if (cousinGender === 'female') return { hindi: 'Maseri Behen', english: 'Maternal Cousin (Maasi side)' };
      return { hindi: 'Masera/Maseri', english: 'Maternal Cousin', notes: 'Cousin gender unknown' };
    }
  }

  return { hindi: 'Cousin', english: 'Cousin', notes: 'Side or gender unknown' };
}

function buildDescriptiveTerm(
  relPath: string[],
  pathIds: string[],
  peopleById: Map<string, Person>
): RelationTerm {
  const chain = buildChain(pathIds, relPath, peopleById);
  const englishParts = chain.chainEnglish.split(' -> ').slice(1);
  const hindiParts = chain.chainHindi.split(' -> ').slice(1);

  if (englishParts.length === 0 || hindiParts.length === 0) {
    return { hindi: 'Rishtedaar', english: 'Relative' };
  }

  return {
    hindi: hindiParts.join(' ke '),
    english: englishParts.join("'s "),
    notes: 'No single standard Hindi term; showing resolved relation',
  };
}

function resolvePath(
  relPath: string[],
  pathIds: string[],
  peopleById: Map<string, Person>
): RelationTerm {
  if (relPath.length === 0) return { hindi: 'Main', english: 'Self' };

  const selfPerson = peopleById.get(pathIds[0]) || null;
  const targetPerson = peopleById.get(pathIds[pathIds.length - 1]) || null;
  const selfGender = normalizeGender(selfPerson?.gender);
  const targetGender = normalizeGender(targetPerson?.gender);

  if (relPath.length === 1) {
    const ageOrder = compareAge(selfPerson, targetPerson);
    return resolveDirect(relPath[0], selfGender, targetGender, ageOrder);
  }

  if (relPath.length === 2) {
    const [first, second] = relPath;
    const firstPerson = peopleById.get(pathIds[1]) || null;
    const secondPerson = peopleById.get(pathIds[2]) || null;

    if (isParentRel(first) && isParentRel(second)) return resolveGrandparent(first, second);
    if (isParentRel(first) && second === 'child') {
      return resolveDirect('sibling', normalizeGender(selfPerson?.gender), normalizeGender(secondPerson?.gender), compareAge(selfPerson, secondPerson));
    }
    if (isParentRel(first) && isSiblingRel(second)) {
      return resolveParentSibling(first, firstPerson, secondPerson, peopleById);
    }
    if (first === 'sibling' && second === 'child') {
      return resolveSiblingChild(firstPerson, secondPerson);
    }
    if (first === 'sibling' && second === 'spouse') {
      return resolveSiblingSpouse(firstPerson);
    }
    if (first === 'child' && second === 'child') {
      return resolveGrandchild(firstPerson, secondPerson);
    }
    if (first === 'child' && second === 'spouse') {
      return resolveChildSpouse(firstPerson);
    }
    if (first === 'spouse' && isParentRel(second)) {
      return resolveSpouseParent(secondPerson);
    }
    if (first === 'spouse' && second === 'sibling') {
      return resolveSpouseSibling(selfGender, firstPerson, secondPerson);
    }
    if (first === 'spouse' && second === 'child') {
      return { hindi: 'Sautela Bachcha', english: 'Step-child' };
    }
  }

  if (relPath.length === 3) {
    const [first, second, third] = relPath;
    const parentPerson = peopleById.get(pathIds[1]) || null;
    const siblingPerson = peopleById.get(pathIds[2]) || null;
    const finalPerson = peopleById.get(pathIds[3]) || null;

    if (isParentRel(first) && second === 'sibling' && third === 'child') {
      return resolveCousin(first, parentPerson, siblingPerson, finalPerson);
    }
    if (isParentRel(first) && second === 'sibling' && third === 'spouse') {
      return resolveParentSiblingSpouse(first, siblingPerson);
    }
    if (isParentRel(first) && isParentRel(second) && isParentRel(third)) {
      return { hindi: 'Par-Dada/Par-Nana', english: 'Great-grandparent' };
    }
    if (first === 'child' && second === 'child' && third === 'child') {
      return { hindi: 'Par-Pota/Par-Nati', english: 'Great-grandchild' };
    }
    if (first === 'spouse' && second === 'sibling' && isParentRel(third)) {
      return resolveSpouseParent(finalPerson);
    }
    if (first === 'spouse' && isParentRel(second) && third === 'child') {
      return resolveSpouseSibling(selfGender, parentPerson, finalPerson);
    }
    if (first === 'spouse' && second === 'sibling' && third === 'spouse') {
      return resolveSpouseSiblingSpouse(selfGender, parentPerson, siblingPerson);
    }
    if (first === 'spouse' && second === 'sibling' && third === 'child') {
      return resolveSpouseSiblingChild(selfGender, siblingPerson, finalPerson);
    }
  }

  return buildDescriptiveTerm(relPath, pathIds, peopleById);
}

function buildShortestPath(
  selfId: string,
  targetId: string,
  relationships: Relationship[],
  peopleById: Map<string, Person>
): RelationshipResolution | null {
  if (selfId === targetId) {
    return {
      term: { hindi: 'Main', english: 'Self' },
      pathIds: [selfId],
      relPath: [],
      multiplePaths: false,
      chainEnglish: 'ME',
      chainHindi: 'Main',
    };
  }

  const adj = buildAdjacency(peopleById, relationships);
  const distances = new Map<string, number>();
  const parents = new Map<string, Array<{ prevId: string; relType: string }>>();
  const pathCounts = new Map<string, number>();

  const queue: string[] = [];
  distances.set(selfId, 0);
  pathCounts.set(selfId, 1);
  queue.push(selfId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDistance = distances.get(current) ?? 0;
    const edges = adj.get(current) || [];

    for (const edge of edges) {
      const nextDistance = currentDistance + 1;
      const existing = distances.get(edge.targetId);
      if (existing === undefined) {
        distances.set(edge.targetId, nextDistance);
        parents.set(edge.targetId, [{ prevId: current, relType: edge.relType }]);
        const currentCount = pathCounts.get(current) ?? 0;
        pathCounts.set(edge.targetId, Math.min(2, currentCount));
        queue.push(edge.targetId);
      } else if (existing === nextDistance) {
        const list = parents.get(edge.targetId) || [];
        list.push({ prevId: current, relType: edge.relType });
        parents.set(edge.targetId, list);
        const currentCount = pathCounts.get(current) ?? 0;
        const prevCount = pathCounts.get(edge.targetId) ?? 0;
        pathCounts.set(edge.targetId, Math.min(2, prevCount + currentCount));
      }
    }
  }

  if (!distances.has(targetId)) return null;

  const maxPaths = 5;
  const buildPaths = (nodeId: string): Array<{ pathIds: string[]; relPath: string[] }> => {
    if (nodeId === selfId) return [{ pathIds: [selfId], relPath: [] }];
    const parentList = parents.get(nodeId) || [];
    const results: Array<{ pathIds: string[]; relPath: string[] }> = [];
    for (const parent of parentList) {
      const partials = buildPaths(parent.prevId);
      for (const partial of partials) {
        if (results.length >= maxPaths) return results;
        results.push({
          pathIds: [...partial.pathIds, nodeId],
          relPath: [...partial.relPath, parent.relType],
        });
      }
    }
    return results;
  };

  const paths = buildPaths(targetId);
  if (paths.length === 0) return null;

  const primary = paths[0];
  const term = resolvePath(primary.relPath, primary.pathIds, peopleById);
  const chain = buildChain(primary.pathIds, primary.relPath, peopleById);
  const multiplePaths = paths.length > 1;
  const alternatives = paths.slice(1).map((path) => {
    const termAlt = resolvePath(path.relPath, path.pathIds, peopleById);
    const chainAlt = buildChain(path.pathIds, path.relPath, peopleById);
    return {
      term: termAlt,
      pathIds: path.pathIds,
      relPath: path.relPath,
      chainEnglish: chainAlt.chainEnglish,
      chainHindi: chainAlt.chainHindi,
    };
  });

  return {
    term,
    pathIds: primary.pathIds,
    relPath: primary.relPath,
    multiplePaths,
    chainEnglish: chain.chainEnglish,
    chainHindi: chain.chainHindi,
    alternatives: alternatives.length > 0 ? alternatives : undefined,
  };
}

export function resolveRelationship(
  selfId: string,
  targetId: string,
  people: Person[],
  relationships: Relationship[]
): RelationshipResolution {
  const peopleById = new Map<string, Person>();
  for (const person of people) peopleById.set(person.id, person);

  const result = buildShortestPath(selfId, targetId, relationships, peopleById);
  if (!result) {
    return {
      term: { hindi: 'Door ka rishtedar', english: 'Distant relative', notes: 'No connected path' },
      pathIds: [],
      relPath: [],
      multiplePaths: false,
      chainEnglish: 'ME',
      chainHindi: 'Main',
    };
  }

  return result;
}

export function resolveRelationshipLabel(
  selfId: string,
  targetId: string,
  people: Person[],
  relationships: Relationship[]
): RelationshipResolution {
  return resolveRelationship(selfId, targetId, people, relationships);
}
