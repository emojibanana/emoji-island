# UI Overhaul Backlog — Emoji Island v2 Experience

Status: backlog, not approved for implementation before M3/M4.

## Goals
- Make island feel more like a glanceable HUD, not just a panel with tabs.
- Reduce reliance on hotkey.
- Keep Clock & Weather always visible.
- Make Media more expressive in collapsed state.
- Make Files drop behavior more obvious.

## Proposed behavior
1. Window modes:
   - hidden: menyatu dengan Windows / tidak terlihat atau minimal presence
   - collapsed: hover preview / glanceable
   - expanded: full interaction

2. Trigger:
   - hover enters collapsed
   - click/press expands
   - external action such as file drop expands to Files
   - hotkey may be removed or demoted

3. Layout:
   - Clock & Weather becomes persistent header
   - Tabs become secondary content switcher
   - Default tab: Music
   - Tabs: Music, Files, AI, Settings

4. Collapsed widget:
   - artwork if media active
   - clock
   - subtle music wave / activity indicator

5. Music tab:
   - progress bar
   - current time / total time
   - controls
   - artwork

6. Adaptive height:
   - expanded height may vary by tab/content

7. Files behavior:
   - dropping file auto-expands and switches to Files tab

## Open questions
- Is hover-to-collapse acceptable for an always-on-top overlay?
- Should hotkey be removed completely or kept as accessibility fallback?
- Can Windows SMTC reliably provide position/duration for all target media apps?
- Should adaptive height be owned by main process only?
- How does this affect D-009/D-010/D-011/D-014?
- How does AI Chat and Settings fit into persistent header layout?