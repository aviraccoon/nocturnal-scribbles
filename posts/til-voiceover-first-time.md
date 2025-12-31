---
title: "TIL: First time testing with VoiceOver"
date: 2025-12-31
tags: [til, accessibility, macos]
slug: til-voiceover-first-time
description: "Testing a page with macOS VoiceOver for the first time. The Rotor exists, the shortcut is weird, and I found real issues."
draft: true
---

I'd never tested anything with a screen reader before. While adding accessibility improvements to a [retro-styled web page](https://raccoon.land/games/the-review/), I finally tried macOS VoiceOver.

## The shortcut is Cmd+F5

For a feature that's supposed to be accessible, requiring a two-key combination with a function key is a choice. On MacBooks you might also need the Fn key, making it Fn+Cmd+F5. Three keys to enable accessibility.[^shortcut]

(You can also enable it in System Settings → Accessibility → VoiceOver, or ask Siri.)

## The controls take getting used to

VoiceOver has its own modifier key (VO), which is Ctrl+Option by default. So "move to next item" is Ctrl+Option+Right Arrow. Your hands are suddenly doing gymnastics.

Basic navigation I learned:
- **VO + Right/Left** - Move between elements
- **VO + Space** - Activate (click) an element
- **VO + Cmd + H** - Jump to next heading
- **VO + Shift + Up/Down** - Move in/out of groups (felt awkward, kept triggering wrong things)
- **Tab** - Still works for focusable elements

It took a few minutes before I stopped accidentally triggering things or getting stuck.

## The Rotor exists and it's useful

This was the real discovery. Press **VO + U** and a thing called the Rotor appears - a menu that lets you navigate by element type: headings, links, form controls, landmarks.

Suddenly I understood why semantic HTML matters. With the Rotor, a screen reader user can jump straight to the main content, skip to navigation, or browse all headings. If your page is just `<div>` soup, none of that works.[^div-soup]

## What I actually found

Testing my own page revealed some things I wouldn't have caught otherwise:

**Decorative emojis were being read out.** "Owl emoji, broken heart emoji, envelope emoji" for every award icon. Fixed with `aria-hidden="true"`.

**Interactive elements weren't announced properly.** Tags that acted as buttons needed `role="button"` and `tabindex="0"`.

**No skip link.** VoiceOver had to read the entire header before reaching content. Added one.

**Focus outlines didn't fit.** The library's default black outlines didn't match the design. Switched to the accent color for consistency.

**Expandable sections didn't announce state.** Added `aria-expanded` and `aria-controls`.

**Tabs weren't keyboard accessible at all.** The CSS library hid the radio inputs with `opacity: 0`, which also removes them from focus order. Entire sections of the page were unreachable without a mouse. Fixed by switching to the `.sr-only` pattern (1px size, clipped) and moving the focus outline to the visible label.

I also added an accessibility dialog (using the `<dialog>` element) with support status, keyboard shortcuts, the HD font toggle, and an explanation that censored text and hidden interactions are intentional. Using `<dialog>` with `.showModal()` gives you focus trapping and Esc-to-close for free.[^dialog] The dialog uses a system font so it's legible even if the pixel font is blurry.

## The actual test takes 5 minutes

Once you know the basic controls:

1. Turn on VoiceOver (Cmd+F5)
2. Navigate through your page with VO+Right
3. Try the Rotor (VO+U) to jump by headings and landmarks
4. Tab through interactive elements
5. Listen for anything that sounds wrong

I found more issues in 5 minutes of listening than I had in hours of visual inspection. Probably should have done this sooner.

[^shortcut]: I get that they can't use a simple single key because those are for typing. But surely there's something less awkward?
[^div-soup]: Looking at you, every React app I've ever worked on.
[^dialog]: I love that `<dialog>` just handles all the modal behavior correctly. No more fighting with focus traps and scroll locks.
