export interface ElementSnapshot extends Record<string, unknown> {
  tag: string;
  id?: string | null;
  class?: string[];
  children?: ElementSnapshot[];
}
