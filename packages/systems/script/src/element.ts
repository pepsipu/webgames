import { Element } from "@webgames/engine";

export class ScriptElement extends Element {
  source: string;
  tickBudgetMs: number;

  constructor(source: string, tickBudgetMs: number) {
    super();
    this.source = source;
    this.tickBudgetMs = tickBudgetMs;
  }
}
