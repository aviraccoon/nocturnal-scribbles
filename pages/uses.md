---
title: "What I use"
slug: uses
description: "Hardware, software, and tools I actually use."
---

# Hardware

- **MacBook Pro M4 Pro** - 48GB RAM. Main machine for everything.
- **MacBook Pro M1** - 16GB RAM. Previous machine, will probably become a home server.
- **iPhone 15 Pro**
- **AirPods Pro 2**
- **Steam Deck** - Portable gaming, actually gets used
- **Xbox Series X** - Main console
- **Nintendo Switch** - Portable/couch gaming

Gathering dust: PS4 Pro, PS Vita, Oculus Quest 1.

All devices are named after raccoons and other "forbidden cats" - nocturnal creatures that look like cats but aren't. The MacBook is `procyonid-trailblazer`, the iPhone is `titanium-trashcan`, the Steam Deck is `paws-on-deck`, the AirPods are `rhythm-robber`.

# Software

- **Claude Code** - Where I spend most of my time. Coding, writing, thinking.
- **Kagi** - Search engine. Trying to avoid Google where I can.
- **Orion** - Main browser. WebKit-based, supports Chrome and Firefox extensions. Same folks who make Kagi.
- **Cursor** - IDE when I need one
- **Obsidian** - Personal vault for journaling, patterns, life management
- **Warp** - Terminal, though looking for something less AI-focused. I like the command blocks and output filtering, but want simpler.
- **Discord**, **Telegram** - Where I talk to people
- **1Password** - Password manager and secrets management
- **Raycast** - App launcher
- **rcmd** - Quick app switching with Right Cmd + letter
- **OrbStack** - Docker alternative
- **Bruno** - API client for work
- **TablePlus** - Database client for work

# CLI tools

My system has 100+ CLI tools installed via nix - fd, ripgrep, jq, lazygit, and many others. Honestly, they're mostly used by LLMs assisting me rather than typed manually. The AI knows what's available and uses the right tool for the job.

# Infrastructure

- **Hetzner dedicated server** - Arch Linux, running Podman containers. Hosts Jellyfin, Immich, and other self-hosted services.
- **Tailscale** - Mesh VPN connecting all devices. Private services only accessible over the tailnet.
- **Mullvad** - VPN through Tailscale. Used rarely but useful.
- **NextDNS** - DNS filtering and privacy.
- **raccoon.land** - Personal domain for public and private services.

# System configuration

Everything is declaratively managed with [nix-darwin](https://github.com/LnL7/nix-darwin) and [Lix](https://lix.systems/). One command rebuilds the entire system from config files.

The source of truth is [on GitHub](https://github.com/aviraccoon/system).

This blog runs on a [custom static site generator](https://github.com/aviraccoon/nocturnal-scribbles).

Last updated: January 2026
