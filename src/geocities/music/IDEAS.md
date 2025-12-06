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

- **FM Synthesis** - Metallic, bell-like tones. Great for spooky phrygian mode detection
- **Unison Detune** - Stack multiple detuned oscillators for super saws
- **Ring Modulation** - Metallic, atonal textures
- **Noise Oscillator** - White/pink noise as a sound source, not just drums
- **Wavetable** - Morph between waveforms over time

### Effects

- **Reverb** - Convolution or algorithmic reverb for space
- **Chorus** - Thicken pads and leads
- **Flanger/Phaser** - Swooshy modulation effects
- **Distortion/Overdrive** - Warm saturation or harsh clipping
- **Compressor** - Glue the mix together, add punch
- **Stereo Widener** - Pan and stereo effects (currently mono)
- **Pitch Shifter** - Octave up/down layers
- **Granular** - Glitchy, stuttery textures from audio grains

### Lo-Fi Treatments

- **Dusty EQ** - Roll off highs, boost low-mids
- **Record Skip** - Occasional loop/stutter glitch
- **Degraded Bit Depth** - 8-bit or 12-bit quantization

---

## Musical Content

### Melody Patterns (Future)

- **Question/Answer Phrasing** - Musical punctuation (more sophisticated than current call/response)
- **Metric Modulation** - Tempo feels like it changes
- **Rubato** - Expressive timing freedom

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
- Reverb effect
- Stereo panning
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
