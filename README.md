# Evol

You start as a fish. What you do in the pond decides what you evolve into and the world that grows around
you. Then you build a city in it, and Dr. Wobble reads who you are from how you lived and how you planned.

Inspirations: **city builders** like SimCity (roads, zones, a city that grows on its own), **Townscaper** (houses that shape themselves), **Tiny Glade** (soft, beautiful worlds
with warm light), **Minecraft seeds** (a whole world from one number), and **Doki Doki Universe** (a playful
personality doctor that notices patterns you didn't). Built for the IEEE CS Game Sprint, KSU AI Club Hackathon 2026, by Micah Mosley.

## How to play

| Control | Keyboard | Arduino controller |
|---|---|---|
| Swim, move the build cursor | Arrow keys or WASD | Joystick |
| Bite / grab; use the current tool | Space or Enter (tap) | Press the joystick down (its button) |
| Open the tool wheel | Hold Space, left/right, let go | Hold the button, flick left/right, let go |

1. **The pond (30 s).** You're a small fish. Eat pondweed, bugs or minnows; pick things up; hide in reeds. Bite the pike from behind and it flees, head-on and it bites back. A heron can take your tail. Each seed packs in 6 of 7 events: a frog, a turtle you can hide under, fish eggs and a crayfish raiding them, a kid's net, a baited hook (mash to escape), a fish tangled in fishing line you can free, or a rain shower full of bugs.
2. **Evolving (one transition, no menus).** Your fish spins into a cocoon in space while your pond moments drift past. It hatches into what you earned, then your world rises out of nothing far below you: hills, lakes, then groves of trees popping in from the middle outward. The camera swoops down to where you'll build.
3. **Build a city (about 4 minutes), right in your world.** Your alien is the builder (it hatches in a hard hat). Creatures wander and scatter as you pass, and 8 treasure chests hide around the world: steer your builder to one and it wears what's inside (top hat, crown, cape, armor, goggles, backpack...). The land isn't empty: it already has hills, lakes, trees, rocks and landmarks that come from your evolution (the AI's mix: mesas and cacti, lanterns and pumpkins, stilt houses, ruins...). Build anywhere; whatever stands on a spot is cleared when you build there, and the bulldozer clears wild land too. Tools: road, homes, shops, offices, park, bulldoze. Tap with the road tool to start drawing a road as you move, tap again to stop. Buildings only grow if they touch a road, and they grow taller on their own when their neighborhood has what people want: homes want shops and parks, shops want homes, offices want workers. Cars start driving your streets, roads over water become bridges, and the buildings join into proper blocks (windows, doors, awnings, roofs worked out from their neighbors). Watch population, jobs and happiness. At dusk the windows light up.
4. **Diary.** A page with a photo of your town and a sticker naming who you were.
5. **Dr. Wobble's reading.** An archetype, three observations connecting how you swam to how you built, and the receipts: the exact moments and numbers it's based on. Your city sits on his desk as a diorama. Then live another life.

There's no score to beat. Every life is a different creature, a different world and a different town.
Pond dangers (bitten, hooked, netted, tail lost) don't end the game; they change what you become.

`?quick` shortens the pond and the day for demos. `?debug` exposes the state machine as `window.evol` for testing.

## State machine

```mermaid
stateDiagram-v2
    [*] --> Title
    Title --> Pond: button
    Pond --> Evolving: life timer ends
    Evolving --> World: cocoon hatches, world grows, camera swoops in
    World --> Diary: the sun sets on your town
    Diary --> Reading: turn the page
    Reading --> Pond: live another life (new seed)
    Reading --> Title: back to title
```

Inside World, the tool wheel and road drawing are modes of the same scene. The city simulation ticks every
second or so: each building that has a road and what it needs grows one floor.
Every frame: read input → update the scene → render 3D → draw the 2D overlay.

## Where the AI is

All prompts are in `js/ai/prompts.js`. The AI runs through Claude on claude.ai (no API keys). If it's unavailable,
`js/life/fallback.js` builds everything offline, so the game never stops.

| Moment | What the AI decides |
|---|---|
| Evolving | Creature body, color and name, why you became it, and its world: base biome, name, sky and ground colors, mood, and your building colors |
| Night | The diary page and the day's sticker |
| The end | Dr. Wobble's archetype, three observations, the receipts, and a question, never repeating past lives |

The city is measured for the reading: population, jobs, happiness, roads, homes, shops, offices, parks, buildings
left without a road, bridges, what you built first, how much you bulldozed, and how spread out it is. Personality is also tracked on 7 hidden axes from the pond (curious, kind, bold, calm, social, playful, driven).

## Hardware (bonus)

ELEGOO Mega 2560 + joystick module (its button is the action button), optional active buzzer and LED for feedback.
Wiring and code: `arduino/evol_controller/evol_controller.ino`. Connect with the in-game "Connect joystick" button
(Web Serial), or run `python bridge/serial_to_keys.py` to turn the joystick into arrow keys.

## Code map

```
index.html                 page: 3D canvas + overlay canvas
js/main.js                 boot, scenes, game loop
js/core/game.js            game state, personality axes, scene state machine
js/core/stage.js           Three.js renderer, screen projection, snapshots
js/core/input.js           keyboard, gamepad, Arduino (Web Serial)
js/core/palette.js         colors and fonts (felt, cardboard, sticker colors)
js/core/draw.js            overlay UI: stitched panels, stickers, dialogue, labels
js/core/audio.js           synthesized water, blips and a music box per world
js/core/rng.js, store.js   seeded random, saved lives
js/gfx/models.js           every low-poly model, built in code
js/gfx/sky.js              sky for the pond and evolving scenes
js/gfx/biomes.js           the 8 worlds, their props, stickers and greetings
js/gfx/terrain.js          the world from a seed: smooth meadows, lakes, groves, sky and light
js/gfx/city.js             the city: roads, zones, growth rules, population, jobs, happiness, traffic
js/gfx/town.js             draws buildings Townscaper style: walls, windows, doors, awnings, roofs
js/gfx/planet.js           small floating planets on the title screen
js/ai/claude.js            AI call with timeout, validation and fallback
js/ai/prompts.js           every prompt
js/life/schema.js          validates whatever the AI returns
js/life/traits.js          pond actions -> sentences and personality
js/life/fallback.js        offline creature, world, diary and reading
js/scenes/*.js             title, pond, evolving, world, diary, reading
js/vendor/three.min.js     Three.js r128 (MIT)
arduino/, bridge/          controller sketch and joystick bridge
```

## Limitations and challenges

- **Limitation:** the AI needs a connection and permission on claude.ai. Offline, the game still works, but with less variety.
- **Limitation:** browsers inside claude.ai may block USB, so the joystick may need the Python bridge.
- **Limitation:** 3D with shadows needs a reasonably modern laptop; very old machines will run slowly.
- **Challenge:** making randomness feel earned. The AI only sees what you actually did, and the game shows you that list before the reveal.
- **Challenge:** AI answers are unpredictable, so every answer goes through a validator that repairs or replaces anything broken.
- **Challenge:** a whole world from one number. Seeded value noise makes the hills, lakes and coast; trees grow in groves with open meadows between; the building ground stays gentle and always has a lake beside it.
- **Challenge:** a city builder with one button. Tap uses a tool, hold opens the tool wheel, and roads are drawn by toggling and moving. Every cell stores just a type and a level; shapes come from the neighbors.
- **Challenge:** insight without judging single actions. The reading looks for patterns across the pond and the town, and shows its receipts.

## Resources and credits

- Claude (Anthropic): in-game AI, and the coding assistant used to build the game
- Three.js r128 (MIT license), WebGL, Web Serial API, Web Audio API
- Fonts: Fredoka, Patrick Hand (Google Fonts); emoji for stickers
- Arduino IDE; ELEGOO Mega 2560 kit; Python pyserial and pynput for the bridge
- Inspiration: Townscaper, Tiny Glade, Minecraft seeds, Doki Doki Universe
- No outside art or audio: every model and sound is made in code
