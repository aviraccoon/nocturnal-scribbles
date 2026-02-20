---
title: Technical Excellence Is Not Enough
date: 2026-02-20
tags:
  - work
  - career
  - dev
slug: technical-excellence-is-not-enough
description: A field guide to being right when it doesn't matter.
draft: false
---

Organizations don't optimize for correctness. They optimize for comfort. Not because of bad managers or stupid coworkers, but because that's how teams work.

You build the right thing. It gets validated. Then it gets overridden. Nobody disagrees with the technical argument, but accepting it costs more right now than ignoring it. Ignoring it costs more later, but later is someone else's problem.

I've watched this happen at every company I've worked at. Different teams, different bosses, different cultures, same pattern. The standard advice is always "communicate better, get buy-in, frame it differently." I've tried, and the outcomes don't change, because the problem isn't communication. It's structural.

Here are the mechanisms.

# Comfort Over Correctness

Fixing things creates disruption. Not fixing things is invisible until it breaks. Organizations pick invisible.

A code quality tool that tracks whether issues are accumulating or shrinking. One number, never measured before. It doesn't change rules or add warnings, just makes the existing count visible. One extra command when the count changes.

The person who admits they don't look at warnings votes against the tool.[^irony] It gets removed before the trial period starts. The warnings keep accumulating, nobody notices, because nobody was looking. That was the problem the tool solved.

The cost of a small disruption is immediate and obvious. The cost of not fixing things shows up months later as a bug, an outage, a pattern nobody can trace back to any one decision. Every individual choice to go with comfort is defensible. The accumulated result is nobody's fault specifically. It just happens.

Correctness wins when the cost of ignoring it becomes impossible to miss: an outage, a customer complaint, data loss. Until then, comfort wins every time. The person trying to prevent the outage is "adding process." The outage itself is "unexpected."[^unexpected]

When someone asks for your input before building ("does this approach seem reasonable?"), the same technical expertise that creates friction elsewhere becomes an asset. Compromises happen. Ideas improve. The difference isn't the people. It's the direction: being asked to evaluate vs. presenting something already built. One is collaboration. The other triggers the comfort reflex.

# Consensus As Veto

Improvement often requires buy-in from the people whose behavior would change. They vote against the change. The process designed to be fair becomes a wall.

The person who introduced the workaround votes against the clean solution. The person who doesn't follow quality standards votes against the tool that makes violations visible. They're protecting their current workflow, which makes sense for them individually. But improvement can't happen through consensus when the consensus group includes the people who'd have to improve.

"Discuss before shipping" sounds reasonable. In practice, when you're discussing with people who resist the category of change you're proposing, the outcome is predetermined. The discussion isn't evaluation, it's a veto dressed as process.[^process]

You notice this when the standard is applied selectively. The same people who required pre-approval for your small tooling change ship their own changes without discussion. The rule exists to slow down the unfamiliar, not to govern change in general.

When I had full autonomy over a project, it grew for years and got industry recognition. My idea, my execution, no approval chain, same person, same skills. The thing that makes me effective is the thing consensus processes kill: acting on technical judgment without waiting for permission from people who don't share it.

# Responsibility Without Authority

You're the person who understands the systems. When something breaks at night, you fix it. When an architectural decision needs making, your judgment is what the team relies on. But formally, your judgment carries no more weight than anyone else's vote. Often less, because proposing change is inherently uncomfortable for everyone else.

Someone reports a performance problem. You profile it, fix the bugs you find, and realize the real issue is architectural. So you build the architectural fix. Working prototype in a few hours. Your boss sees it, says he's sold, then tells you to spend a week debugging library internals instead. Not because he thinks you're wrong, but because he's not ready to absorb the change.

When you try to verify the reported symptoms before committing that week, you're told you're being dismissive. Asking questions about the problem reads as denying it exists.

The gap between responsibility and authority is where burnout lives. You own the consequences of bad decisions you can't prevent. When you try to prevent them, you're "creating friction." When you don't, the problems you predicted arrive on schedule and you fix them at 4 AM.

# Disproportionate Response

Reactions don't scale with the actual impact of a change. They scale with how uncomfortable it makes people.

A tool that adds one step to a build pipeline: multi-day conflict. A prototype on a hidden URL affecting nothing in production: "I can't evaluate this right now." A database field instead of a magic string: emoji vote, including from a non-programmer who prefers spreadsheets as a database.[^emoji]

The pushback tells you nothing about the size of the change. It tells you how much the status quo is valued. Small improvements get the same resistance as large ones, because the threat isn't the change itself. It's the precedent that things can be changed.

# The Prescription That Doesn't Work

The advice for this position is always the same: communicate better. Get buy-in. Frame it as their idea. Pick your battles. Show, don't tell.

I've tried all of these. Not casually. I've written case studies of my own communication patterns. Tried careful framing with historical context. Proposed explicit trial periods with exit criteria. Done live demos with hard data.

The framing was acknowledged and overridden. The trial was killed before it started. The demo convinced my boss, and he still chose the other path.

"Communicate better" assumes the problem is delivery. That a clearer message would produce a different outcome. But when your audience agrees with your message and still picks comfort, delivery isn't the issue. The outcome doesn't change no matter how you present it.

Most writing about this concludes either "I need better soft skills" or "my coworkers are idiots." Neither is right. The structure does this. Different people in the same positions would produce the same dynamic, and I know this because I've been in this position at multiple companies with completely different people. The pattern didn't change.[^softskills]

# The Nuance

Not every pushback is wrong. Bandwidth constraints exist. A manager who can't evaluate three architectural changes in one week isn't failing, they're managing their capacity.[^sold]

But when correct work gets validated then deprioritized across multiple teams and years, the individual justifications stop being the point. Each one is defensible on its own. The pattern is the signal.

The people involved are usually reasonable, acting in good faith, doing what works for them. The outcome is still that correct technical work keeps getting pushed aside, no matter who's in the room.

# What Changes It

Authority matching responsibility. That's the only fix I've seen work. Either you get decision-making power that matches the decisions you're already making, or you find a place that treats your judgment as an asset instead of something to manage.

If you're in this position (relied upon, validated, powerless), you're not imagining it. And it's not a communication problem. "Just communicate better" is the advice equivalent of "have you tried not being depressed?"

[^irony]: The argument about whether to track warnings motivated someone on the team to start fixing warnings. A multi-day team conflict accomplished what the tool would have done quietly in CI.
[^unexpected]: It's never unexpected to the person who tried to prevent it. But they've already been told to stop "adding process," so they just fix it at 4 AM and don't say anything.
[^process]: Bonus points if someone cites their process certification while arguing against a one-step process change.
[^emoji]: Architecture by reaction emoji. Democracy in action.
[^sold]: What IS a problem is validating work and then overriding it. "I'm sold on this, but do the other thing first" is worse than just disagreeing. It tells you your judgment is correct and irrelevant at the same time.
[^softskills]: The "soft skills" framing is wild. You're supposed to learn to communicate your way out of a structural problem. Like taking a public speaking class to fix a broken org chart.
