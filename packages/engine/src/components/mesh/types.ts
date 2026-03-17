import { Component } from "../component";

export class Mesh extends Component {
  static readonly key = "mesh";
  vertices: Float32Array;
  indices: Uint16Array;

  constructor(vertices: Float32Array, indices: Uint16Array) {
    super();
    this.vertices = vertices;
    this.indices = indices;
  }
}
