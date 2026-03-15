export interface Geometry {
  vertices: Float32Array;
  indices: Uint16Array;
}

export interface GeometryComponent {
  geometry: Geometry;
}
