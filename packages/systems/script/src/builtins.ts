import {
  CameraElement,
  ShapeElement,
  Transform,
  TransformElement,
} from "@webgame/game";
import { InputServiceElement } from "@webgame/input";
import {
  registerScriptable,
  setScriptFunction,
  setScriptGetter,
  type Scriptable,
} from "./scriptable";

const transformScriptable: Scriptable<TransformElement> = {
  installElement(context, elementHandle, element) {
    setScriptGetter(context, elementHandle, "transform", () => {
      const transformHandle = context.newObject();

      setScriptFunction(context, transformHandle, "setPosition", (x, y, z) => {
        element.transform.position[0] = context.getNumber(x);
        element.transform.position[1] = context.getNumber(y);
        element.transform.position[2] = context.getNumber(z);
      });

      setScriptFunction(
        context,
        transformHandle,
        "setRotation",
        (x, y, z, w) => {
          element.transform.rotation[0] = context.getNumber(x);
          element.transform.rotation[1] = context.getNumber(y);
          element.transform.rotation[2] = context.getNumber(z);
          element.transform.rotation[3] = context.getNumber(w);
        },
      );

      setScriptFunction(
        context,
        transformHandle,
        "setRotationFromEuler",
        (x, y, z) => {
          Transform.setRotationFromEuler(
            element.transform,
            context.getNumber(x),
            context.getNumber(y),
            context.getNumber(z),
          );
        },
      );

      setScriptFunction(context, transformHandle, "setScale", (x, y, z) => {
        element.transform.scale[0] = context.getNumber(x);
        element.transform.scale[1] = context.getNumber(y);
        element.transform.scale[2] = context.getNumber(z);
      });

      return transformHandle;
    });
  },
};

const materialScriptable: Scriptable<ShapeElement> = {
  installElement(context, elementHandle, element) {
    setScriptGetter(context, elementHandle, "material", () => {
      const materialHandle = context.newObject();

      setScriptFunction(context, materialHandle, "setColor", (r, g, b) => {
        element.material[0] = context.getNumber(r);
        element.material[1] = context.getNumber(g);
        element.material[2] = context.getNumber(b);
      });

      return materialHandle;
    });
  },
};

const inputScriptable: Scriptable<InputServiceElement> = {
  installElement(context, elementHandle, element) {
    setScriptFunction(context, elementHandle, "isDown", (code) => {
      return element.down.has(context.getString(code))
        ? context.true
        : context.false;
    });

    setScriptFunction(context, elementHandle, "wasPressed", (code) => {
      return element.pressed.has(context.getString(code))
        ? context.true
        : context.false;
    });

    setScriptFunction(context, elementHandle, "wasReleased", (code) => {
      return element.released.has(context.getString(code))
        ? context.true
        : context.false;
    });
  },
};

registerScriptable(TransformElement, transformScriptable);
registerScriptable(CameraElement, transformScriptable);
registerScriptable(ShapeElement, transformScriptable);
registerScriptable(ShapeElement, materialScriptable);
registerScriptable(InputServiceElement, inputScriptable);
