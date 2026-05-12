---
layout: home

hero:
  name: NNRP
  text: Neural Network Runtime Protocol
  tagline: Real-time AI runtime protocol docs, protocol guides, and preview design drafts
  actions:
    - theme: brand
      text: 简体中文
      link: /zh/
    - theme: alt
      text: English
      link: /en/

features:
  - title: Protocol-first
    details: Read NNRP as a real-time AI runtime protocol, not as a generic RPC layer or a media-stream replacement.
  - title: Reader-oriented
    details: Start from concepts, packet structure, and profiles before diving into preview-specific freeze points.
  - title: Versioned
    details: Follow the preview design track, compatibility windows, and the active NNRP/1 protocol entry separately.
---

## What this site contains

This site is the canonical documentation entry for NNRP. It is organized around three layers:

1. Global concepts and protocol guides.
2. Active protocol entry points and compatibility boundaries.
3. Preview-stage design drafts that record the protocol evolution path.

<div class="doc-grid">
  <div class="doc-card">
    <h3>Start from protocol guides</h3>
    <p>Use the language homepages to enter the background, use cases, core objects, common header, typed payload descriptors, and standard profiles.</p>
  </div>
  <div class="doc-card">
    <h3>Track the public contract</h3>
    <p>Use the protocol section to see the active NNRP/1 preview entry, operation model, transport strategy, and compatibility window.</p>
  </div>
  <div class="doc-card">
    <h3>Read design history separately</h3>
    <p>Use the design section when you need frozen preview scopes, design tradeoffs, and version-by-version evolution context.</p>
  </div>
  <div class="doc-card">
    <h3>Stay bilingual</h3>
    <p>Chinese and English trees are both first-class. The root page stays lightweight and directs readers into the correct language branch.</p>
  </div>
</div>

## Start here

1. [Documentation Overview](/en/)
2. [Quick Start](/en/protocol/v1/quick-start)
3. [Versions and Compatibility](/en/protocol/)
4. [Design Index](/en/design/)

## Current documentation focus

The current documentation set is centered on the NNRP/1 preview track:

1. Public runtime semantics such as sessions, operations, budgets, result states, and compatibility boundaries.
2. Stable wire structures such as the 40-byte common header, typed payload descriptors, and standard profile building blocks.
3. Preview evolution topics such as transport probing, async submit/result session semantics, and canonical multi-language SDK direction.

If you are new to NNRP, enter through the language homepages first. If you are validating wire behavior or implementation boundaries, jump directly to the protocol and design sections.
