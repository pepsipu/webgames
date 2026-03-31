export interface ElementSnapshot extends Record<string, unknown> {
  tag: string;
  name?: string;
  children?: ElementSnapshot[];
}
