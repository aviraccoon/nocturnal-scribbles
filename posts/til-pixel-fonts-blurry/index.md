---
title: "TIL: Why pixel fonts look blurry in browsers (and when to give up)"
date: 2026-01-11
tags: [til, fonts, css, web]
slug: til-pixel-fonts-blurry
description: "Pixel fonts blur at non-native sizes due to antialiasing. No CSS trick fixes it."
draft: false
---

I built a [fake Steam store page](https://raccoon.land/games/the-review/) using [cs16.css](https://cs16.samke.me/), a CSS library that recreates the old Counter-Strike 1.6 / early Steam aesthetic. It includes ArialPixel, a pixel font designed on a 16×16 grid.

The font looked crisp on my Mac. Then a friend sent a screenshot from Linux. Blurry mess.

## What's happening

ArialPixel is designed on a 16×16 pixel grid (em=1024, 64-unit grid). It's outline-only, no embedded bitmaps. My page uses font sizes from 10px to 14px for body text.

When the font size doesn't match the design grid (multiples of 16px), the pixel grid doesn't align with display pixels. Modern browsers apply antialiasing to smooth the edges. Result: blur.

I dug into the font with FontForge.[^fontforge] The GASP table had empty hinting flags - no gridfitting instructions telling renderers how to snap to pixels. (I did gasp when I saw it. Sorry.)

Here's a sandbox comparing everything I tried:

![Font comparison showing various pixel fonts and rendering approaches](./font_comparison.webp)

## The rabbit hole

I tried a lot of things. None of them worked.

**Font-level fixes:** I fixed the GASP table to enable gridfitting - macOS ignored it. Embedded bitmap strikes at target sizes - browsers don't use embedded bitmaps.

**CSS tricks:** `image-rendering: pixelated` only works on images, not text. `-webkit-font-smoothing: none` - Chrome removed support years ago. `font-smooth: never` isn't even a real property, thanks outdated Stack Overflow answers.[^stackoverflow]

**Rendering workarounds:** Canvas with `fillText()` always antialiases, no way to disable. WebGL with `GL_NEAREST` sampling - the source was already antialiased by the time I could touch it. Manual pixel scaling (render large, scale down) - still blurry source.

**Other pixel fonts:** VT323, Silkscreen, Press Start 2P - tested them but they didn't fit the CS 1.6 aesthetic anyway. Too bold, wrong vibe.

## Why nothing works

Browser text rendering happens before CSS or JavaScript can intervene. By the time you can access the rendered text (canvas, WebGL), antialiasing has already been applied. There's no API to say "render this font without smoothing."

The only ways to get crisp pixel fonts are using sizes that match the font's design grid (16px, 32px, etc.), or rendering text as pre-made images. Neither worked for my use case - I needed readable body text at small sizes.

## The solution

Give up. Offer users a toggle.

```css
html.hd-mode * {
  font-family: Tahoma, 'Segoe UI', system-ui, sans-serif !important;
}
```

The page now has an "HD Font" toggle in the footer. Users on displays where the pixel font looks bad can switch to Tahoma (which is what CS 1.6 actually used). Users where it looks fine keep the aesthetic.

Sometimes the pragmatic solution is admitting the technically "correct" solution doesn't exist.

[^fontforge]: First time using FontForge. It's... a lot. But it got the job done.
[^stackoverflow]: The amount of confidently wrong CSS answers about font rendering is impressive. Most are from 2012 and reference properties that never existed or were removed a decade ago.
