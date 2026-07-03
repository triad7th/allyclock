# AllyClock App Icon Design

## Decision Summary

AllyClock will use a warm, analog clock icon with a restrained modern treatment. The approved design is the **Refined Classic** direction at the largest tested scale: the clock occupies 77% of the icon width.

The icon should feel related to AllyFast and AllyMetronome through bold rounded construction, a clearly recognizable object, and confident color blocking. It should not copy AllyFast's palette or mascot language.

## Goals

- Read immediately as a clock at home-screen, app-picker, and favicon sizes.
- Feel warm and approachable without using a face or character.
- Match AllyClock's sleek, dark interface while retaining an inviting analog object.
- Feel like an Ally-series app through visual attitude rather than a shared template.
- Remain legible on iOS, the Web, and small browser favicons.

## Non-Goals

- Do not include a smile, eyes, people, or other anthropomorphic details.
- Do not reuse AllyFast's orange/cyan palette as a family-brand requirement.
- Do not turn the primary symbol into a digital display or seven-segment numeral.
- Do not add schedule segments, text, letters, or multiple clocks.
- Do not make the clock photorealistic, heavily skeuomorphic, or antique-looking.

## Visual Construction

### Background

- Use a full-bleed deep teal field with a subtle diagonal tonal shift.
- Use gradient endpoints `#416F76` and `#244D56`.
- The background should feel calm and dark, but remain visibly teal rather than reading as black.
- iOS artwork must remain a full square without baked-in transparent corners; the operating system applies the icon mask.

### Clock Body

- Center a circular analog clock at 50% of the canvas width and 48.3% of the canvas height to accommodate its small lower shadow.
- Set the outer clock diameter to 77% of the square canvas: 788 px on the 1024 px master.
- Use a shallow, soft lower shadow. Avoid multiple bevel layers or a deep mechanical housing.
- Use a near-black outer body (`#10171A`) with a thin warm-metal inner keyline (`#B58A4E`). The warm line is an accent, not a thick brass bezel.

### Dial and Indices

- Use a warm ivory dial (`#F5F0E5`) to preserve approachability against the dark teal field.
- Use four strong rounded indices at 12, 3, 6, and 9.
- Use thin, simple intermediate indices. Keep all marks geometric and consistent; do not use decorative numerals.
- Preserve ample space between the indices, hands, and rim at favicon scale.

### Hands

- Use broad, rounded near-black hour and minute hands (`#22262A`).
- Set the display near 10:08 for a balanced, energetic silhouette without creating a face.
- Use a thin coral-red seconds hand and hub (`#C85F50`) as the single lively accent.
- Keep the central pin simple and flat.

## Style Balance

The analog object provides recognition and warmth. Modernity comes from flatter depth, a thin bezel, disciplined geometry, and the dark teal field. The final icon should feel like a contemporary product rendering of a classic clock—not a vintage clock illustration and not a futuristic digital interface.

## Required Assets

- One editable vector master using the approved geometry and palette.
- iOS: 1024×1024 universal AppIcon artwork. The initial implementation uses the same artwork for default, dark, and tinted appearances; custom appearance variants are out of scope.
- Web: 512×512 app icon, 180×180 Apple touch icon, and 32×32 plus 16×16 favicon renderings.
- Raster exports should be generated from the vector master rather than independently redrawn.

## Validation

- Compare the final icon beside AllyFast and AllyMetronome: it should feel related without appearing templated.
- Inspect at 1024, 180, 64, 32, and 16 px.
- At 16 px, the teal field, ivory dial, dark hands, and coral center should remain distinguishable; intermediate indices may simplify or disappear cleanly.
- Check against light and dark home-screen wallpapers and browser chrome.
- Verify the iOS icon stays within Apple's automatic masks without important details approaching the corners.
- Confirm Web exports have the expected dimensions and that the favicon remains recognizable.
