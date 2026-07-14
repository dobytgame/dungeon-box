export interface LegalTable {
  headers: string[];
  rows: string[][];
}

export interface LegalSection {
  id: string;
  title: string;
  paragraphs?: string[];
  list?: string[];
  tables?: LegalTable[];
  subsections?: {
    title: string;
    paragraphs?: string[];
    list?: string[];
    tables?: LegalTable[];
  }[];
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  sections: LegalSection[];
}
