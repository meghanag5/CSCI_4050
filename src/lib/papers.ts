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
    description: "Language models, agents, and machine reasoning.",
  },
  {
    name: "Medicine",
    description: "Clinical studies, treatments, and public health.",
  },
  {
    name: "Biotechnology",
    description: "Genetics, protein design, and lab methods.",
  },
  {
    name: "Physics",
    description: "Quantum systems, materials, and astrophysics.",
  },
];

export const PAPERS: Record<string, Paper[]> = {};
