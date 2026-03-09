#[derive(Clone, Copy, Debug, Default)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[derive(Clone, Copy, Debug, Default)]
pub struct Transform {
    pub translation: Vec3,
    pub yaw: f32,
}

#[derive(Clone, Copy, Debug, Default)]
pub struct ControlInput {
    pub move_x: f32,
    pub move_y: f32,
    pub look_yaw_delta: f32,
    pub action_primary: bool,
}
