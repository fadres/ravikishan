export const sections = [
  {
    id: 'class-11',
    label: 'Class 11',
    classSlug: 'class-11',
  },
];

const byId = new Map(sections.map((s) => [s.id, s]));
const byClassSlug = new Map(sections.map((s) => [s.classSlug, s]));

export function sectionById(sectionId) {
  return byId.get(sectionId) || { id: sectionId, label: sectionId, classSlug: sectionId };
}

export function sectionFromClassSlug(classSlug) {
  return byClassSlug.get(classSlug) || null;
}

export function sectionIdFromClassSlug(classSlug) {
  return sectionFromClassSlug(classSlug)?.id || classSlug;
}

export function sectionPath(sectionId, subjectSlug, chapterSlug) {
  let path = `/${sectionId}`;
  if (subjectSlug) path += `/subject/${subjectSlug}`;
  if (chapterSlug) path += `/chapter/${chapterSlug}`;
  return path;
}
