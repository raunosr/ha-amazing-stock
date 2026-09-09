# Changelog

## 0.1.1

- Fix the default grid height in Home Assistant's Layout editor: the card now requests eight rows. Previously it requested twelve, while the editor's eight-row picker clipped the displayed value, leaving the preview taller than the apparent setting.
- Keep a readable, shorter chart and a scrollable list at the default grid height. Redraw chart geometry when height changes; only very short cards hide the graph.
- Add regression coverage for HA's grid-picker limits, default height, phone layout, long names and themed line spacing.

## 0.1.0

- Initial provider-independent UI card, visual editor, recorder charts and scrolling watchlist.
