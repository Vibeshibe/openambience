# Interface design principles

OpenAmbience should make the frequent listening actions easy to reach and keep browsing understandable on small screens. Sound cards sort alphabetically within each category, with case-insensitive natural ordering. Cards align at the top and keep their natural height so controls in one card do not stretch its neighbors.

## Player hierarchy

- **Primary action:** the prominent play/pause button sits at the center of the player and controls playback immediately.
- **Frequent adjustment:** a circular speaker button to the right of Play opens a vertical slider, large percentage, and mute/unmute action.
- **Secondary actions:** a circular three-dot **Mix options** button to the left of Play opens the current mix's sleep timer and separate Save mix, Share / download mix, and Clear actions. Saving opens a compact naming dialog.
- **Navigation:** Sound library and My mixes remain visible. Category choices live in a collapsible Filters section; its header always identifies the active category or number of selected categories and current result count.

The three-dot icon communicates additional actions associated with the current mix. A hamburger suggests a navigation drawer; placing one in the playback bar could imply hidden app destinations. A settings gear would suggest broader application preferences, and a sliders icon would suggest the mixing controls already visible in the library/player. The contextual options icon fits this panel's actual contents.

## Icon behavior and accessibility

The options button uses an original 24px SVG inside a 44×44px circular target, consistent with the player's simple icons. It keeps a visible keyboard focus indicator, the accessible name “Mix options,” a tooltip naming its actions, and an explicit relationship to the dialog. The dialog heading uses the same name. Native dialog behavior provides Escape dismissal and returns focus to the opener.

This remains a dialog containing form controls, so it is announced as a dialog rather than an ARIA menu. Icon-only styling does not remove the control's accessible name. See the [WAI button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) and [accessible naming guidance](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/). The navigation distinction is consistent with the [Material drawer pattern](https://api.flutter.dev/flutter/material/Drawer-class.html); choosing the contextual icon here is a project design decision.

Use icon-only controls where their action is familiar and space is limited. Keep descriptive text for sound names, category navigation, saving, and destructive actions. Future application-wide settings should have a separate destination instead of accumulating unrelated controls in Mix options.

## Saved mixes and portable mix dialogs

My mixes begins with paired Save current mix and Import mix ZIP controls, followed by a responsive grid of saved cards. Each card shows its name, sound names, layer count, and selected timer duration. Its footer has separate Load mix and Share buttons plus a 44px three-dot details button. The name also loads the mix. Cards use one column on phones, two on tablets, and three on wider screens, with aligned action rows.

The details dialog contains a name field and Save name action, followed by Replace with current mix and Make a copy. Delete saved mix has its own separated, muted red control at the bottom. Replacement and deletion show an in-app confirmation naming the affected mix; Cancel receives initial focus. Canceling returns to the details dialog. Confirmed deletion removes only the saved recipe. Rename and copy restore focus to the relevant card's details button; deletion focuses a remaining mix or the save action.

Save your mix is a separate compact dialog with a summary, name field, Cancel, and Save mix. Mix options keeps its timer near the current-selection summary; Save and Share are full-width action rows beneath it, and Clear has a separated footer. This keeps the naming form from stretching the options panel. Save current mix in My mixes opens the naming dialog directly.

Save, details, confirmation, sharing and restore dialogs share a 460px desktop width, consistent headings, 44px close targets, field spacing, and paired footer buttons. On phones they sit above the bottom edge with 12px side insets and rounded corners; height is bounded by the dynamic viewport and long content scrolls. Long mix names wrap inside confirmations and cards. Share actions stack at the narrowest widths. Form text uses 16px to avoid focus zoom on mobile Safari. Inline feedback occupies space only when there is a message. These layout rules support short landscape windows as well as portrait phones; physical-device and assistive-technology validation remain separate.

## Player text and feedback

The resting player shows only its three controls. Sound selection count and sleep countdown live in Mix options alongside the timer. Routine play/pause messages remain available to screen readers. Other action feedback appears in a bordered, dismissible notice above the player and is also copied into Mix options. Opening the volume popout clears the visible notice so it cannot cover the slider.

All mix success feedback uses one shared nonmodal component in `js/feedback.js`: presets, saved mixes, saves, copies, renames, updates, deletions and link/ZIP restoration. Successes show a compact, content-sized confirmation with a checkmark and a 44px close target. They fade out after five seconds. Hover or keyboard focus pauses dismissal; leaving restarts the delay. Reduced-motion preferences skip the animation. Status/error messages remain persistent and cancel any pending success dismissal. Manual dismissal returns focus to the action that opened the notice when it is still available, or to Play. Opening the volume popout hides the notice and cancels its timer through the same component.

Preset and saved-mix selection share `loadMix` in `app.js`, including normalization, playback updates, countdown display and the success announcement. Presets retain current master volume and timer settings, including an active countdown; saved mixes load their own settings and restart their selected timer duration if already playing. Link and ZIP restoration commit storage atomically before announcing through the same feedback component. Loading feedback does not open a blocking dialog.

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

## Dropped files and storage management

A file drag reveals a pointer-transparent overlay. Over an open dialog, a dashed outline also identifies the drop state. Audio batches enter Add your sounds with a category and filename summary; a single ZIP enters Restore a mix. Both wait for the normal confirmation and use the picker validation paths. Mixed batches, folders, in-progress operations and unrelated open editing dialogs receive an explanation without changing stored data or closing the editing form.

Manage storage is a footer action and is linked from Add your sounds. The dialog uses the same mix-dialog language, with two summary cards, browser estimates, optional retention protection and a recording list. Its heading and close button remain available while the list scrolls. Each recording has metadata, an expandable saved-mix reference list, Download and Remove. The removal dialog lists affected mixes and requires an unchecked-by-default acknowledgement to remove selected layers. Cancel/Keep sound returns to the storage manager when that was the entry point. No destructive bulk action is offered. The [storage guide](storage-management.md) records behavior and browser limits.


## Updates without interruption

A waiting update appears as a bordered green card below the header, using the app's normal colours. It has no modal backdrop, animation, or automatic focus change. The copy reads “A new version is ready” and “Update whenever you feel like it. We’re ready when you are.” The card explains that updating will pause audio.

Update & reload pauses playback and activates the waiting version; the reloaded app keeps the saved selection and volume but does not autoplay. Later dismisses the card for the current visit and focuses a 44px square bell button in the header, named Update available for assistive technology. A red dot pulses softly to remind users of the waiting update; with reduced motion it stays still. That button reopens the card and focuses Update & reload. A different waiting update may show the card again.

An update activated in another tab removes stale update notices without pausing or reloading this tab. First-time installation does not show an update card. Browser-managed activation after all old tabs close remains normal service-worker behavior.


## Binaural layer

Binaural beats have their own category with eight preset cards: 2, 4, 6, 8, 10, 14, 20, and 30 Hz. A searchable band label accompanies each card: Delta (2), Theta (4/6), Alpha (8/10), or Beta (14/20/30). Each has the standard toggle and volume controls plus a short, searchable suggested listening use, such as winding down before sleep, relaxation, or focused work. A compact Stereo headphones tag appears once beside the Binaural beats heading, or beside the current category heading when a single filter hides the group headings. The tag disappears when no binaural cards are visible. Card controls reference the shared reminder and their own description for assistive technology; there is no frequency dropdown. The listening suggestions are editorial starting points, not established effects of particular frequencies. Labels describe the signal settings without promising an outcome. Older saved mixes using these frequencies migrate to the matching preset. All previously supported frequencies now have matching cards. The Saved binaural compatibility card remains available if a supplied catalog lacks the matching preset.
