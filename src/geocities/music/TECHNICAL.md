# Technical Overview

```
~*~*~*~ HOW THE MUSIC ZONE WORKS ~*~*~*~
    [ Behind the curtain, beyond the MIDI ]
```

This document explains the technical architecture of the Geocities Music Player. Each section has an ELI5 (Explain Like I'm 5) version and a normal technical explanation.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Procedural Music Generation](#procedural-music-generation)
3. [Mood Analysis & Genre Selection](#mood-analysis--genre-selection)
4. [The Two-Axis Mood Map](#the-two-axis-mood-map)
5. [Tape Mode vs Radio Mode](#tape-mode-vs-radio-mode)
6. [Automix & Dual-Deck Mixing](#automix--dual-deck-mixing)
7. [The Chaos Slider](#the-chaos-slider)
8. [FX & Risers](#fx--risers)
9. [Rhythmic Pads](#rhythmic-pads)
10. [Multi-Bar Builds](#multi-bar-builds)
11. [Synth Enhancements](#synth-enhancements)
12. [Dusty Archives Effect](#dusty-archives-effect)
13. [Radio: DJs, Jingles & Commercials](#radio-djs-jingles--commercials)
14. [Export: WAV & MIDI](#export-wav--midi)
15. [File Reference](#file-reference)

---

## Architecture Overview

### ELI5

Imagine a robot DJ with a big box of LEGO bricks. Each brick is a different sound - drums, bass, melodies. The robot looks at the page you're reading, checks what time it is, and decides what kind of music you need. Then it snaps the right bricks together to build a song just for you. Every time it builds, the song is different!

### Technical

The player uses Web Audio API oscillator synthesis to generate music in real-time. No audio files are loaded - every note is synthesized from waveforms (sine, square, sawtooth, triangle).

**Core Components:**

| Component | File | Purpose |
|-----------|------|---------|
| Generator | `generator.ts` | Orchestrates song creation and audio scheduling |
| Mixer | `mixer.ts` | Dual-deck routing and crossfade transitions |
| Synths | `synths.ts` | Oscillator-based synthesis primitives |
| Patterns | `patterns.ts` | Generates melody, bass, drums, arpeggio, pad, FX patterns |
| Mood | `mood.ts` | Analyzes page content to determine genre |
| Genres | `genres.ts` | Genre definitions with synthesis parameters |
| Structures | `structures.ts` | Song structures (verse-chorus, build-drop, ambient, etc.) |

**Audio Signal Flow:**
```
Oscillators → Sidechain Gain → Filter → [Clean/Bitcrusher Split] → Effects → Master
                   ↑                              ↑
              Kick drum ducks              Chiptune/MIDI get
              other instruments            crunchy bit reduction
```

---

## Procedural Music Generation

### ELI5

The robot doesn't know the whole song before it plays. It knows the rules: "this genre likes these scales" and "drums usually go boom-bap-boom-bap." Then it makes up the notes following those rules, like a jazz musician improvising, except it's a robot and it's 3 AM.

### Technical

Songs are generated through a pipeline:

```
generate() → selectGenre(visualState)
  → createSong()
    → pick structure (verse-chorus, build-drop, ambient, rave, etc.)
    → generate patterns per section
      → generatePattern() creates: melody, bass, drums, arpeggio, pad
    → real-time playback via scheduler
```

**Song Structure (`types.ts`):**

```typescript
Song {
  genre: Genre
  structure: SongStructure      // Matched to genre (ambient, rave, chill, etc.)
  tempo: number                 // 60-180 BPM, genre-dependent
  rootNote: number              // Starting pitch
  scale: number[]               // Scale types (major, minor, pentatonic, dorian, etc.)
  progression: number[]         // Chord progressions (I-IV-V, ii-V-I, etc.)
  patterns: Map<SectionType, Pattern>
  totalBars: number
  // Per-song synthesis params:
  delayAmount, filterCutoff, detune, attack, swing
}
```

**Real-Time Scheduling:**
- Runs on a 16th-note grid (`STEPS_PER_BAR = 16`)
- Step duration: `60 / tempo / 4` seconds
- Scheduler runs ahead of real-time with a look-ahead buffer
- Each step triggers synthesis for all active voices

**Track Names (`track-names.ts`):**

Names like `3am_raccoon_lofi_F#` are procedurally generated using:
- Genre vocabulary (chiptune: "8bit", "pixel"; lofi: "chill", "tape", "raccoon")
- Time-of-day words (lateNight: "insomnia", "witching", "liminal")
- Emoji vocabulary (emojis mapped to word lists)
- Content-type words (code: "syntax", "debug"; reflective: "memory", "ponder")
- Chaos modifiers ("calm" to "turbo" to "maximum")
- Vintage words for old posts ("dusty", "archive", "relic")
- Color words derived from page background hue
- Fake artist names (xX_DarkAngel_Xx, DJ_Pixel, TrashPanda99)

Tape mode uses page-aware generation. Radio mode uses genre-focused names with station DJ references.

---

## Mood Analysis & Genre Selection

### ELI5

The robot reads your page like a mood ring. Dark colors? Late night? Sad quotes? That's ambient music territory. Bright colors, lots of sparkles, fire emojis? Time for happycore. It counts everything - how many code blocks, how many raccoon emojis, what time it is - and uses that to pick the vibe.

### Technical

The `VisualState` object captures page characteristics:

```typescript
VisualState {
  dominantHue, saturation, lightness  // Color analysis
  marqueesCount, elementCount         // DOM complexity
  codeBlockCount                      // Technical content → digital vibes
  blockquoteCount                     // Reflective content → chill
  avgParagraphLength                  // Longer = slower/ambient
  emojiTypes[]                        // Categorized: spooky, fire, love, raccoon, retro
  timeSlot                            // Time of day affects mood
  isWeekendNight                      // Friday/Saturday 9PM+ = energy boost
  postAgeDays                         // For dusty tape effect
}
```

**Mood Modifiers:**
- Code blocks: +energy, +brightness
- Blockquotes: -energy, -brightness
- Long paragraphs: -energy (contemplative)
- Late night (2-5 AM): -0.35 energy, -0.25 brightness
- Spooky emojis: -0.4 brightness
- Fire emojis: +0.3 energy
- Raccoon emojis: -0.25 energy (nocturnal creatures are chill)
- Weekend nights: +0.2 energy

---

## The Two-Axis Mood Map

### ELI5

Picture a big square. Left side is chill, right side is energetic. Top is bright and happy, bottom is dark and moody. Each music genre lives somewhere on this square. The robot figures out where YOUR page lands on this square, then picks the closest genre.

### Technical

Genres are positioned on a 2D mood space with Energy (X) and Brightness (Y) axes:

```
                     BRIGHT (+1)
                         ↑
              Chiptune   |   Happycore
              MIDI       |   Trance
                         |
CHILL (-1) ←─────────────●─────────────→ ENERGY (+1)
                         |
              Ambient    |   Techno
              Vaporwave  |   Synthwave
              Lofi       |
                         ↓
                      DARK (-1)
```

**Genre Mood Positions (`mood.ts`):**

| Genre | Energy | Brightness |
|-------|--------|------------|
| Ambient | -0.8 | -0.3 |
| Vaporwave | -0.7 | -0.5 |
| Lofi | -0.5 | -0.2 |
| Chiptune | -0.2 | 0.7 |
| MIDI | 0.0 | 0.5 |
| Synthwave | 0.6 | -0.4 |
| Techno | 0.7 | -0.6 |
| Trance | 0.8 | 0.3 |
| Happycore | 0.9 | 0.8 |

**Selection Algorithm:**
1. Calculate mood center from VisualState
2. Add random offset (scaled by chaos slider)
3. Calculate Euclidean distance to all genres
4. Pick from closest 3 with weighted probability

**Genre-Specific Effects:**
- **Chiptune/MIDI:** Bitcrusher (quantizes audio to fewer bits for that crunchy 8-bit sound)
- **Lofi/Vaporwave:** Vinyl noise (tape hiss + random crackle pops)
- **All genres:** Post age adds extra dust/hiss for old posts

---

## Tape Mode vs Radio Mode

### ELI5

**Tape Mode:** The robot makes a custom mixtape based on what you're looking at. Flip the tape to Side B, and everything inverts - chill becomes chaotic, dark becomes bright.

**Radio Mode:** You tune into a station. Each station has its own DJ, its own ads, its own style. RACCOON FM only plays nocturnal beats. RAVE.NET is maximum BPM. THE VOID is... well, THE VOID.

### Technical

**Tape Mode:**
- Analyzes page content to determine mood/genre
- Has Side A and B (flip inverts mood on both axes)
- `flipTape()` maps genre to its opposite: Lofi ↔ Happycore, Ambient ↔ Techno
- No DJ segments or commercials
- Continuous page-reactive generation

**Radio Mode:**
- Pre-defined stations with constraints
- Each station has:
  - `preferredGenres: GenreType[]` - limits genre selection
  - `djNames: string[]` - for announcements
  - `jingles: string[]` - station IDs
  - `adCategories: AdCategory[]` - determines which commercials
  - `color: string` - titlebar highlighting
- Periodic DJ breaks, commercials, jingles between songs
- Genres constrained to station's preferences

---

## Automix & Dual-Deck Mixing

### ELI5

Imagine two record players. One is playing music, one is getting ready. When the current song ends, the robot DJ slowly turns up the waiting record while turning down the current one. They overlap for a moment - that's the crossfade. Then the new song takes over, and the old record player gets ready with the next track.

### Technical

The mixer uses dual decks (A and B) with scheduled transitions:

```typescript
Deck {
  id: "A" | "B"
  item: PlayableItem | null
  state: "idle" | "playing" | "fadeIn" | "fadeOut" | "cueing"
  currentBar, currentStep, startTime
  gainNode, filterNode, delayNode  // Per-deck audio nodes
}
```

**Transition Styles:**
1. **crossfade** - Simple volume crossfade (2-8 bars overlap)
2. **beatmatch** - Align beats, tempo sync
3. **filterSweep** - Low-pass out, high-pass in
4. **echo** - Echo out outgoing track
5. **drop** - Cut outgoing on downbeat, slam new track
6. **hardcut** - Immediate cut (for commercials)

**Transition Flow:**
1. Incoming song queued on inactive deck
2. Transition starts (2-8 bar overlap)
3. Outgoing deck fades to 0
4. Incoming deck fades to 1
5. Optional effects (filter sweep, echo, beatmatch)
6. Decks swap roles

---

## The Chaos Slider

### ELI5

There's a dial labeled CHAOS. Turn it up and everything gets weird. The robot DJ starts making stranger choices - picking unexpected genres, adding more wobble to the sounds, making busier patterns. Turn it down and the robot plays it safe. But safe is boring.

### Technical

Chaos (0-100, internally 0-1.0) affects multiple systems:

**Genre Selection Variety (`mood.ts`):**
- Higher chaos = larger random offset from calculated mood center
- At chaos 0: strict mood adherence
- At chaos 1: can pick genres far from optimal mood position

**Synthesis Parameters:**
- **Detuning:** Higher chaos = more oscillator detuning (wonky sound)
- **Note Density:** Higher chaos = busier patterns
- **Filter Wobble:** Filter LFO gain modulated by chaos
- **Timing Variation:** Swing amount affected by chaos

**Mood Influence:**
- Chaos > 80%: +0.4 energy, +0.2 brightness
- Chaos 60-80%: +0.25 energy
- High chaos biases toward more energetic genres

---

## FX & Risers

### ELI5

Ever notice how EDM songs build up tension before the beat drops? That "WHOOOOSH" sound getting higher and higher? That's a riser. The robot DJ adds these automatically before big moments. When the drop hits, there's a big BOOM impact. It's like the music is taking a deep breath before screaming.

### Technical

FX are non-melodic audio events that add tension and punctuation to section transitions. Unlike other tracks, they're noise-based synthesis rather than pitched notes.

**FX Types (`types.ts`):**

| Type | Description |
|------|-------------|
| `riser` | White noise with rising bandpass filter sweep |
| `downlifter` | Descending lowpass sweep after drops |
| `impact` | Low thump + noise burst on downbeat |
| `reverseCymbal` | Noise with quadratic fade-in envelope |
| `sweep` | Detuned sawtooth oscillators with filter sweep |

**Pattern Generation (`patterns.ts`):**
- Breakdowns get risers or reverse cymbals building to the next section
- Drops get impact hits on the first beat, optional downlifters after
- EDM genres (techno, trance, happycore) favor noise risers
- Chill genres (ambient, lofi, vaporwave) favor reverse cymbals and sweeps
- FX intensity scales with section energy

**Synthesis (`synths.ts`):**
```
Riser:    NoiseBuffer → BandpassFilter (200Hz→12kHz sweep) → Gain (crescendo)
Impact:   SineOsc (80→30Hz pitch drop) + NoiseBuffer (HP 2kHz) → triggers sidechain
Sweep:    2x SawOsc (detuned) → BandpassFilter (up/down sweep) → Gain
```

**Section Handling (`patterns.ts`):**

| Section Type | FX Generated |
|--------------|--------------|
| `breakdown` | Riser or reverse cymbal building to end |
| `drop` | Impact on downbeat, optional downlifter |
| `intro` | Reverse cymbal building into the song |
| `chorus` | Impact on downbeat (energy >= 0.8 only) |

**Section Defaults (`structures.ts`):**
- `hasFX` auto-enabled for `breakdown` and `drop` section types
- Other sections opt-in explicitly (e.g., EDM intros, high-energy choruses)

**Note:** FX are audio-only - they're not included in MIDI export since they're synthesized noise, not pitched notes.

---

## Rhythmic Pads

### ELI5

Imagine a keyboard player holding down a chord for a whole bar. Boooring. Now imagine them doing funky stabs like in disco music - hitting the chord and letting go real quick. Or playing on the offbeats like reggae. The robot DJ can do both! It picks a rhythm style that matches the genre and makes the chords groove instead of just sitting there.

### Technical

Pads support multiple rhythmic patterns instead of just sustained whole-bar chords. The pattern is selected per-section based on genre and energy level.

**Pad Pattern Types (`types.ts`):**

| Pattern | Description |
|---------|-------------|
| `sustained` | Whole-bar held chords (classic pad sound) |
| `stabs` | Short staccato hits on beats 1 and 3 (house/disco) |
| `pumping` | Quarter-note hits with short duration (sidechained feel) |
| `offbeat` | Hits on the "and" beats (reggae/ska style) |
| `rhythmic` | Syncopated patterns (funk grooves) |

**Genre Preferences (`patterns.ts`):**

| Genre | Preferred Patterns |
|-------|-------------------|
| Techno | pumping, stabs, offbeat |
| Trance | pumping, sustained, stabs |
| Happycore | pumping, stabs, offbeat |
| Lofi | sustained, rhythmic |
| Ambient | sustained (mostly) |
| Vaporwave | sustained, rhythmic |

**Pattern Selection:**
- `pickPadPattern(genre, energy)` selects from genre's weighted preferences
- High energy (>0.6) reduces weight of `sustained` patterns
- Low energy (<0.4) reduces weight of rhythmic patterns
- Pattern stored in `pattern.padPattern` for metadata display

**Rhythmic Pattern Examples:**
```
sustained:  [################]  (one chord, full bar)
stabs:      [#...#...#.......]  (beats 1, 3, optional 4)
pumping:    [#...#...#...#...]  (every beat, short)
offbeat:    [..#...#...#...#.]  (every "and")
rhythmic:   [#..#..#...#...#.]  (syncopated funk)
```

---

## Multi-Bar Builds

### ELI5

You know that part in EDM songs where the snare drum starts going faster and faster? Like a roller coaster clicking up the hill before the big drop? The robot DJ does that too! Instead of just one bar of drum roll, it can build tension across 2, 3, or 4 bars - starting slow and sparse, getting faster and louder until BOOM, the drop hits.

### Technical

Multi-bar builds create tension across multiple bars before climactic moments, replacing single-bar fills for longer sections.

**Build Types (`types.ts`, `genres.ts`):**

| Build Type | Description |
|------------|-------------|
| `acceleratingSnare` | Sparse hits → quarters → 8ths → 16th roll |
| `sparseToDense` | Probabilistic density with quadratic curve |
| `tomCascade` | Descending tom pitches, getting faster |

**Genre Build Preferences (`genres.ts`):**

Each genre defines its preferred build types:

| Genre | Build Types |
|-------|-------------|
| Techno, Trance | acceleratingSnare, sparseToDense |
| Happycore | acceleratingSnare, sparseToDense |
| Lofi, Ambient | sparseToDense, tomCascade |
| Vaporwave | sparseToDense, tomCascade |
| Synthwave | all three |
| Chiptune, MIDI | acceleratingSnare, tomCascade |

**When Builds Trigger (`patterns.ts`):**
- Breakdown sections with 4+ bars
- High-energy sections (≥0.7) with 8+ bars (40% chance)
- Build length: half the section, capped at 4 bars

**Accelerating Snare Pattern:**
```
Bar 1:  [.....X.....X...]  (sparse: beats 2 and 4)
Bar 2:  [X...X...X...X...]  (quarter notes)
Bar 3:  [X.X.X.X.X.X.X.X.]  (8th notes)
Bar 4:  [XXXXXXXXXXXXXXXX]  (16th note roll with crescendo)
```

**Sparse-to-Dense Algorithm:**
- Hit probability = (progress²) × 0.8
- Velocity crescendos from 0.3 to 1.0
- Final 4 steps guaranteed hits for climax

**Build Zone Handling:**
- Regular snare patterns skip during build zone
- Single-bar fills skip when multi-bar build is active
- Kick and hi-hat continue normally for groove continuity

---

## Synth Enhancements

### ELI5

Ever notice how real synthesizers sound alive? Notes don't just go "BEEP" - they slide into each other like a singer going "wheeeEEEE". Old tape players wobble a little because the motor isn't perfect. And those fat 80s synth sounds? That's the robot wiggling the sound wave back and forth really fast. The music robot does all of this now!

### Technical

Three synthesis enhancements add movement and character to the oscillator-based sound:

#### Portamento (Glide)

Notes slide from one pitch to the next instead of jumping instantly. Classic synth lead sound.

**Implementation (`synths.ts`):**
```
lastMelodyFreq → stored between notes
New note starts at lastMelodyFreq
exponentialRampToValueAtTime() glides to target frequency
Glide time capped at 50% of note duration
```

**Genre Portamento Times:**

| Genre | Glide Time | Character |
|-------|-----------|-----------|
| Vaporwave | 0.1-0.25s | Slow, dreamy slides |
| Trance | 0.04-0.1s | Iconic lead glides |
| Ambient | 0.08-0.2s | Ethereal drifts |
| Synthwave | 0.03-0.08s | Smooth synth feel |
| Lofi | 0.02-0.06s | Subtle jazzy slides |
| Happycore | 0.01-0.03s | Quick pitch bends |
| Techno | 0-0.02s | Tight, minimal |
| Chiptune/MIDI | 0 | Rigid, no glide |

#### Wow and Flutter

Simulates the pitch instability of worn tape machines. Two LFOs modulate oscillator detune:

**Wow (slow drift):**
- Frequency: 0.3-0.8 Hz (like a warped record)
- Depth: up to 30 cents at max flutter
- Creates that "underwater" vaporwave feel

**Flutter (fast wobble):**
- Frequency: 4-8 Hz (motor irregularity)
- Depth: up to 8 cents at max flutter
- Adds subtle organic movement

**Genre Wow/Flutter Amounts:**

| Genre | Amount | Vibe |
|-------|--------|------|
| Vaporwave | 0.25-0.5 | Heavy tape warble |
| Lofi | 0.15-0.35 | Worn cassette wobble |
| Ambient | 0.05-0.15 | Subtle organic drift |
| Synthwave | 0-0.05 | Hint of analog |
| Others | 0 | Clean digital |

#### PWM (Pulse Width Modulation)

Animates the duty cycle of square waves for that classic moving synth sound. Since Web Audio doesn't have native PWM, it's simulated:

**Technique:**
```
osc1: square wave at frequency
osc2: square wave at same frequency, inverted gain
PWM LFO (0.5-2 Hz triangle) modulates osc2 detune
Phase relationship changes → apparent pulse width changes
```

**The Result:**
- Mixing two squares with varying phase creates a "hollow" to "full" sweep
- Triangle LFO gives smooth, even modulation
- PWM depth controls how dramatic the sweep is (up to 50 cents detune)

**Genre PWM Depths:**

| Genre | PWM Depth | Sound |
|-------|----------|-------|
| Trance | 0.2-0.45 | Super saw movement |
| Synthwave | 0.2-0.4 | Animated pads/leads |
| Techno | 0.15-0.35 | Acid-style movement |
| Happycore | 0.15-0.3 | Bright animated leads |
| Chiptune | 0.1-0.25 | Classic C64 PWM |
| MIDI | 0-0.1 | Minimal movement |
| Sine/Triangle genres | 0 | N/A (only for square waves) |

**Note:** All three enhancements are applied per-note and respect the current song's randomly-selected parameters from genre ranges. Portamento state resets when switching songs to prevent weird glides between tracks.

---

## Dusty Archives Effect

### ELI5

Old blog posts get the worn-tape treatment. Reading something from a year ago? The robot adds vinyl crackle and tape hiss. The older the post, the dustier it sounds. Archives should SOUND like archives.

### Technical

**Post Age Detection:**
```typescript
postAgeDays: number | null  // From post frontmatter date
```

**Effect Scaling (`mood.ts`):**
| Age | Effect Level |
|-----|--------------|
| 0-7 days | 0-0.1 (minimal) |
| 7-30 days | 0.1-0.3 (light dust) |
| 30-90 days | 0.3-0.5 (moderate) |
| 90+ days | 0.5+ (very dusty) |

**Audio Implementation:**
- `vinylNoiseSource: AudioBufferSourceNode` - Vinyl crackle
- `vinylNoiseGain: GainNode` - Crackle volume
- `vinylCrackleGain: GainNode` - Separate crackle layer
- Both routed to analyser for visualization

---

## Radio: DJs, Jingles & Commercials

### ELI5

The radio stations have pretend DJs who talk between songs. They read fake guestbook entries ("shoutout to xX_DarkAngel_Xx") and play commercials for made-up 90s products ("Get your Y2K survival kit today!"). The robot uses text-to-speech, so the DJs sound like robots. Because they are.

### Technical

**DJ Segments (`types.ts`):**
```typescript
DJSegment {
  type: "guestbook" | "dedication" | "stationId" | "timeCheck" | "djIntro" | "visitorCount"
  text: string
  voiceType?: "dj" | "system"
}
```

**DJ Implementation:**
- Uses Web Speech API for text-to-speech
- Genre-specific vocabulary (chiptune: "LEVEL ONE", techno: "BEAT DROP")
- DJ names per station (DJ Trash Panda, HTML Kid, etc.)
- Voice rate randomized per session

**Commercials (`radio-data.ts`):**
- Fictional 90s web products: GuestBook Plus, MIDI Collection Pro, Forbidden Cat Adoption Agency
- Each commercial has `product`, `categories`, and `lines[]`
- Stations filter commercials by their `adCategories`

**Ad Break Flow (`breaks.ts`):**
1. `playAdBreak()` starts
2. Emit `"breakStarted"` event
3. Play intro jingle
4. TTS reads commercials
5. Play outro jingle
6. Emit `"breakEnded"` event

---

## Export: WAV & MIDI

### ELI5

Want to keep your procedural masterpiece? The robot can record the whole song and save it as an audio file (WAV) or a music file for other programs (MIDI). The WAV takes forever on a 56k modem. Worth it.

### Technical

**WAV Export (`recorder.ts`):**
1. Uses `OfflineAudioContext` (44.1 kHz stereo)
2. Uses shared `SynthContext` and synth functions from `synths.ts`
3. Produces identical output to live playback (same genre synthesis, portamento, wow/flutter, PWM, FX)
4. Chunked processing with `yieldToMain()` to avoid blocking UI
5. Progress callbacks for UI updates
6. Downloads as WAV file

**Shared Synthesis Architecture:**

The synth functions are shared between live playback and offline export via `SynthContext`:

```typescript
type SynthContext = {
  ctx: BaseAudioContext;      // AudioContext or OfflineAudioContext
  output: AudioNode;          // Where to route audio
  sidechain: GainNode | null; // For kick ducking (null for offline)
  song: Song;                 // Genre-specific parameters
  state: { lastMelodyFreq: number | null }; // Portamento tracking
};
```

This ensures WAV exports include all synthesis features:
- Genre-specific bass, pad, arp, and drum sounds
- Portamento, wow/flutter, and PWM for melody
- FX (risers, impacts, sweeps)
- Full drum kit (kick, snare, hihat, tom, crash, cowbell, clap, etc.)

**MIDI Export (`midi.ts`):**
- Standard MIDI file (Type 1, multi-track)
- 480 ticks per beat, 16th notes = 120 ticks
- 5 tracks: Melody (ch 1), Bass (ch 2), Arpeggio (ch 3), Pad (ch 4), Drums (ch 10)
- Program mapping per genre (Chiptune → program 80, Lofi → program 4, etc.)
- Uses standard GM percussion mapping

**Filename Format:**
```
{trackName}_[{genre}_{structure}].{ext}
```
Example: `midnight_neon_drive_A_[synthwave_build-drop].wav`

The suffix makes it easy to sort/filter exports by genre or structure type.

---

## File Reference

| File | Purpose |
|------|---------|
| `index.ts` | Entry point, exports `addMusicPlayer` |
| `player.ts` | UI widget, controls, keyboard shortcuts |
| `generator.ts` | Audio scheduling, song creation, playback |
| `mixer.ts` | Dual-deck routing, transitions |
| `mood.ts` | Page analysis, mood mapping |
| `genres.ts` | Genre definitions with synthesis parameters |
| `patterns.ts` | Pattern generation |
| `synths.ts` | Shared synthesis (live + offline via SynthContext) |
| `structures.ts` | Song structure definitions |
| `radio.ts` | Station/DJ/commercial logic |
| `radio-data.ts` | Station definitions, commercials, guestbook entries |
| `breaks.ts` | Ad breaks, DJ announcements |
| `lyrics.ts` | TTS, marquee display |
| `drops.ts` | DJ sound effects |
| `recorder.ts` | WAV export |
| `midi.ts` | MIDI export |
| `events.ts` | Event emitter |
| `data.ts` | Scales, progressions, constants |
| `types.ts` | TypeScript interfaces |
| `track-names.ts` | Content-aware track name generation |

---

```
*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*
   END TRANSMISSION. RETURN TO YOUR REGULARLY
      SCHEDULED PROCEDURAL AUDIO PROGRAM.
*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*
```
