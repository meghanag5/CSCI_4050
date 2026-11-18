export type Paper = {
  id: string;
  title: string;
  summary: string | null;
  url: string | null;
  publishedDate: string | null;
};

export const TOPICS = [
  {
    name: "Artificial Intelligence",
    description: "Language models, computer vision, agents, and machine learning.",
    filter: "topics.subfield.id:1702|1707",
  },
  {
    name: "Medicine",
    description: "Clinical research, treatments, and public health.",
    filter: "topics.field.id:27",
  },
  {
    name: "Biotechnology",
    description: "Biotechnology and applied microbial research.",
    filter: "topics.subfield.id:1305|2402",
  },
  {
    name: "Physics",
    description: "Quantum systems, materials, particles, and astronomy.",
    filter: "topics.field.id:31",
  },
];

export const PAPERS: Record<string, Paper[]> = {};