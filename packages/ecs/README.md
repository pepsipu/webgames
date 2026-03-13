# @webgame/ecs

bevy ECS in TypeScript

## Example

```ts
import { Schedule, World, component, resource } from "@webgame/ecs";

type Position = { x: number; y: number };
type Velocity = { x: number; y: number };
type Time = { delta: number };

const Position = component<Position>("Position");
const Velocity = component<Velocity>("Velocity");
const Time = resource<Time>("Time");

const world = new World();

world.spawn(Position({ x: 0, y: 0 }), Velocity({ x: 2, y: 1 }));

world.setResource(Time, { delta: 1 / 60 });

const movement = (world: World) => {
  const time = world.getResource(Time);
  if (!time) {
    return;
  }

  for (const [position, velocity] of world.query([Position, Velocity])) {
    position.x += velocity.x * time.delta;
    position.y += velocity.y * time.delta;
  }
};

const schedule = new Schedule();
schedule.addSystems(movement);
schedule.run(world);
```

## API

- `component<T>(name)` creates a component token.
- `resource<T>(name)` creates a resource token.
- `world.spawn(...)` creates an entity with components.
- `world.insert(...)` and `world.remove(...)` change an entity's components.
- `world.query([...], { with, without })` iterates matching component sets.
- `schedule.addSystems(...)` and `schedule.run(world)` run systems in order.
