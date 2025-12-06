# Music Player Ideas

Future enhancements, wild experiments, and feature dreams.

**No user tracking.** No storing visits, play counts, listening history, or any persistent user data. Session-only state is fine. Time-based features use the clock, not stored timestamps. If a feature requires remembering users across sessions, don't build it.

---

## Architecture & Core Concepts

### Debug/Power User Features (Hidden)

Decomposed toggles for advanced users:
- Source: Page / Station / Random / Time
- DJ: On / Off
- Commercials: On / Off
- Genre Lock: Auto / Locked / Chaos

### Future: Tune-In Dial

Physical dial UI to tune between stations. Static between frequencies. Signal clarifies as you approach a station. Very tactile.

---

## New Genres

Genres that fit the 90s web aesthetic and are achievable with oscillator synthesis:

| Genre | Energy | Brightness | Character |
|-------|--------|------------|-----------|
| Rock/Metal | +0.7 | -0.5 | Distorted power chords, palm mutes, big snare |
| Drum & Bass | +0.8 | -0.4 | Fast breaks (170 BPM), heavy sub |
| Trip-Hop | -0.6 | -0.5 | Slow breaks, moody, Portishead vibes |
| Eurodance | +0.7 | +0.5 | 90s club, very synthy |
| Industrial | +0.8 | -0.8 | Aggressive, noisy, NIN territory |
| Gabber | +1.0 | -0.7 | Distorted kicks, 180+ BPM, maximum chaos |
| Ska-Punk | +0.6 | +0.4 | Offbeat stabs, brass-like synths |
| Acid | +0.5 | -0.3 | 303 squelch, resonant filter sweeps |

### Rock/Metal Specifics

- Power chord voicings (root + fifth + octave)
- Palm-muted chugging (16th notes, short envelope + LP filter)
- Drop-D tuning feel with low root notes
- Gated reverb snare (very 90s)
- Structure: verse-chorus with breakdowns

### Acid Specifics

- 303-style bass: saw + resonant filter with envelope
- Filter accent on certain steps
- Classic acid patterns: 16th note sequences with rests

---

## Sound Design

### New Tracks / Layers

- **Texture/Atmosphere Layer** - Ambient background sounds:
  - Rain/nature for ambient genre
  - Crowd atmosphere for rave structures
  - Tape warble for vaporwave (beyond just detuning)
  - Room tone / air

- **Lead/Hook Synth** - Separate from melody track:
  - Higher octave, brighter timbre for drops
  - Distinct hook patterns during high-energy sections
  - Currently melody does everything

### New Instruments

- **Vocoder Chords** - Robot voice pad sounds

### Synthesis Enhancements

**Synthesis Types:**
- **FM Synthesis** - Metallic, bell-like tones (DX7 style)
- **Additive Synthesis** - Build sounds from individual sine harmonics
- **Physical Modeling** - Karplus-Strong plucked strings, blown tubes, struck objects
- **Wavetable** - Morph between waveforms over time
- **Vector Synthesis** - Joystick-style morphing between 4 waveforms
- **Phase Distortion** - Casio CZ-style waveshaping
- **Granular Synthesis** - Clouds of tiny sound grains
- **Supersaw** - Dedicated multiple detuned sawtooth stack (not just detune parameter)

**Oscillator Features:**
- **Hard Sync** - Slave oscillator reset by master (aggressive timbres)
- **Sub Oscillator** - Octave-down layer for bass weight
- **Noise Types** - Pink, brown, blue noise (not just white)
- **Wavefolding** - Fold waveforms back on themselves (West Coast style)
- **Wave Morphing** - Smooth interpolation between wave shapes
- **Ring Modulation** - Multiply two oscillators for metallic tones
- **Formant Oscillator** - Vowel-like tones built into the oscillator

**Filter Types:**
- **State Variable Filter** - Morphable LP/HP/BP/Notch
- **Ladder Filter** - Moog-style resonant lowpass
- **Comb Filter** - Metallic resonances, Karplus-Strong basis
- **Formant Filter** - Vowel shaping (a-e-i-o-u)
- **Filter FM** - Audio-rate filter modulation for aggression
- **Parallel/Serial Filters** - Multiple filter routing options
- **Self-oscillating Filter** - Filter as a sound source

**Modulation Sources:**
- **Multiple LFOs** - More than one modulation source
- **Step Sequencer Mod** - Rhythmic parameter automation
- **Sample & Hold** - Random stepped modulation
- **Envelope Follower** - React to audio dynamics
- **Mod Matrix** - Flexible source-to-destination routing
- **Audio-rate Modulation** - Oscillators modulating parameters
- **Chaos/Random** - Lorenz attractor, noise-based modulation

**Envelope Enhancements:**
- **Multi-stage Envelopes** - DAHDSR or more complex shapes
- **Looping Envelopes** - Repeat for rhythmic effects
- **Curve Controls** - Exponential, logarithmic, S-curve options
- **Per-stage Curves** - Different curve per ADSR segment
- **Envelope Retrigger Modes** - Reset behavior options

**Voice Architecture:**
- **True Polyphony** - Independent voice management
- **Unison Modes** - Stack voices with spread
- **Legato Modes** - Mono with held envelope
- **Chord Memory** - Play chords from single notes
- **Voice Stealing Modes** - How to handle voice overflow
- **MPE Support** - Per-note expression (pitch bend, pressure)

**Tuning & Pitch:**
- **Microtuning** - Non-12TET scales (quarter tones, etc.)
- **Just Intonation** - Pure harmonic ratios
- **Scala File Support** - Load custom tunings
- **Pitch Drift** - Analog-style tuning instability
- **Octave Stretching** - Piano-style inharmonicity

**Special:**
- **Feedback Loops** - Route output back to input
- **Cross-modulation** - Oscillators modulating each other
- **Bit Manipulation** - Bitwise XOR, AND on waveforms
- **Circuit Bending** - Intentional glitches and errors
- **Analog Modeling** - Component-level simulation (caps, resistors)
- **DC Offset Control** - For asymmetric waveforms

### Effects

**Modulation:**
- **Flanger** - Jet-like swooshing via short modulated delay
- **Phaser** - Sweeping notch filters for movement
- **Tremolo** - Volume LFO modulation (classic synth effect)
- **Auto-pan** - Stereo position modulation
- **Ring Modulation** - Metallic, atonal textures
- **Rotary/Leslie** - Spinning speaker simulation (great for pads)

**Distortion:**
- **Overdrive** - Warm tube-style saturation
- **Distortion** - Harder clipping for edge
- **Fuzz** - Extreme square-wave clipping
- **Tape Saturation** - Warm analog compression and harmonics
- **Waveshaper** - Custom distortion curves
- **Exciter/Enhancer** - Add high-frequency harmonics for presence

**Dynamics:**
- **Compressor** - Glue the mix together, add punch
- **Limiter** - Prevent clipping on master output
- **Multiband Compressor** - Different compression per frequency band
- **Gate/Noise Gate** - Cut audio below threshold
- **Transient Shaper** - Control attack/sustain independently
- **Ducker** - More sophisticated sidechain compression

**Frequency:**
- **Parametric EQ** - Per-genre frequency shaping
- **Graphic EQ** - Visual frequency bands
- **Wah** - Swept resonant bandpass filter
- **Formant Filter** - Vowel-like sounds (a-e-i-o-u)
- **Comb Filter** - Metallic resonances
- **Tilt EQ** - Simple bright/dark control

**Delay:**
- **Ping Pong Delay** - Stereo bouncing delay
- **Tape Delay** - Warped delay with wow/flutter degradation
- **Multi-tap Delay** - Multiple delay taps at different times
- **Ducking Delay** - Delay that quiets when input is present
- **Reverse Delay** - Backwards echoes

**Reverb Variants:**
- **Shimmer Reverb** - Pitch-shifted reverb tails (ethereal)
- **Gated Reverb** - 80s style abrupt cutoff
- **Spring Reverb** - Twangy, lo-fi character
- **Plate Reverb** - Dense, smooth tails
- **Reverse Reverb** - Swells into notes

**Pitch:**
- **Pitch Shifter** - Octave up/down layers
- **Harmonizer** - Add harmony notes at intervals
- **Octaver** - Dedicated octave up/down
- **Detune** - Slight pitch offset for thickness

**Spectral/Experimental:**
- **Granular** - Glitchy, stuttery textures from audio grains
- **Spectral Freeze** - Sustain a moment indefinitely
- **Vocoder** - Robot voice synthesis
- **Convolution** - Use any sound as reverb impulse
- **Spectral Delay** - Different delays per frequency
- **Frequency Shifter** - Shift frequencies (not pitch) for weird effects

### Lo-Fi Treatments

- **Dusty EQ** - Roll off highs, boost low-mids
- **Record Skip** - Occasional loop/stutter glitch

---

## Musical Content

### Melody Patterns (Future)

- **Question/Answer Phrasing** - Musical punctuation (more sophisticated than current call/response)
- **Metric Modulation** - Tempo feels like it changes
- **Rubato** - Expressive timing freedom

### Drum Patterns (Future)

- **Blast Beats** - Very fast alternating kick/snare (metal)
- **Ghost Notes** - Quiet snare hits between main beats (funk/groove)

---

## Radio & DJ Features

### Sound Effects Library

Triggered between songs or on section changes:

- **Dial-up Modem** - Synthesize the 56k handshake sequence
- **ICQ "Uh Oh"** - Incoming message sound
- **AOL "You've Got Mail"** - Classic notification
- **Windows Startup** - The Microsoft boot chime
- **Windows Error** - Ding! Critical stop!
- **AIM Door Open/Close** - Buddy sign on/off
- **Fax Machine** - Beeps and screeches
- **Keyboard Typing** - Mechanical clatter
- **Mouse Click** - UI feedback sound
- **Cash Register** - Ka-ching!

### DJ Drops

Short vocal samples for drops and transitions:

- **"REWIND!"** - With scratch effect
- **"SELECTA!"** - Dancehall style
- **"BIG UP!"** - Shoutout energy
- **Air Horn** - The classic party horn
- **Laser Zap** - Pew pew pew
- **Record Scratch** - Wicka wicka
- **Explosion** - For drops
- **Crowd Cheer** - "YEAH!"
- **Siren** - Police/ambulance
- **Gunshot** - Dancehall reload

### Station Content

- **Weather Report** - "Packet loss on the I-56k, expect delays"
- **Traffic Update** - "Heavy congestion on the backbone router"
- **News Headlines** - "Scientists discover new animated GIF format"
- **Horoscope** - "Aquarius: Today you will encounter a 404 error"
- **Call-In Segment** - Pre-recorded "callers" with questions
- **Contest Announcements** - "Be caller 56 to win a free web counter!"
- **PSAs** - "Remember to defrag your hard drive"

### Station Enhancements (Implemented stations need special features)

**PIRATE RADIO** - Needs audio glitch effects: signal cuts in/out, static bursts, frequency drift

**THE VOID** - Could use extra sparse/unsettling processing: longer silences, distant reverb, very low volume

### Time-Locked Stations

Some stations only broadcast at certain hours. Outside hours: static or "off air" message.

| Station | Hours | Vibe |
|---------|-------|------|
| MIDNIGHT.GOV | 12-5 AM | Numbers station, coded messages |
| TEST PATTERN | 4-6 AM | Liminal, end of broadcast day |
| HOLD MUSIC | 9 AM-5 PM | Business hours only |

*Note: Stations are implemented but time-locking is not yet active.*

---

## Player Features

### Visualizer Modes

- **Oscilloscope** - Waveform display
- **Spectrum Bars** - Current FFT but with style options
- **Circular Spectrum** - Bars arranged in a circle
- **Milkdrop-Style** - Reactive patterns and shapes
- **Matrix Rain** - Frequency data drives the rain speed
- **Fire** - Audio-reactive flames
- **Starfield** - Stars zoom speed tied to bass

### UI Enhancements

- **Equalizer** - 5-10 band EQ with visual sliders
- **Skin System** - Different visual themes (Winamp skins!)
- **Mini Mode** - Collapse to just a small bar
- **Playlist View** - See upcoming/past tracks
- **Album Art** - Procedurally generated artwork
- **Spectrum Background** - Visualizer behind the whole page
- **Now Playing Toast** - Notification when track changes

### Playback Features

- **Queue System** - Add songs to a playlist (session only)
- **Shuffle Station** - Random station each track
- **Gapless Playback** - No silence between songs
- **Speed Control** - Playback rate adjustment (nightcore mode at 1.25x)

### Song Persistence

- **Song Seed** - Generate a shareable code that recreates the exact song
- **Share URL** - Link format: `?track=xX_raccoon_vapor_C*~&seed=7a3f9b`
- **Export Presets** - Save genre/structure combinations as downloadable file

---

## Interactive Features

### Page Integration

- **Click to Trigger** - Click page elements to play sounds
- **Hover Sounds** - Mouse over elements triggers notes
- **Scroll DJ** - Scrolling scratches/modulates the music
- **Typing Percussion** - Keyboard becomes a drum pad
- **Cursor Theremin** - Mouse X/Y controls pitch and filter
- **Element Sonification** - Each DOM element type has a sound

### Reactive Behaviors

- **Visibility API** - Mute when tab not visible
- **Idle Detection** - Chill out to ambient when inactive
- **Scroll Position** - Section of page affects genre
- **Weather API** - Rain sounds when it's raining IRL
- **Battery Level** - Low battery = slowed down, sad

---

## Technical Improvements

### Audio Quality

- **Stereo** - Pan instruments left/right
- **Better Filters** - Resonant filters, different types
- **Oversampling** - Reduce aliasing on harsh waveforms
- **Dynamic Range** - Limiter on master output
- **Ducking Polish** - Smoother sidechain curves

### Performance

- **Web Worker** - Move audio scheduling off main thread
- **AudioWorklet** - Custom DSP in real-time
- **Lazy Loading** - Don't load music code until needed
- **Memory Management** - Clean up finished oscillators
- **Buffer Pooling** - Reuse audio buffers

### Export Improvements

- **MP3 Export** - Smaller files (need encoder library)
- **OGG Export** - Open format option
- **Stem Export** - Separate files per track
- **Loop Export** - Just the main loop, perfect for tiling
- **Ringtone Length** - 30-second export option

---

## Wild Ideas

### Multiplayer Radio

Would require server infrastructure, but could be fun someday:

- **Shared Station** - Everyone hears the same song (synced playback)
- **Request Line** - Users submit requests via form
- **Dedication Board** - Public dedications scroll by
- **Listener Count** - "1,337 listeners tuned in"

### AI Integration

- **LLM Lyrics** - Generate actual lyrics for the track
- **Style Transfer** - "Make this sound more like X"
- **Image to Music** - Convert page screenshots to sound

### Absurd Features

- **Physical CD Burn** - Pretend to burn a CD with progress bar
- **Floppy Disk Mode** - Fits in 1.44MB (very compressed)
- **Dial-Up Simulator** - Wait for "connection" before music
- **Buffer Wheel** - Fake loading spinner
- **Clip Art Radio** - Every track has clip art cover
- **MIDI Karaoke** - On-screen lyrics with bouncing ball
- **Web 1.0 Leaderboard** - High scores for chaos level
- **AOL Keyword** - "AOL Keyword: RACCOON"

---

## Easter Eggs

No user tracking required - all based on time, input, or page content.

### Keyboard/Input Triggers

- **Konami code** → Unlocks secret station
- **Type "raccoon"** → Instant lofi + raccoon DJ takeover
- **Type "chaos"** → Maximum chaos mode

### Time-Based

- **3:33 AM exactly** → Special broadcast
- **Friday 13th** → Spooky station override
- **New Year's midnight** → Celebration mode
- **4:04 AM** → "Station not found" glitch music

### Page-Based

- **404 page** → Glitched, broken music that's actually good
- **Page has "under construction"** → CONSTRUCTION ZONE station available
- **Page title contains "raccoon"** → Raccoon FM auto-tunes

### Interaction-Based (Session Only)

- **Flip tape 5 times in a row** → "Indecisive" audio easter egg
- **Max out chaos slider** → Brief audio freakout

---

## Priority Tiers

### Do Next (High Impact)
- Song seed for sharing

### Do Eventually (Medium Impact)
- More visualizer modes
- Station special effects (PIRATE RADIO glitches, THE VOID processing)
- Time-locked stations
- Texture/atmosphere layer

### Do Maybe (Fun but Effort)
- Skin system
- Weather/traffic reports
- Click-to-trigger sounds
- Album art generation
- Easter eggs (Konami code, time-based triggers)
- Tune-in dial UI

### Do If Bored (Wild)
- Multiplayer shared radio
- LLM-generated lyrics
- Physical CD burn animation
- Debug/power user decomposed toggles

---

**When implementing features:** Update [README.md](./README.md) with user-facing feature descriptions. The README is a non-technical feature overview, not dev docs.
