# UI/UX Design Principles

> **Status:** Draft baseline v0.5  
> **Scope:** Web application, Phase 1, light mode only  
> **Authority:** This file is the source of truth for UI and UX decisions. All pages and components must comply unless an exception is documented.

## 1. Core principles

The product must be clear, consistent, efficient, accessible, responsive, Bosch brand compliant, and suitable for data-dense workflows.

- Reuse an approved component before creating a new one.
- Do not introduce arbitrary colours, spacing, typography, icon styles, radii, shadows, or component variants.
- Use design tokens rather than raw visual values wherever approved tokens exist.
- Phase 1 supports light mode only. Dark mode, theme switching, and theme persistence are excluded.

## 2. Token architecture

Use the Bosch token hierarchy:

1. **Core tokens:** raw colour, typography, spacing, radius, elevation, and z-index values.
2. **Semantic tokens:** meaning-based roles such as text, background, action, and status.
3. **Component tokens:** component-specific definitions that reference semantic tokens.

Components must not depend directly on core tokens. Custom components should consume semantic or component tokens.

## 2.1 Evidence and non-invention policy

- Consume current Bosch colour variables through FROK or the Bosch design-token repository instead of manually copying values.
- Treat Major, Minor, and Pure as colour-scheme types, not as universal rules that automatically map every selected, error, or focus state.
- Do not claim an exact token name unless its literal style key is available in the source or installed library.
- Do not treat Floating Outline as the keyboard focus-visible indicator. Floating Outline belongs to overlay-layer styling. Keyboard focus-visible behaviour must follow the applicable component and accessibility guidance.
- Do not create a numerical or conceptual z-index sequence and label it as Bosch-defined when the source provides no order.
- When the guidance contains no value, record `Not specified in the retrieved Bosch guidance` and leave the decision pending.

## 3. Page structure

Use this order:

1. Skip-to-main-content link
2. Header
3. Primary or local navigation
4. Breadcrumbs when hierarchy exceeds one level
5. Page title and optional description
6. Contextual actions
7. Main content
8. Feedback and validation messages
9. Footer

Keep global branding and navigation consistent. Use one footer at the bottom. Establish one clear primary purpose and primary action per page.

## 4. Responsive grid

- Use a 12-column grid on tablet and desktop.
- Use a 4-column grid on mobile.
- Default gutter: 32 px / 2rem.
- Small-screen margin: 16 px.
- Large-screen margin: 32 px minimum.
- Normal content stays on-grid. Off-grid and overflow require a functional reason.
- Design mobile first, reflow before truncating, and never hide essential actions.

| Viewport | Width | Maximum content | Columns |
|---|---:|---:|---:|
| Small | 320–599 px | 567 px | 4 |
| Medium | 600–1195 px | 1163 px | 12 |
| Large | 1196–1399 px | 1132 px | 12 |
| Extra large | 1400–1920 px | 1132 px | 12 |

## 5. Spacing

Use approved spacing tokens only.

| Token | Value |
|---|---:|
| `space-1` | 4 px |
| `space-2` | 8 px |
| `space-3` | 12 px |
| `space-4` | 16 px |
| `space-6` | 24 px |
| `space-8` | 32 px |
| `space-12` | 48 px |
| `space-16` | 64 px |
| `space-24` | 96 px |

Use less space inside a group than between groups. Keep repeated component spacing identical.

## 6. Typography

Use locally hosted Bosch Sans. Do not use public font CDNs.

- Supported weights: Regular 400 and Bold 700.
- Default body: Text M Regular, 16 px font, 24 px line height.
- Default headings: H1 Text 4XL Bold, H2 Text 3XL Bold, H3 Text 2XL Bold, H4 Text XL Bold, lower heading Text L Bold.
- Semantic HTML heading order and visual text size are separate. Preserve correct semantic order.
- Use sentence case. Uppercase is limited to approved abbreviations and proper names.
- Italic may be used for quotations. Code uses a monospaced font.

| Token | Font size | Line height |
|---|---:|---:|
| S | 12 px | 18 px |
| SM | 14 px | 22 px |
| M | 16 px | 24 px |
| L | 20 px | 30 px |
| XL | 24 px | 34 px |
| 2XL | 32 px | 43 px |
| 3XL | 40 px | 52 px |
| 4XL | 48 px | 60 px |
| 5XL | 64 px | 77 px |
| 6XL | 80 px | 92 px |

## 7. Icon library and sizing

- Use the Bosch Icon Library only. Do not mix third-party icon families.
- Icons are interaction and accessibility elements, not decorative filler.
- Use a visible label when meaning may be unclear. Icon-only controls require an accessible name and, where useful, a tooltip.
- Keep left or right placement consistent within the same component type.
- For text-paired icons: `icon size = font size × line height`.
- Use icon line-height `1`.
- Use `(font size × line height) / 3` for icon-to-label distance.

| Text token | Icon size | Label distance |
|---|---:|---:|
| S | 18 px | 6 px |
| SM | 22 px | 7 px |
| M | 24 px | 8 px |
| L | 30 px | 10 px |
| XL | 34 px | 11 px |
| 2XL | 43 px | 14 px |
| 3XL | 52 px | 17 px |
| 4XL | 60 px | 20 px |
| 5XL | 77 px | 25 px |
| 6XL | 92 px | 30 px |

## 8. Colour

- Phase 1 uses Bosch light mode only.
- Consume approved colour tokens. Do not hard-code hex values in components.
- Use the documented schemes Base, Accent, Plain, Integrated, Emphasis, and Signal with the applicable Major, Minor, or Pure types. Do not infer a state-to-type mapping that is not explicitly documented.
- Use the Primary Background for charts and overlay surfaces. Do not create a Floating Background colour.
- Support default, hovered, pressed, and disabled variants where defined.
- Colour must not be the only indication of meaning, state, validation, or selection.
- Use Signal only for semantic status communication and apply accessible labels or icons.
- Use the approved token names exposed by the current Bosch UI Kit or Frontend Kit. The retrieved guidelines do not provide a complete literal token-name list or numerical palette values, so these must not be invented or duplicated manually.

## 9. Borders, radius, shadows, and elevation

### Border radius

- Use only Bosch radius tokens: `0`, `1`, `2`, `4`, and `pill`.
- Select radii through semantic or component tokens.
- Do not introduce arbitrary radius values.

### Borders

- Use approved border tokens for boundaries, separation, input state, or selection.
- Do not use decorative borders without functional meaning.
- A normal border does not replace a visible keyboard focus indicator. Floating Outline is an overlay treatment and must not be documented as the keyboard focus-visible rule.

### Shadows

- Shadows are only for UI that overlays other content, including tooltips, popovers, menus, toasts, and dialogs.
- Same-level content, including cards and dashboard widgets, does not use shadows.
- Use `S` for close overlays, `M` for slightly distant overlays, and `L` for far overlays.
- Floating Outline is mandatory for every overlay, regardless of shadow size.
- The retrieved guidelines do not provide numerical shadow, Floating Outline, border-width, or z-index values. Consume the values from the approved Bosch UI Kit or Frontend Kit rather than defining project-specific numbers.

The retrieved guidance does not provide an official numerical z-index scale or a complete ordering among Header, Sticky elements, Side Navigation, Dropdown, Menu, Tooltip, Popover, Backdrop, Dialog, Toast, and critical notifications. Do not assign an order and call it Bosch-defined until the official values are available.

## 10. Components

- Prefer Bosch UI Kit or Frontend Kit components.
- Every component defines purpose, anatomy, variants, states, responsiveness, keyboard behaviour, and content rules.
- Do not use chips as tab navigation.
- Use one primary action per page section or dialog.
- Buttons use specific action labels such as `Save changes`, `Upload file`, or `Continue`.
- Destructive actions require clear styling and confirmation when difficult to reverse.
- Form fields use persistent visible labels, useful help text, error recovery, and preserved valid input.
- Dialogs are for short focused decisions or tasks, not long workflows.

Every interactive component must define default, hover, focus-visible, active, selected, disabled, loading, success, warning, and error states where applicable.

## 11. Dashboards and tables

- Dashboard widgets are based on the approved Card component.
- Every widget has a name and context menu.
- A widget may contain a table, chart, combined table and chart, or KPI bar.
- Desktop and tablet widget widths may be 12/12 or 6/12. Mobile widgets are 4/4.
- KPI bars span 3/12 on desktop, 6/12 on tablet, and 4/4 on mobile.
- Large widget content padding: 1.5rem.
- Small widget content padding: 1rem 0.75rem.
- Large widget title: Text L Bold. Small widget title: Text M Bold.
- Dashboard cards do not use shadows.
- Align numeric data consistently and format units consistently.
- Sorting and filtering are included only when they support a real task.
- Show active filters and preserve context when opening details and returning.
- Define loading, empty, no-match, partial, error, and success states.
- Horizontal table scrolling is allowed only when columns cannot be responsibly reduced.
- The retrieved guidelines do not define exact table row heights or density levels. Until official values are available, do not claim Bosch-standard numeric row heights. Any temporary project choice must be documented as a project decision.

## 12. Charts and data visualisation

### Usage and structure

- Use charts to visualise dense and complex information.
- Display charts within dashboard Cards or Widgets and only on the Primary Background.
- A chart may optionally include a Context Menu, Filter, and Legend.
- Supported documented chart anatomy includes Title, Context Menu, Target Value, Column Label, Legend, and Error or Warning indication.
- The retrieved component guidance documents column charts. A column chart may be combined with a grid, a legend, or both.
- Do not claim other chart types as Bosch-approved unless their specific component guidance is available.

### Column-chart behaviour

- Selecting a column opens a Popover with detailed values for that column.
- While the Popover is open, other columns fade to 20% opacity.
- When a column value exceeds or falls below the configured Target Value, show an Error or Warning icon above that column.
- A legend may show or hide information when its corresponding label is selected.
- The Y-axis must always extend beyond the maximum column value.

### Column-chart dimensions

**Large**

- Column width: 1.5rem.
- Column horizontal margin: 2.1875rem.
- Chart-box top padding: 1.5rem.
- X-value minimum height: 1.5rem with 0.5rem top padding.
- X-label: Text S Regular, centred, width 5.875rem.

**Medium and small**

- Column width: 1rem.
- Column horizontal margin: 1rem.
- Chart-box top padding: 0.5rem.
- Medium X-value minimum height: 1.5rem.
- Small X-value minimum height: 2rem, with 0.5rem top and 0.375rem bottom padding.
- X-label: Text S Regular, centred, width 3rem.
- Small charts may use a horizontal scrollbar with 1rem height and 1.5rem top and bottom margins.

**Shared axis and legend rules**

- Horizontal and vertical divider thickness: 0.0625rem.
- Y-value area minimum width: 2.875rem.
- Axis labels: Text S Regular.
- Legend area height: 2rem.
- Legend marker: 0.75rem × 0.75rem with 0.5rem spacing to its label.
- Legend label: Text S Regular.

### Popover dimensions

- Popover maximum width: 7rem.
- Popover padding: 1rem 0.75rem.
- Popover label: Text S Bold.
- Validation icon height: 1rem.
- Use the current Primary Background equivalent for the Popover surface. The older chart component document refers to Floating Background, but the newer Digital Color System removed that category.

### Responsive behaviour

- Desktop: 12-column grid.
- Tablet: 12-column grid.
- Mobile: 4-column grid.

### Colour limitation

- Use current Bosch colour tokens rather than hard-coded chart colours.
- The retrieved documents do not provide numerical palette values or a general chart-type selection matrix.

## 13. UX writing

- Use simple, direct, precise language and one main thought per sentence.
- Start instructions with the user goal.
- Address the user as `you` when needed.
- Use `I`, `me`, or `my` only for ownership.
- Refer to an element by its visible label, not its control type.
- Use one verb consistently for the same action.
- Avoid filler, unexplained jargon, implementation detail, `Click here`, and vague button labels.

Preferred process labels include `Continue`, `Back`, `Done`, `Discard`, `Accept`, `Got it`, `Cancel`, and `Skip` when their documented meanings match the action.

## 14. Accessibility

Target WCAG 2.1 Level AA. Check separately which laws apply to the product and target market.

- Use semantic landmarks, headings, lists, tables, and form elements.
- Include a skip-to-main-content link.
- Support complete keyboard operation with logical focus order and visible focus.
- Provide accessible names, ARIA only where necessary, and alternative text for informative images.
- Decorative images must be ignored by assistive technologies.
- Support usable zoom and text resizing without loss of content or function.
- Do not use placeholder text as the only label.
- Announce important asynchronous status changes.
- Test accessibility during design and implementation, not only before release.

## 15. Branding

- Required Bosch branding elements must use approved assets and variants.
- Use the full Bosch symbol/logotype where required.
- Use the Supergraphic according to the approved placement rules.
- Use the Bosch favicon for Bosch websites.
- Do not recolour or redraw Bosch brand assets.

## 16. Page templates and workflows

- Select a page template only after mapping the product’s users, primary workflows, information hierarchy, and device requirements.
- Available web-based training templates include Introduction Screens, Interactive Screens, Content Screens, and Question Screens.
- Product UI guidelines complement the core component library.
- Use a training template only for a training workflow. Do not apply it to a dashboard or operational workflow solely because the template exists.
- Product-specific dashboard workflows and page templates remain pending.

## 17. Implementation checklist

A screen is ready when:

- [ ] User goal and primary action are explicit
- [ ] Information hierarchy is clear
- [ ] Approved components and tokens are identified
- [ ] Mobile, tablet, desktop, and large-screen behaviour is defined
- [ ] Loading, empty, no-match, partial, error, success, and permission states exist
- [ ] Keyboard order and focus behaviour are defined
- [ ] Labels and messages follow writing rules
- [ ] Colour is not the only carrier of meaning
- [ ] Typography, spacing, icon, radius, and elevation rules are followed
- [ ] Data formatting and units are consistent
- [ ] Sensitive data exposure is minimised
- [ ] Phase 1 light-mode-only scope is respected

## 18. Product decisions versus unavailable Bosch details

### Bosch details unavailable in the retrieved guidance

- Literal colour style keys and numerical palette values
- Standard and input border widths
- Focus-visible outline width, offset, style, and token
- Floating Outline numeric specification
- Shadow offsets, blur, spread, colour, and opacity
- Z-index values and complete layer order
- Table density, row height, cell padding, and detailed table interaction rules
- Browser and version support matrix
- General chart-type selection matrix beyond the documented column chart
- Detailed per-component state specifications
- Notification and validation component-selection rules

### Must be decided by this project if no applicable Bosch component supplies the behaviour

- Internal dashboard workflows and page templates
- File upload, preprocessing, validation summary, and rejected-row review flows
- Notification and error-message strategy
- Temporary table density rules
- Required visualisations based on actual data and user tasks
- Supported browser policy, subject to organisational requirements

## 19. Remaining inputs

1. Product type, users, and highest-frequency workflows
2. Approved Bosch UI Kit or Frontend Kit version
3. Exact local Bosch Sans files
4. Literal light-mode token names and numerical chart palette values, not listed in the retrieved content
5. Numerical border widths, Floating Outline, shadow values, and z-index values, not listed in the retrieved content
6. Table density and row-height rules, not detailed in the retrieved content
7. Browser/version support matrix, not found in the retrieved content
8. Product notification and error-message convention
9. General chart-type selection matrix and numerical chart palette, not provided; column-chart rules are documented
10. Product-specific dashboard page templates and workflows

## 20. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-09-02 | Initial baseline |
| 0.2 | 2026-09-02 | Added typography, icon sizing, radius, overlays, dashboard rules, colour structure, and WCAG target |
| 0.3 | 2026-09-02 | Recorded guideline limitations, training templates, chart placement, and non-invention rules for unavailable numeric values |
| 0.4 | 2026-09-02 | Added documented column-chart anatomy, behaviour, dimensions, responsiveness, and colour-system precedence |
| 0.5 | 2026-09-02 | Corrected unsupported token, focus, and layer claims; separated missing Bosch guidance from project decisions |
