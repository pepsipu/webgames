import type { Element } from "./element";
import type { ElementField } from "./element-registry";

type NumberKey<T> = {
  [K in keyof T]-?: T[K] extends number ? K : never;
}[keyof T] &
  string;

type StringKey<T> = {
  [K in keyof T]-?: T[K] extends string ? K : never;
}[keyof T] &
  string;

export function numberField<
  T extends Element,
  K extends NumberKey<T> = NumberKey<T>,
>(key: K): ElementField<T> {
  return {
    set(element, value) {
      if (typeof value === "number") {
        element[key] = value as T[K];
        return;
      }

      if (typeof value === "string") {
        const number = parseFloat(value);

        if (!Number.isNaN(number)) {
          element[key] = number as T[K];
          return;
        }
      }

      throw new Error(`Field "${key}" must be a number.`);
    },
  };
}

export function stringField<
  T extends Element,
  K extends StringKey<T> = StringKey<T>,
>(key: K): ElementField<T> {
  return {
    set(element, value) {
      if (typeof value !== "string") {
        throw new Error(`Field "${key}" must be a string.`);
      }

      element[key] = value as T[K];
    },
  };
}
