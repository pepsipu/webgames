import { createElement, type Element } from "@webgame/engine";
import {
  destroyScriptElement,
  type ScriptServiceElement,
  registerScriptElement,
} from "./service";

export interface Script {
  readonly source: string;
  tickBudgetMs: number;
}

export interface ScriptOptions {
  parent: Element;
  service: ScriptServiceElement;
  source: string;
  tickBudgetMs: number;
}

export type ScriptComponent = { script: Script };

export function createScript(
  options: ScriptOptions,
): Element & ScriptComponent {
  const element = createElement({
    script: {
      source: options.source,
      tickBudgetMs: options.tickBudgetMs,
    },
  });

  try {
    options.parent.append(element);
    registerScriptElement(options.service, element);
    return element;
  } catch (error) {
    element.remove();
    destroyScriptElement(options.service, element);
    throw error;
  }
}

export function hasScript(
  element: Element,
): element is Element & ScriptComponent {
  return "script" in element;
}
