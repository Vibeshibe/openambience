# Interface design principles

OpenAmbience should make the frequent listening actions easy to reach and keep browsing understandable on small screens.

## Player hierarchy

- **Primary action:** the prominent play/pause button sits at the center of the player and controls playback immediately.
- **Frequent adjustment:** a circular speaker button to the right of Play opens a vertical slider, large percentage, and mute/unmute action.
- **Secondary actions:** a circular three-dot **Mix options** button to the left of Play opens the current mix's sleep timer, save form, and clear action.
- **Navigation:** Sound library and My mixes remain visible. Category choices live in a collapsible Filters section; its header always identifies the active category or number of selected categories and current result count.

The three-dot icon communicates additional actions associated with the current mix. A hamburger suggests a navigation drawer; placing one in the playback bar could imply hidden app destinations. A settings gear would suggest broader application preferences, and a sliders icon would suggest the mixing controls already visible in the library/player. The contextual options icon fits this panel's actual contents.

## Icon behavior and accessibility

The options button uses an original 24px SVG inside a 44×44px circular target, consistent with the player's simple icons. It keeps a visible keyboard focus indicator, the accessible name “Mix options,” a tooltip naming its actions, and an explicit relationship to the dialog. The dialog heading uses the same name. Native dialog behavior provides Escape dismissal and returns focus to the opener.

This remains a dialog containing form controls, so it is announced as a dialog rather than an ARIA menu. Icon-only styling does not remove the control's accessible name. See the [WAI button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) and [accessible naming guidance](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/). The navigation distinction is consistent with the [Material drawer pattern](https://api.flutter.dev/flutter/material/Drawer-class.html); choosing the contextual icon here is a project design decision.

Use icon-only controls where their action is familiar and space is limited. Keep descriptive text for sound names, category navigation, saving, and destructive actions. Future application-wide settings should have a separate destination instead of accumulating unrelated controls in Mix options.

## Player text and feedback

The resting player shows only its three controls. Sound selection count and sleep countdown live in Mix options alongside the timer. Routine play/pause messages remain available to screen readers. Other action feedback appears in a bordered, dismissible notice above the player and is also copied into Mix options. Opening the volume popout clears the visible notice so it cannot cover the slider.

## Volume popout

The player contains three circular buttons in the order Options, Play, Volume. The group is centered, placing the 52px Play button at the horizontal center of the screen. Options and Volume use smaller 44px circles, aligned to the same vertical center. The speaker icon opens a compact panel above it, with a 30px percentage above a vertical slider. Keeping the value away from the thumb makes it easier to read during touch adjustment. Mute/unmute sits beneath the slider and restores the last audible level without pausing playback. The speaker icon reflects the muted state.

The native range runs from zero at the bottom to 100 at the top. It has a 48px-wide interaction area; its height shrinks for short landscape screens. Opening focuses the slider. Arrow Up/Down adjust by one, Home/End select the limits, Escape closes and returns focus, and tapping elsewhere or moving focus out closes the panel. The speaker button exposes its expanded state and current percentage in its accessible name. This is a nonmodal group: Tab reaches Mute, then continues out of the panel.

## Filters disclosure

The Filters section starts collapsed to give sound cards more room on phones. Expanding it reveals category checkboxes with counts and a Clear filters action. Checked categories combine inclusively: Weather plus Water shows sounds from either category, and overlapping matches appear only once. No checked categories means all categories are included. Search narrows the combined results.

Checking a category keeps the section open so users can select more. Closing it preserves the selections, and the header shows the selection and result counts. Selections survive reloads; the prior single-category preference migrates automatically. Clear filters resets all checkboxes and search text. There is no competing “All sounds” checkbox, because an empty selection already includes everything.

Native `details`/`summary` and checkbox inputs provide disclosure and multi-selection semantics. Each checkbox row has at least 44px touch height. This keeps browsing filters separate from the player's Mix options panel.

## Uploaded sounds: category and origin

Category describes a sound; the Uploaded tag identifies where it came from. An uploaded wave recording assigned to Water appears alongside the built-in stream and ocean recordings. Its text badge distinguishes it without relying on colour or a separate library. My sounds remains a shortcut to every imported recording, across categories; combining that shortcut with another category uses the same inclusive filtering as other checkboxes.

The Add sounds dialog collects files and their category before import. Browsing a single assignable category suggests that choice; other views start at Uncategorized. The category applies to the batch and remains editable on each card. Successful imports reveal the chosen category and clear search so the new recordings are visible. Invalid or duplicate files leave an explanation in the dialog.

The Uploaded badge means imported from the device, not sent to a server. The dialog and badge tooltip make local/offline storage explicit. Existing imported files receive the same tag automatically, using their saved metadata and stable IDs.


## Updates without interruption

A waiting update appears as a bordered green card below the header, using the app's normal colours. It has no modal backdrop, animation, or automatic focus change. The copy reads “A new version is ready” and “Update whenever you feel like it. We’re ready when you are.” The card explains that updating will pause audio.

Update & reload pauses playback and activates the waiting version; the reloaded app keeps the saved selection and volume but does not autoplay. Later dismisses the card for the current visit and focuses a small Update available button in the header. That button reopens the card and focuses Update & reload. A different waiting update may show the card again.

An update activated in another tab removes stale update notices without pausing or reloading this tab. First-time installation does not show an update card. Browser-managed activation after all old tabs close remains normal service-worker behavior.
