export interface LegalSection {
  id: string;
  title: string;
  paragraphs?: string[];
  list?: string[];
  subsections?: { title: string; paragraphs?: string[]; list?: string[] }[];
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  sections: LegalSection[];
}
