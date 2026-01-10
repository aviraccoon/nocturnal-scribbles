---
title: "How I accidentally built a procedural music generator"
date: 2026-01-01
tags: [dev, web, building-in-public]
slug: how-insane-can-i-make-this
description: "I asked 'how insane can I make this?' at midnight. Three sleepless nights later: nine genres, twenty radio stations, and Dumpster Diving Certification ads."
draft: false
---

```
~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~
         WELCOME TO THE INFORMATION SUPERHIGHWAY
              You are visitor #847293
        [ This page is under construction ]
~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~
```

I wanted more than light mode and dark mode.

Three days later I had a procedural music generator with nine genres, twenty radio stations, and fictional advertisements for Dumpster Diving Certification Courses.

This is the story of feature creep at 3am.

## December 3rd, midnight

I was tired. I should have gone to sleep. Instead, I started messing with adding some themes to this blog.

First came the silly ones. A hotdog stand theme with two modes: ketchup (red background, yellow text) and mustard (yellow background, red text). A terminal theme. A few others.[^themes]

Then I started experimenting with randomly generated colors. And fonts. And then I asked myself a dangerous question:

**"How insane can I make this?"**

The answer was: very.

Three hours later, I had a Geocities theme. Everything randomized. Cursor trails. Particles. Canvas animations. Rainbow text. Marquees.[^marquee] Up to four status bars on any edge of the screen, each with its own scrolling messages - visitor counters, ICQ numbers, AIM screennames like `xX_cool_wolf69Xx`, "Now playing: doom_e1m1.mid", webring links. Elements that flee when you hover over them.

I went to bed at 7:15am, still staring at my phone looking at the beautiful abomination I'd created. In my journal I wrote: "It's that good."

```
*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*
          ~*~ SITE FEATURES ~*~

  [x] Falling particles (snowflakes, leaves,
      hearts, or RACCOONS)
  [x] Sparkle trails following your cursor
  [x] Elements that EXPLODE into emoji
  [x] UNDER CONSTRUCTION banners
  [x] Spinning wireframe shapes
  [x] Matrix rain (with raccoons)
  [x] Demoscene fire effects
  [x] Click particles for POINTS
      (raccoons = 25 pts, combo multipliers!)
  [x] Random fonts (Comic Sans, Papyrus,
      Impact, Jokerman, Wingdings...)
  [x] 1-4 status bars in 19 styles
      (Windows 95, Vaporwave, Barbie...)

*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*
```

## December 4th: the concert

I woke up at 3pm. Grabbed coffee. Went to see Nemo[^nemo] at MeetFactory.

It was wonderful. One of my top three concerts ever, alongside Paradox (Thai rock band I saw completely randomly in Ayutthaya) and Barasuara (Indonesian band I saw completely randomly in a Jakarta shopping mall). Queer crowd. Good energy.

I got home around 11pm, grabbed a kebab on the way, and felt that post-concert creative high. You know the one. When live music leaves you buzzing and you need to *make something*.

Old Geocities pages had auto-playing MIDIs. Mine didn't have music.

That felt wrong.

I started looking into Web Audio API. Oscillator synthesis. How hard could it be to generate some bleeps and bloops?

From my journal, December 4th:

> Started working on some improvements to the silly Geocities theme, and somehow added an entire procedurally generated music player with a lot of different genres and radios. Oops. Worth it to not sleep.

## December 5th: nocturnal trash panda energy

I didn't sleep much. Crashed around 4pm after a beer.[^beer] Woke up at 11pm.

And then came what I call "nocturnal trash panda energy" - that 2am productivity mode where everything clicks and you can't stop even if you wanted to.

I added automix. Genre detection based on page content. A chaos slider. Nine genres: chiptune, MIDI, synthwave, lofi, vaporwave, ambient, techno, trance, happycore.

I didn't know basically anything about procedural music generation going in. Still pretty lost, honestly. But LLMs made it possible to experiment without years of music theory. Try things, see what sounds right, iterate.

```
*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*
           ~*~ RADIO STATIONS ~*~

  97.3  RACCOON FM - Nocturnal beats
  3.AM  DUMPSTER DIVE FM - We eat everything
  140.0 RAVE.NET - Maximum BPM, minimum sleep
  0.01  THE VOID - ...
  0.00  MIDNIGHT.GOV - Numbers. Only numbers.
  45.0  CAFE.FM - Take your time
  ???   PIRATE RADIO - Unauthorized broadcast
  1.800 HOLD MUSIC - Your call is important

         [ 20 stations total ]

*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*
```

## December 6th: shipped

Didn't sleep again. Shipped an initial version in the morning. Stopped by for chlebíčky.[^chlebicky] Kept listening to the generated music because it's genuinely fun.

Slept 3.5 hours in the afternoon. Woke up around 5pm and genuinely couldn't tell if it was morning or evening.

The music player has two modes:

**Tape Mode** 📼 - Your page becomes a mixtape. The music places you on a two-axis mood map (chill↔energy, dark↔bright) based on what it detects: time of day, page content, emoji types, visual chaos level. Code blocks push toward digital/bright. Long paragraphs are chill. 🦝 triggers nocturnal lofi vibes. 2-5am shifts everything darker and slower. Weekend nights add party energy. Flip to Side B and the whole mood inverts.

**Radio Mode** 📻 - Twenty stations with DJs, jingles, and commercials for fictional 90s web products. GuestBook Plus. MIDI Collection Pro. The Forbidden Cat Adoption Agency. Dumpster Diving Certification (licensed by actual raccoons).

Old posts get the worn-cassette treatment. Tape hiss. Vinyl crackle. The older the post, the dustier the sound. Archives should sound like archives.

## The chaos slider

There's a slider labeled CHAOS. Turn it up and everything gets weirder. More detuning. More wobble. Genre shifts. Turn it down for a calmer sound.

But where's the fun in that?

## What's next

This thing is becoming a playground. Some directions I'm excited about:

**More ways to generate:** Right now it reacts to page content or plays radio stations. I want modes for generating specific things - "give me 30 seconds of tense ambient" or "loop-ready chiptune for a game scene." Shareable song seeds so you can save and recall your favorites. Stem exports for mixing.

**More genres:** Rock/metal, drum & bass, trip-hop, eurodance, industrial, gabber, acid. The [IDEAS.md](https://github.com/aviraccoon/nocturnal-scribbles/blob/main/src/geocities/music/IDEAS.md) has the full list.

**More radio chaos:** Dial-up modem handshake sounds between songs. ICQ "uh oh" notifications. Weather reports for the information superhighway. Time-locked stations that only broadcast at certain hours. Winamp skins for the player.

**Game audio:** I'm [making small games](/posts/making-small-games/) and the procedural approach means I don't need to compose anything - just define parameters and generate. Background music, menu themes, sound effects.

**More silly things:** Easter eggs. A cursor theremin. Typing percussion. Whatever sounds fun at 3 AM.

No timeline. It'll happen when it happens. The whole thing is [open source](https://github.com/aviraccoon/nocturnal-scribbles) (MIT license). The code is a beautiful mess, like all good Geocities tributes.

---

Try it yourself: toggle "geocities" in the theme picker (footer). Not every Geocities page had auto-playing music, so neither does every refresh here - but you can always enable it manually with the checkbox below the theme buttons.[^fans] Every refresh is different. Every page sounds different.

Welcome to the information superhighway.

<marquee>\~\*\~ Thanks for visiting! Please sign my guestbook! \~\*\~</marquee>

```
~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~

         Thanks for visiting my page!!!
     Please sign my guestbook (coming soon)

            [  PREV  |  RANDOM  |  NEXT  ]
              ~ Raccoon WebRing ~

         Best viewed in Netscape Navigator 4.0
              at 800x600 resolution
                  16-bit color

  This site is a member of the Nocturnal Animals
  WebRing. To visit other sites in the ring,
  click PREV or NEXT. To visit a random site,
  click RANDOM.

  ICQ#: 222850657
  AIM: aviraccoon
  Last updated: December 2025

~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~
```

[^themes]: You can try them all in the footer. The hotdog theme is a Windows 3.11 reference - click it to swap between ketchup and mustard.
[^marquee]: The `<marquee>` element still works in browsers. I'm not saying you should use it. I'm saying I did.
[^nemo]: The winner of Eurovision 2024. Non-binary Swiss artist. Incredible live.
[^beer]: "It can't fuck me up even more when I didn't sleep" - past me, accurately predicting the immediate crash that followed
[^chlebicky]: Czech open-faced sandwiches. The correct breakfast after an all-nighter.
[^fans]: The full Geocities experience made my MacBook Pro fans spin. The standalone toggle exists for a reason.
