export const shaderCode = `
  struct Camera {
    viewProjection: mat4x4f,
  };

  struct DrawState {
    position: vec3f,
    _positionPadding: f32,
    rotation: vec4f,
    scale: vec3f,
    _scalePadding: f32,
    color: vec3f,
    _colorPadding: f32,
  };

  struct VertexInput {
    @location(0) position: vec3f,
  };

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec3f,
  };

  @group(0) @binding(0) var<uniform> camera: Camera;
  @group(1) @binding(0) var<uniform> drawState: DrawState;

  fn rotateQuaternion(position: vec3f, rotation: vec4f) -> vec3f {
    let offset = 2.0 * cross(rotation.xyz, position);
    return position + rotation.w * offset + cross(rotation.xyz, offset);
  }

  @vertex
  fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    var position = input.position * drawState.scale;
    position = rotateQuaternion(position, drawState.rotation);
    position = position + drawState.position;
    output.position = camera.viewProjection * vec4f(position, 1.0);
    output.color = drawState.color;
    return output;
  }

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    return vec4f(input.color, 1.0);
  }
`;
