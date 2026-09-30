# Interface design principles

OpenAmbience should make the frequent listening actions easy to reach and keep browsing understandable on small screens.

## Player hierarchy

- **Primary action:** the prominent play/pause button controls playback immediately.
- **Frequent adjustment:** volume and mute remain visible in the player, so changing loudness needs no extra panel.
- **Secondary actions:** a three-dot **Mix options** button opens the current mix's sleep timer, save form, and clear action.
- **Navigation:** Sound library and My mixes remain visible. Category choices live in a collapsible Filters section; its header always identifies the active category and current result count.

The three-dot icon communicates additional actions associated with the current mix. A hamburger suggests a navigation drawer; placing one in the playback bar could imply hidden app destinations. A settings gear would suggest broader application preferences, and a sliders icon would suggest the mixing controls already visible in the library/player. The contextual options icon fits this panel's actual contents.

## Icon behavior and accessibility

The options button uses an original 24px SVG inside a 48×48px target, consistent with the player's simple icons. It keeps a visible keyboard focus indicator, the accessible name “Mix options,” a tooltip naming its actions, and an explicit relationship to the dialog. The dialog heading uses the same name. Native dialog behavior provides Escape dismissal and returns focus to the opener.

This remains a dialog containing form controls, so it is announced as a dialog rather than an ARIA menu. Icon-only styling does not remove the control's accessible name. See the [WAI button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) and [accessible naming guidance](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/). The navigation distinction is consistent with the [Material drawer pattern](https://api.flutter.dev/flutter/material/Drawer-class.html); choosing the contextual icon here is a project design decision.

Use icon-only controls where their action is familiar and space is limited. Keep descriptive text for sound names, category navigation, saving, and destructive actions. Future application-wide settings should have a separate destination instead of accumulating unrelated controls in Mix options.

## Filters disclosure

The Filters section starts collapsed to give the sound cards more room on phones. Expanding it reveals a single-choice category group with counts and a Clear filters action. Choosing a category keeps the section open, so keyboard focus stays on the selected control and users can compare categories. Closing it preserves the selection; the active category also survives reloads. Clear filters resets both the category and search text.

Native `details`/`summary` and radio inputs provide disclosure and single-choice semantics. Radio rows have at least 44px touch height; the selected category is visible both in the group and collapsed summary. This keeps library filtering separate from the player's Mix options panel.
