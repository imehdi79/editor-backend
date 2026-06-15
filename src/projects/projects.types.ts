// Wire shapes shared with the frontend client. `shapes` and `viewport` are
// intentionally typed loosely (opaque JSON) — the backend never inspects them.

export interface PageViewport {
  x: number;
  y: number;
  scale: number;
}

export interface Page {
  id: string;
  name: string;
  shapes: Record<string, unknown>; // opaque CAD shapes
  viewport: PageViewport;
}

export interface Project {
  id: string;
  name: string;
  pages: Page[];
  activePageId: string;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms (server-owned)
}

export interface ProjectSummary {
  id: string;
  name: string;
  pageCount: number;
  updatedAt: number;
}
