# PROJECT_AUDIT.md — Nairobi OpsOS

A full state audit of the repository as it exists on disk, read file-by-file. This
is not a roadmap and not a status report written by the people who built it — it is
an external read of what the code, schema, and docs actually contain, where they
agree, and where they don't. Every claim below is traceable to a real file path, a
real function name, or a real table/column/policy name. No praise, no recommendations.

Method: every file under `apps/web/src`, every file under `supabase/migrations`,
every file under `docs`, `CLAUDE.md`, both `README.md` files, and every config file
in `apps/web` (`package.json`, `vite.config.ts`, the three `tsconfig*.json`,
`.oxlintrc.json`, `index.html`, `.env.example`, both `.gitignore` files) was read in
full immediately before writing this document. `node_modules`, `dist`, and
`package-lock.json` were not read.

---

## PART 1 — FILE-BY-FILE INVENTORY

### apps/web/src — entry point and shell

**`apps/web/src/main.tsx`** — the literal entry point. Five lines of substance:
imports `StrictMode` from React, `createRoot` from `react-dom/client`, the global
stylesheet `./index.css`, and the root component `./App.tsx`, then calls
`createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)`.
The non-null assertion on `getElementById('root')` is unchecked — if `index.html`'s
`<div id="root">` were ever renamed or removed, this throws at runtime with no
fallback. No other logic. Imported by nothing (it's the Vite entry referenced
directly from `index.html`'s `<script type="module" src="/src/main.tsx">`).

**`apps/web/src/App.tsx`** — the application shell and the only place screen
routing happens. Exports the default `App` function component. Holds two pieces of
local state: `active` (`NavId`, default `'mission-control'`) and `showSignIn`
(`boolean`, default `false`), plus calls `useSession()` to get `{ session,
sessionLoading }`. Defines one function, `handleNavigate(id)`, which sets
`showSignIn` to `false` and `active` to `id` — this is the only code that closes the
sign-in screen when the user clicks a nav item. Renders `<Sidebar
active={active} onNavigate={handleNavigate} />`, then inside `<main>` renders
`<AuthStatus session={session} loading={sessionLoading}
onSignInClick={() => setShowSignIn(true)} />` unconditionally (on every screen,
including the sign-in screen itself), followed by a ternary: if `showSignIn`,
render `<SignIn onDone={() => setShowSignIn(false)} />`; otherwise render whichever
of `<MissionControl />`, `<Procurement />`, `<Stores />`, or `<ComingSoon
title="Invoices" />` matches `active`. There is no router (`react-router` or
otherwise) anywhere in this file or in `package.json` — "navigation" is entirely
this in-memory `useState` switch. Imports `AuthStatus`, `Sidebar` + its `NavId`
type, `useSession`, `MissionControl`, `Procurement`, `SignIn`, `Stores`,
`ComingSoon`.

**`apps/web/src/index.css`** — the only stylesheet. Five lines of `@import
"tailwindcss"` plus a Tailwind v4 `@theme` block defining the cockpit's design
tokens as CSS custom properties: `--color-canvas: #05070a`, `--color-panel:
#0d1117`, `--color-panel-raised: #121823`, `--color-border: #1f2733`,
`--color-lime: #a8ff4f`, `--color-cyan: #59f1ff`, `--color-ink: #f4f8fb`,
`--color-ink-dim: #8b97a5`, `--font-sans: "Inter", system-ui, sans-serif`,
`--radius-panel: 22px`. Tailwind's `@theme` directive auto-generates utility
classes from these (`bg-canvas`, `text-lime`, `rounded-panel`, etc.), which is how
every component below uses them. A `body` rule sets background, text color, font,
and `-webkit-font-smoothing: antialiased`. No dark/light mode toggle exists — this
is the only palette, hardcoded.

**`apps/web/src/vite-env.d.ts`** — a hand-written ambient type declaration (not the
Vite-generated default, since it explicitly redeclares `ImportMetaEnv` and
`ImportMeta` rather than just referencing `vite/client`). Declares
`VITE_SUPABASE_URL: string` and `VITE_SUPABASE_ANON_KEY: string` as the only two
typed environment variables. This is what makes `import.meta.env.VITE_SUPABASE_URL`
type-check in `supabaseClient.ts` instead of being `any`. Exports nothing (it's a
`.d.ts` global augmentation file); imported by nothing explicitly, picked up
automatically by TypeScript via `tsconfig.app.json`'s `include: ["src"]`.

### apps/web/src/components

**`apps/web/src/components/Sidebar.tsx`** — exports `NavId` (the type
`'mission-control' | 'procurement' | 'stores' | 'invoices'`) and the `Sidebar`
component. Defines a local `NAV_ITEMS` array of four `{ id, label, glyph }` objects
using Unicode glyphs (`◎ ▤ ▣ ▦`) instead of an icon library — there is no icon
dependency anywhere in `package.json`. Renders a `<nav>` that is a horizontal
scrollable bar on mobile (`flex`, `border-b`) and a fixed left column on desktop
(`md:h-screen md:w-56 md:flex-col`), with the "NAIROBI OPSOS" wordmark shown only
at `md:` and above (`hidden ... md:block`) — meaning the wordmark never appears on
mobile at all. Each nav button's `onClick` calls the `onNavigate` prop directly
with the item's `id`; the active item gets `bg-panel-raised text-lime`, inactive
items get `text-ink-dim` with a hover state. No badges, no counts, no
click-outside handling, no keyboard navigation beyond native `<button>` behavior.
Imported by `App.tsx` only.

**`apps/web/src/components/SummaryTile.tsx`** — a pure, stateless presentational
component. Props: `label: string`, `value: string`, `accent?: 'lime' | 'cyan'`
(default `'lime'`). Renders a `rounded-panel` card with an uppercase dim label and
a large bold value colored by the accent. No `onClick`, no link, no interactivity
of any kind — confirmed by reading the full 19-line file, there is no event
handler prop in `SummaryTileProps` at all. Used by `MissionControl.tsx` (three
instances) and `Stores.tsx` (two instances).

**`apps/web/src/components/StockOnHandList.tsx`** — exports `StockOnHandList`,
which takes `items: StockItem[]` and `loading?: boolean` (default `false`). Renders
a `rounded-panel` card titled "Stock on hand" containing a `<ul>`. Per item it
computes `const isLow = item.reorderLevel > 0 && item.onHand <= item.reorderLevel`
inline (this exact expression is duplicated in three other files, see Part 2 §8),
shows the item name, `{sku} · {location}`, the on-hand quantity with unit, and a
"below reorder" tag in cyan when `isLow`. Three render branches handle loading
text, an empty-state message ("No stock items found."), and the populated list.
No row is clickable, no `key` collision risk since `item.id` is used. Only
consumer: `MissionControl.tsx` — `Stores.tsx` uses the separate, newer
`StockTable.tsx` instead, so this component and `StockTable.tsx` now implement two
independently-maintained versions of essentially the same "is this row low stock"
logic and "below reorder" tag.

**`apps/web/src/components/StockTable.tsx`** — exports `StockSortColumn`
(`'name' | 'onHand'`), `SortDirection` (`'asc' | 'desc'`), and the `StockTable`
component. Props add `sortColumn`, `sortDirection`, and `onSort: (column) => void`
on top of `StockOnHandList`'s shape. Internally defines a small `SortIndicator`
helper component that renders a `▲`/`▼` glyph next to whichever column header is
active. Renders a real `<table>` with six columns (SKU, Name, UOM, Location, On
hand, Reorder level); only the Name and On hand `<th>` cells contain a `<button>`
wired to `onSort` — SKU, UOM, Location, and Reorder level are plain, unsortable
headers (there is no UI affordance even hinting they could be sortable). Rows where
`isLow` get `bg-cyan/5` background tinting in addition to the cyan "below reorder"
inline tag — a second, independent implementation of the same low-stock visual
treatment as `StockOnHandList.tsx`. Wrapped in `overflow-x-auto` with a `min-w-
[640px]` table so it horizontally scrolls rather than reflows on narrow viewports.
Only consumer: `Stores.tsx`.

**`apps/web/src/components/PurchaseRequestTable.tsx`** — exports
`PurchaseRequestTable`, taking `items: PurchaseRequest[]` and `loading: boolean`
(no default — required, unlike the stock components' optional `loading?`). Defines
two local helpers: `statusClass(status)`, a `switch` mapping `'approved'` → lime,
`'rejected'`/`'submitted'`/`'rfq_sent'` → cyan, everything else (`'draft'`,
`'closed'`) → dim ink; and `formatDate(iso)`, which calls
`new Date(iso).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day:
'numeric' })`. Renders a five-column table (PR number, Requester, Date, Status,
#lines). There is no row click handler, no link, no expand affordance anywhere in
the file — a purchase request can be listed but never opened. Status text is shown
as `pr.status.replace('_', ' ')` (so `rfq_sent` renders "rfq sent", not "RFQ
Sent" — the CSS `uppercase` class handles casing, but the underscore replacement is
literal and naive, not a label lookup table). Only consumer: `Procurement.tsx`.

**`apps/web/src/components/PurchaseRequestForm.tsx`** — the most complex component
in the app at 240 lines. Exports only `PurchaseRequestForm`. Defines a local
`DraftLine` type (`key`, `stockItemId`, `description`, `qty`, `uom` — all strings,
since form inputs are uncontrolled-as-strings until parsed) and `emptyLine()`,
which generates a line with `crypto.randomUUID()` as its React `key`. Holds five
pieces of state: `requestedBy`, `department`, `neededBy`, `notes` (all strings) and
`lines: DraftLine[]` (initialized to one empty line), plus `validationError:
string | null`. `updateLine`, `addLine`, `removeLine` are pure array-state
helpers; `removeLine` refuses to drop the last remaining line
(`current.length > 1 ? ... : current`). `handleStockItemChange` looks up the
selected `stockItemId` in the `stockItems` prop and auto-fills `description` and
`uom` from the matched item, **clearing** both fields if the user switches back to
"Free-text description…" (`stockItem ? stockItem.name : ''`) — meaning any
free-text the user typed is silently discarded if they pick a stock item and then
change their mind back. `handleSubmit` does all validation client-side: requester
required; for each line, a blank line (no description, no stock item) is silently
skipped via `continue`; a line with only a quantity but no description/stock item
therefore produces no specific error and the form falls through to the generic
"Add at least one line." message (a real, previously-identified imprecision, not
fixed); quantity is parsed with `Number(line.qty)` and rejected if
`!Number.isFinite(qty) || qty <= 0`. On success it calls the `onSubmit` prop with a
fully-typed `NewPurchaseRequestInput`. The component never calls Supabase directly
— all data access is delegated to the parent via props (`onSubmit`, `onCancel`).
One local constant, `inputClass`, holds a ~140-character Tailwind class string
duplicated verbatim in `SignIn.tsx` and inlined a third time (uncommented) in
`Stores.tsx`'s search box. Only consumer: `Procurement.tsx`.

**`apps/web/src/components/AuthStatus.tsx`** — exports `AuthStatus`. Props:
`session: Session | null` (the type imported from `@supabase/supabase-js`),
`loading: boolean`, `onSignInClick: () => void`. Defines one local async function,
`handleSignOut`, which simply `await signOut()`s and does not catch or surface any
error from that call — if `signOut()` throws, it is an unhandled promise rejection
inside a React event handler. Three-way conditional render: loading text, a
"Signed in as {session.user.email} / Sign out" pair, or a "Viewing the demo org
(signed out) / Sign in" pair. This is the only place in the entire codebase that
reads `session.user.email`. Rendered unconditionally at the top of `<main>` in
`App.tsx`, above every screen including the sign-in screen.

### apps/web/src/screens

**`apps/web/src/screens/ComingSoon.tsx`** — exports `ComingSoon`, a 14-line
component taking one prop, `title: string`. Renders the title as an `<h1>` and a
single static panel containing the literal text "Coming in a later step of the
walking skeleton." Used exactly once, for the Invoices nav item, in `App.tsx`.

**`apps/web/src/screens/MissionControl.tsx`** — exports `MissionControl`. On
mount, a `useEffect` with a `cancelled` flag calls `fetchStockItems()` and sets
`items`/`loadState`/`errorMessage` accordingly (`LoadState` is a locally-defined
`'loading' | 'ready' | 'error'` union, the same shape independently redefined in
`Stores.tsx` and `Procurement.tsx`). Computes `reorderAlerts` (filter +
`.length`, the duplicated low-stock predicate again) and `stockValue`
(`items.reduce((sum, item) => sum + item.onHand * item.unitCost, 0)`) directly in
the render body on every render — not memoized. Renders three `SummaryTile`s
(SKUs tracked / Reorder alerts / Stock value, the last formatted as
`` `KES ${Math.round(stockValue).toLocaleString()}` ``) and one
`StockOnHandList`. The error banner (`Couldn't reach Supabase: {errorMessage}`) is
the only error-surfacing UI in the file. No retry button anywhere in the file — a
failed fetch is permanent until the user reloads the page.

**`apps/web/src/screens/Stores.tsx`** — exports `Stores`. Same fetch pattern as
`MissionControl.tsx` (independently re-implemented, not shared). Adds three more
pieces of state: `query` (search text), `sortColumn`, `sortDirection`. `handleSort`
toggles direction if the clicked column is already active, otherwise switches
column and resets to ascending. `visibleItems` is a `useMemo` that lowercases and
trims `query`, filters `items` by substring match on `name` OR `sku`, then sorts a
**copy** of the filtered array (`[...filtered].sort(...)`, correctly avoiding
mutating `items`) by `localeCompare` on name or numeric subtraction on `onHand`,
flipped by `sortDirection`. Renders two `SummaryTile`s (SKUs tracked / Below
reorder), a bare `<input type="search">` (not a separate component — its
~140-character class string is inlined a third time, see `PurchaseRequestForm.tsx`
above), and `StockTable`. No pagination — if `items` ever grows large, the entire
result set is fetched, filtered, and rendered client-side every keystroke (the
`useMemo` recomputes on every `query` change, which is correct React but means a
large dataset would do a full re-sort per keystroke with no debounce).

**`apps/web/src/screens/Procurement.tsx`** — exports `Procurement`, the only
screen with both a read and a write path. Calls `useSession()` for `session`.
Three independent pieces of async state: the PR list (`items`, `loadState`,
`errorMessage`), the stock-item picker list (`stockItems`, fetched once on mount
via `fetchStockItems()` with errors silently swallowed in an empty `.catch()`
block — explicitly commented as intentional since the free-text line path doesn't
need it), and the create-form's own `formOpen`/`submitting`/`submitError`.
`loadPurchaseRequests` is defined as a named async function (not just inline in
`useEffect`) specifically so it can be called a second time, after a successful
create, to refresh the list — this is the function that makes "list refreshes
after create" work. `handleCreate` contains the single most important line in the
entire codebase for the auth/demo split:
`const orgId = session ? await getOwnOrgId(session.user.id) : await getDemoOrgId()`
— immediately followed by a comment explaining it is "the one place the anon-demo
lane and the real-auth lane touch." The subtitle text
(`Purchase requests — {session ? 'your org' : 'live demo org'}`) is the only other
session-aware UI in the file. The "+ New purchase request" button toggles
`formOpen` and its own label between that text and "Close" — it does not reset
the form's internal state on close (the form component remounts fresh each time
since it's conditionally rendered, so this is moot in practice, but there's no
explicit unmount/reset logic to rely on if that ever changes).

**`apps/web/src/screens/SignIn.tsx`** — exports `SignIn`, taking one prop,
`onDone: () => void`. Local `Status` type: `'idle' | 'sending' | 'sent' |
'error'`. `handleSubmit` calls `signInWithMagicLink(email.trim())` and sets
status to `'sent'` on success or `'error'` with a message on failure. There is no
email format validation beyond the native HTML `type="email" required` attribute
— no client-side regex check, relying entirely on the browser and on Supabase's
own server-side validation. On success, shows "Check {email} for a sign-in link."
with a "Back" button calling `onDone`; the form itself has "Send magic link" and
"Cancel" buttons, both disabled while `status === 'sending'`. Reuses the same
`inputClass` constant pattern as `PurchaseRequestForm.tsx` (independently
declared, not imported from a shared location — there is no shared
`components/inputs.ts` or similar anywhere in the codebase).

### apps/web/src/data

**`apps/web/src/data/stockItems.ts`** — exports the `StockItem` type (`id`, `sku`,
`name`, `uom`, `onHand`, `reorderLevel`, `reorderQty`, `unitCost`, `location` — all
camelCase) and one function, `fetchStockItems(): Promise<StockItem[]>`. Internally
defines two unexported row types matching the raw Postgres/PostgREST shape
(`StockItemRow` with snake_case columns, and `StockOnHandRow` with just
`stock_item_id`/`on_hand`). The function runs two Supabase queries in parallel via
`Promise.all`: a `select` on `stock_items` (id, sku, name, uom, reorder_level,
reorder_qty, unit_cost, location, ordered by name) and a `select` on the
`v_stock_on_hand` view (stock_item_id, on_hand). It builds a `Map<string,
number>` from the second result keyed by `stock_item_id`, then maps the first
result into `StockItem[]`, looking up `onHand` from the map with `?? 0` as the
fallback for any stock item with no movement rows at all. A code comment explains
why two queries are needed: "`on_hand` is a derived ledger value that only exists
in `v_stock_on_hand`... stock is never stored as a mutable counter." Both Supabase
calls' `.data` are cast with `as StockItemRow[]` / `as StockOnHandRow[]` — unchecked
type assertions, not runtime-validated. This is the most-reused data module in the
app: imported by `MissionControl.tsx`, `Stores.tsx`, and `Procurement.tsx` (for
the line-item picker).

**`apps/web/src/data/purchaseRequests.ts`** — exports `PurchaseRequestStatus`
(the six-value union matching the DB check constraint exactly: `draft | submitted
| approved | rejected | rfq_sent | closed`), `PurchaseRequest`, `NewPurchaseRequestLine`,
`NewPurchaseRequestInput`, and two functions: `fetchPurchaseRequests()` and
`createPurchaseRequest(input, orgId)`. `fetchPurchaseRequests` selects from
`purchase_requests` with an embedded PostgREST aggregate,
`purchase_request_lines(count)`, ordered by `created_at` descending, and maps
`row.purchase_request_lines[0]?.count ?? 0` into `lineCount` — this single query
is what makes the "#lines" column work without a second round-trip.
`createPurchaseRequest` takes `orgId` as an explicit second parameter (not resolved
internally — see `Procurement.tsx` above for where it's actually decided) and a
locally-defined `generatePrNumber()` that returns `` `PR-${Date.now()}` ``,
immediately preceded by a comment calling this a "demo shortcut" to be replaced
"before any real tenant exists." It inserts the PR row first (`.insert({...}).
select('id').single()`), then maps `input.lines` into line rows and inserts them
in a second, separate `.insert(lineRows)` call. These two inserts are **not**
wrapped in any transaction or RPC — they are two independent HTTP requests to
PostgREST. If the second fails, the function throws a custom `Error` whose message
names the already-created PR number and says its lines failed to save; the
already-inserted PR row is not rolled back, deleted, or otherwise reconciled —
it simply exists with zero lines.

### apps/web/src/hooks

**`apps/web/src/hooks/useSession.ts`** — exports `useSession()`, a 31-line hook
returning `{ session: Session | null, loading: boolean }`. On mount, calls
`supabase.auth.getSession()` once to set the initial state and `loading = false`,
and separately subscribes via `supabase.auth.onAuthStateChange((_event,
newSession) => setSession(newSession))` for all subsequent changes (sign-in,
sign-out, token refresh) — note the event type itself (`_event`) is received but
discarded; the hook does not distinguish `SIGNED_IN` from `TOKEN_REFRESHED` from
`SIGNED_OUT`, it just always overwrites `session` with whatever the callback
provides. Cleans up via `authListener.subscription.unsubscribe()` in the
`useEffect` return. This is the only hook in the codebase (the `hooks/` directory
contains exactly this one file). Imported by `App.tsx` and `Procurement.tsx`
independently — each component calls `useSession()` itself rather than the value
being threaded down from `App.tsx`, meaning there are two live Supabase auth
listeners mounted simultaneously whenever the Procurement screen is showing.

### apps/web/src/lib

**`apps/web/src/lib/supabaseClient.ts`** — exports the single `supabase` client
instance used by every other file in the app. Reads `import.meta.env.
VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, throwing a descriptive `Error`
at module load time if either is missing or empty. Calls `createClient(supabaseUrl,
supabaseAnonKey)` with no further options (no custom `auth` config, no custom
`fetch`, no schema override) — meaning Supabase's v2 defaults apply throughout:
session persistence to `localStorage`, auto token refresh, and URL-based session
detection on page load (`detectSessionInUrl`, on by default), which is what makes
the magic-link redirect actually establish a session without any extra code. A
one-line comment states the security model: "Anon key only — RLS on every table
governs what this client can read." This is the **only** Supabase client
constructed anywhere in the app — there is no separate service-role client (there
must never be one in client-side code, and there isn't).

**`apps/web/src/lib/demoOrg.ts`** — exports `getDemoOrgId(): Promise<string>`.
Holds one module-level mutable variable, `cachedDemoOrgId: string | null`,
initialized to `null` and set permanently on first successful call — there is no
cache invalidation, no TTL, no way to refresh it short of a full page reload.
Queries `orgs` for `id` where `is_demo = true`, using `.single()` (which throws if
zero or more-than-one row matches). A comment explains the design choice: looked
up rather than hardcoded "so the client never embeds a magic UUID" — though the
underlying database fence it resolves against is itself a single hardcoded
boolean flag on exactly one seeded row (`002_demo_seed.sql`'s `is_demo = true`).
Used by `Procurement.tsx` only, in the anon branch of the org-id decision.

**`apps/web/src/lib/userOrg.ts`** — exports `getOwnOrgId(userId: string):
Promise<string>`. Queries `profiles` for `org_id` where `id = userId`, also via
`.single()`, with no caching at all (unlike `demoOrg.ts`). A comment explicitly
contrasts the two: this function relies on RLS (`profile_self` + `current_org_id()`)
to already scope the query to exactly the caller's own row, so "there's nothing
to fence client-side — unlike the demo lane." Used by `Procurement.tsx` only, in
the authenticated branch.

**`apps/web/src/lib/auth.ts`** — exports two thin wrapper functions:
`signInWithMagicLink(email)`, which calls `supabase.auth.signInWithOtp({ email })`
and re-throws any error; and `signOut()`, which calls `supabase.auth.signOut()`
and re-throws any error. No retry logic, no rate-limit handling, no custom
`emailRedirectTo` option passed to `signInWithOtp` — the redirect target is
whatever the Supabase project's dashboard "Site URL" is configured to, not
anything controlled from code. Used by `SignIn.tsx` (`signInWithMagicLink`) and
`AuthStatus.tsx` (`signOut`).

### apps/web — config & build

**`apps/web/package.json`** — `"name": "web"`, `"private": true`,
`"version": "0.0.0"`. Scripts: `dev` (`vite`), `build` (`tsc -b && vite build`),
`lint` (`oxlint`), `preview` (`vite preview`) — no `test` script exists at all.
Dependencies: `@supabase/supabase-js ^2.108.2`, `react ^19.2.7`, `react-dom
^19.2.7` — three runtime dependencies total, no router, no state-management
library, no UI component library, no date library, no form library, no icon
library, no validation library (zod/yup/etc.), no test runner. DevDependencies:
`@tailwindcss/vite`, `@types/node`, `@types/react`, `@types/react-dom`,
`@vitejs/plugin-react ^4.7.0` (deliberately pinned off the newer `^6.x` line — see
`vite.config.ts` note below), `oxlint`, `tailwindcss`, `typescript ~6.0.2`, `vite
^6.4.3` (also deliberately pinned down from the template's original `^8.1.0`).

**`apps/web/vite.config.ts`** — nine lines. `defineConfig({ plugins: [react(),
tailwindcss()] })`. No path aliases, no custom server config, no env-var
allowlisting, no build target override. The `vite` and `@vitejs/plugin-react`
versions here were downgraded from the `create-vite` scaffold's defaults (`vite
^8.1.0` ships with a native `rolldown` binding that failed to resolve on this
machine's Node v20.17 — `npm run build` crashed with `MODULE_NOT_FOUND` for
`@rolldown/binding-darwin-universal`); `6.4.3` is the classic Rollup-based line
and was confirmed working.

**`apps/web/tsconfig.json`** — a project-references-only root config: empty
`files: []`, references to `tsconfig.app.json` and `tsconfig.node.json`. No
compiler options of its own.

**`apps/web/tsconfig.app.json`** — the config that actually type-checks
`src/**`. Notably strict: `noUnusedLocals: true`, `noUnusedParameters: true`,
`noFallthroughCasesInSwitch: true`, `erasableSyntaxOnly: true`,
`verbatimModuleSyntax: true` (which is why every type-only import in this
codebase is written as `import type { X }`, not just `import { X }`),
`moduleResolution: "bundler"`, target `es2023`. `types: ["vite/client"]` is what
supplies the base `ImportMetaEnv` shape that `vite-env.d.ts` then augments.
Notably, **strict mode itself is not explicitly set** — there is no `"strict":
true` line anywhere in this file. TypeScript's default for an unset `strict` flag
is `false`, meaning `strictNullChecks`, `noImplicitAny`, and the rest of the
strict family are off unless individually enabled (none are individually listed
here either). This directly contradicts `CLAUDE.md`'s own stated rule,
"TypeScript strict; functional components; named exports; keep components
small" — the codebase follows the functional-components/named-exports/small-
components parts, but "TypeScript strict" is not actually configured.

**`apps/web/tsconfig.node.json`** — near-identical sibling config scoped to just
`vite.config.ts`, with `types: ["node"]` instead of `["vite/client"]` and
`module: "nodenext"` instead of `"esnext"`. Same omission of an explicit
`"strict"` flag.

**`apps/web/.oxlintrc.json`** — nine lines. Enables the `react`, `typescript`,
and `oxc` plugin groups and exactly two explicit rules:
`"react/rules-of-hooks": "error"` and `"react/only-export-components": ["warn",
{ "allowConstantExport": true }]`. This is the default template configuration,
unmodified — the file's own `$schema` comment and the shape match the
`apps/web/README.md`'s documented starter config verbatim, meaning no
project-specific lint rules were ever added (no rule enforcing the duplicated-
logic patterns noted throughout this audit, for instance).

**`apps/web/index.html`** — the Vite HTML entry. Sets the page title to "Nairobi
OpsOS — Control Tower", links a favicon (`/favicon.svg`), and preconnects to
Google Fonts to load Inter (weights 400/500/600/700) via a `<link>` tag — this is
the only way the `--font-sans` token in `index.css` actually resolves to Inter
rather than falling back to `system-ui`. Body contains exactly `<div id="root">`
and the `main.tsx` script tag.

**`apps/web/.env.example`** — two lines, `VITE_SUPABASE_URL=https://YOUR-
PROJECT.supabase.co` and `VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY`, committed as the
template for the real, git-ignored `.env`. The real `.env` (not read for this
audit's content, but its existence and gitignore status were verified earlier in
this project) holds the live project URL and a `sb_publishable_...`-prefixed anon
key — Supabase's newer publishable-key format, functionally equivalent to the
legacy JWT anon key for this purpose.

**`/.gitignore` (repo root)** — ignores `node_modules/`, `dist/`, `build/`,
`.env` and `.env.*` (with `!.env.example` as the sole exception), `supabase/.
branches/`, `supabase/.temp/`, `.DS_Store`, `.vscode/*` (except
`extensions.json`), and `*.log`. Because these patterns have no leading slash,
they apply repo-wide, which is what makes `apps/web/.env` git-ignored even
though `apps/web` has its own separate `.gitignore` too.

**`apps/web/.gitignore`** — a second, largely redundant gitignore scoped to
`apps/web/`: log file patterns, `node_modules`, `dist`, `dist-ssr`, `*.local`,
editor directories. This is the unmodified Vite-template default — it does not
explicitly list `.env` (that protection comes entirely from the root
`.gitignore`'s repo-wide pattern, confirmed directly via `git check-ignore -v
apps/web/.env` earlier in this project, which resolved to the root file).

### supabase/migrations

**`supabase/migrations/001_procurement_core.sql`** — the foundational schema,
362 lines, run first. Creates the `pgcrypto` extension (for `gen_random_uuid()`);
the tenancy tables `orgs` (id, name, kra_pin, county, is_demo, created_at) and
`profiles` (id → `auth.users(id)` cascade, org_id, full_name, role with a check
constraint, created_at); the SQL function `current_org_id()` (`security definer`,
`select org_id from profiles where id = auth.uid()`); the generic trigger
function `set_updated_at()`; master-data tables `suppliers` and `stock_items`;
the full procurement chain `purchase_requests` → `purchase_request_lines` →
`quotations` → `quotation_lines` → `purchase_orders` → `purchase_order_lines` →
`grns` → `grn_lines` → `invoices` → `payments`; the append-only `stock_movements`
ledger; `updated_at` triggers on five tables via a `DO` loop; three indexes;
`enable row level security` on fourteen tables via a `DO` loop; the `org_self`
and `profile_self` policies on `orgs`/`profiles`; the `org_isolation` policy
(`for all to authenticated using/with check (org_id = current_org_id())`) applied
identically to thirteen business tables via a second `DO` loop; the three
control-tower views `v_stock_on_hand`, `v_reorder_alerts`, `v_quote_comparison`
(all `security_invoker = true`); and explicit `grant` statements giving `anon`
schema-usage + `select` on every table and `authenticated` additionally `insert,
update, delete` on every table (RLS then narrows what those grants actually
permit per row). This file alone defines the entire `public` schema the app
runs against.

**`supabase/migrations/002_demo_seed.sql`** — 134 lines. Inserts one `orgs` row
(`id = '00000000-0000-0000-0000-0000000000d0'`, name "Demo Plastics & Packaging
Ltd", `is_demo = true`) and a full, deterministically-linked procurement chain
under it using eleven hardcoded fixed UUIDs (listed in a comment at the top):
two suppliers, four stock items (PP Resin, HDPE Granules, Masterbatch Blue,
Stretch Film Roll), one purchase request with two lines, two competing
quotations with lines, one purchase order with lines, one GRN with lines, eight
stock-movement rows (the specific in/out quantities that make Masterbatch and
Stretch Film land below their reorder levels — and, as later live-verified,
actually land all four items below reorder), one invoice, and one payment. Every
insert uses `on conflict (id) do nothing` for idempotent re-runs. The file's
second half is a `DO` loop that creates a `demo_read` policy (`for select to
anon`) on `orgs` (fenced `is_demo = true`) and on thirteen other business tables
(fenced `org_id in (select id from orgs where is_demo = true)`) — this is the
entire mechanism that makes the anonymous demo experience possible.

**`supabase/migrations/003_command_core.sql`** — 159 lines, explicitly marked
`STATUS: DRAFT / REFERENCE ONLY. DO NOT RUN YET` in its header comment, and
confirmed never run (no application code anywhere references it). Creates an
entirely separate Postgres schema, `command`, and revokes all access to it from
`anon`/`authenticated` before granting it to a `founder` role that is itself
never created (`create role founder;` appears only as a commented-out line with
the note "do this once in the dashboard / a setup migration"). Defines six
tables — `command.prospects`, `command.daily_intelligence`, `command.tasks`,
`command.build_log`, `command.pipeline`, `command.search_history` — with the
majority of columns explicitly flagged `-- ⚠ inferred` because they were guessed
from how the old Apps Script `Code.gs`/`DataService.gs` read its Google Sheet,
not confirmed against real headers. Enables RLS on all six and adds a
`founder_all` policy per table (`for all to founder using (true) with check
(true)` — i.e., once the `founder` role exists, it has unrestricted access, no
further row filtering). Ends with an explicit "OPEN DECISION" comment about
single-founder vs. eventual team scoping, unresolved.

**`supabase/migrations/004_demo_write_policies.sql`** — 44 lines. Adds exactly
two policies: `demo_write_purchase_requests` and
`demo_write_purchase_request_lines`, both `for insert to anon`, both fenced by
the identical `org_id in (select id from orgs where is_demo = true)` check used
for reads in `002`. The header comment is explicit that this is "a DEMO-ONLY
SANDBOX POLICY" that "must be REPLACED by real Supabase Auth... before any real
tenant's data ever lands in this schema," and warns against extending the
pattern to other tables. As of this audit, it has not been replaced — it
coexists with the auth system added afterward (`005`), by deliberate design (see
Part 2 §4), not because it was forgotten.

**`supabase/migrations/005_align_roles.sql`** — 32 lines, the most recent
migration. Drops `profiles_role_check` (Postgres's auto-generated name for
`001`'s unnamed inline check constraint) and replaces it with `role in
('owner','procurement','finance','viewer')`, then changes the column default
from `'staff'` to `'viewer'`. The header comment notes this was safe because
`profiles` had zero rows at the time (no signup trigger had ever run). This is a
pure constraint-and-default change — no new column, no new table, no data
migration logic.

### docs

**`docs/00_README_docs_index.md`** — the docs table of contents. A reading-order
table (00 through 08, plus `profile_source.py`) with owner roles and "answers"
columns, a document-status table (all docs dated 2026-06-23/24, versions 0.1–0.3,
all "Draft" or "Living document" status — none marked final/ratified), a short
conventions section referencing a PR-based change process and an `/docs/adr`
directory for architecture decision records (no such directory exists in the
repo), and a one-line project pitch.

**`docs/01_Project_Charter.md`** — version 0.2, "Draft for approval," unsigned
(the §13 approval table has empty checkboxes). Defines the problem (Kenyan SME
ops on WhatsApp/Excel/paper vs. expensive heavy ERP), the integration-first
principle, vision/mission, three OKR objectives for the first six months (ship an
MVP; convert it to paying engagements; establish a repeatable delivery system —
none of the KRs under any objective are checked off anywhere in this repo: no
CI/CD pipeline exists, no discovery conversations or paid audits are tracked in
the repo), explicit Phase-1 scope and out-of-scope lists, a solo-founder RACI
table, a Gantt-style milestone table (M0–M6, none dated as complete), assumptions,
constraints (near-zero budget, 2016 MacBook, solo + AI), and a risk summary that
points to doc 06.

**`docs/02_PRD_Procurement_Control_Tower.md`** — version 0.2, "Draft for
approval." Defines goals/non-goals, four personas (Amina/Kevin/Grace/Jay), the
procure-to-pay user journey, nineteen functional requirements (FR-1 through
FR-19, see Part 2 §6 for the full built/not-built mapping), non-functional
requirements (RLS everywhere, DPA alignment, <2s render target, 99% MVP
availability, offline tolerance, append-only audit trail, free-tier cost
ceiling), success metrics, dependencies, a five-sprint release plan (read-only →
PR/Quote/LPO writes → GRN/Invoice/Payment writes → automation → eTIMS/M-Pesa),
and three open questions (eTIMS self-cert vs. partner; digest channel; 4 vs. 2
roles).

**`docs/03_Technical_Design_RFC.md`** — version 0.3, "Open for comments." The
fullest technical document: architecture diagram (PWA + Supabase + n8n + Gemini +
eTIMS + M-Pesa + GitHub Actions — only the PWA↔Supabase edge of this diagram
exists in code today), the full ER diagram matching `001`'s actual tables
exactly, the security model (RLS everywhere, anon-vs-service-role key
separation, "roles (owner/officer/finance/viewer) enforced in policies and
checked in UI" — not true today, see Part 2 §6), API/contract surface (claims
`supabase gen types` is used — it is not, see Part 2 §6), the full §7
ingestion/adapter-library design (zero corresponding application code; only
`profile_source.py` exists, as a standalone CLI, not integrated), the eTIMS/M-
Pesa integration design (M5, explicitly sequenced, not built), CI/CD claims
(commit lint, `supabase db start`/`db lint` in CI, Cloudflare Pages auto-build,
release-please — none exist; there is no `.github` directory anywhere in this
repo), a trade-offs table, engineering risks, a four-stage rollout plan, and four
open questions for reviewers.

**`docs/04_Information_Architecture.md`** — version 0.1, "Draft." Defines the
nav model (five items: Dashboard, Procurement, Stores, Invoices & Payments,
Master Data — actual code has four, with "Dashboard" renamed "Mission Control"
and "Master Data" absent entirely), an IA tree diagram, an entity model table
(Purchase Request, Quotation, Purchase Order, GRN, Invoice, Payment, Stock Item,
Supplier — each with list-view/detail-view/key-actions columns), two flow
diagrams (procure-to-pay happy path; the automated reorder loop), a 14-row
screen inventory with routes (`/login`, `/`, `/procurement/requests`, etc. — no
router exists, so none of these routes are real URLs), route-map notes (org
context from session, never the URL — true today only because there is no
URL-based routing at all yet), the four-role access map (Owner/Procurement/
Finance/Viewer — not enforced anywhere in application code), and design-system
notes restating the cockpit tokens.

**`docs/05_Competitive_Landscape_Audit.md`** — version 0.2, "Draft." Pure market
strategy, no technical content. Separates fact from assumption explicitly. Splits
the six target segments into Tier 1 (manufacturing, distribution/FMCG, NGOs —
"OpsOS is the spine") and Tier 2 (clinics, hospitality, schools — "integrate/
complement, never replace"), names real competitor categories (heavy ERP,
affordable/modular ERP, eTIMS integrators, modern SME POS apps like Veira,
consulting-led dev shops, and the "do nothing" default), a positioning quadrant
chart, five market gaps the project claims to be able to own, counter-moves, and
a watch list. Not reflected in or contradicted by any code — this document has no
code-verifiable claims.

**`docs/06_Risk_Register.md`** — version 0.2, "Living document." Thirteen scored
risks (R-01 through R-13, likelihood × impact). Top three by score: R-01 "Scope
sprawl / endless scaffolding without shipping" (20, explicitly noted as a
recurring historical pattern), R-03 "Solo-founder bandwidth" (16), R-07 "No
paying client converts" (15). R-04 ("RLS misconfiguration leaks cross-tenant
data," scored 10) names "tenant-isolation tests in CI" as its mitigation — no
such tests exist anywhere in this repo (no test framework is even installed).
R-12 ("Building the perfect pipeline becomes the project," scored 12) is the risk
most directly relevant to this audit's findings: a stated, named, scored risk
that the project itself identifies as live.

**`docs/07_Segment_Tooling_Integration_Matrix.md`** — version 0.2, reference
document. Names the three shared integration "rails" (M-Pesa, eTIMS, WhatsApp/
SMS), a per-segment tooling matrix, an "adapter library" model (five source-shape
adapters — structured-ledger, QuickBooks/accounting-export, messaging-intake,
formless-sheet, vertical-system-export — over one shared staging/validate/dedup/
confirm core), segment-by-segment integration approach narratives, an
integration architecture diagram, and a connector build-priority table (P0:
M-Pesa, eTIMS, WhatsApp/SMS; P1: Excel import, QuickBooks export; P2: Outlook;
P3: SFA/DMS; P4: HMIS/POS/school-ERP). None of the adapters, connectors, or the
shared staging core have any corresponding code in this repo.

**`docs/08_Segment_Onboarding_Playbook.md`** — version 0.1, "Operational
method," explicitly a sales/delivery process document, not a build spec. Defines
a six-stage onboarding loop (qualify & tier → discovery interview → get one real
file → profile it → map + configure → flag compliance edge → decision gate),
a discovery question bank, the "always get one real file, never a description"
artifact-request script, instructions for running `profile_source.py`, a
shape-identification table, segment module configuration notes (vocabulary/
spine/compliance-edge per segment), a decision-gate framework, and five
calibration rules learned from profiling the real HAL item master (import
controlled vocabularies, de-dup even clean masters, duplicate description ≠
duplicate item, never assume completeness, preserve source keys). This document
describes a sales process Jay runs by hand; `profile_source.py` is its only
tooling, and it has no integration point into `apps/web` at all.

**`docs/profile_source.py`** — a 165-line, dependency-light (`openpyxl` for
`.xlsx`/`.xlsm`, stdlib `csv` for `.csv`) standalone Python CLI, explicitly
documented as read-only ("Never modifies the input"). Functions: `norm(s)`
(whitespace-collapse + uppercase + strip non-alphanumerics, used for near-
duplicate detection), `load_xlsx`/`load_csv`, `detect_header` (scans the first 25
rows for the one with the most distinct short string cells, as a header-row
heuristic), `profile_sheet` (per-column blank%, distinct-value count,
trailing/double-space flags, low-cardinality value enumeration, and a duplicate/
near-duplicate scan on a detected or specified key column), `guess_shape`
(keyword-matches sheet names against `STOCK/IN/OUT/ITEM DB/GRN/LEDGER`,
`GL/JOURNAL/FUND/...`, `PATIENT/CLAIM/POS/...` to suggest which adapter shape a
file is), and `main` (argparse CLI entry). This is a real, runnable, self-
contained tool — but it is entirely separate from `apps/web`; there is no API
endpoint, no upload screen, no import pipeline in the application that calls or
wraps it. It is run by hand, by Jay, against a prospect's file, outside the app.

**`docs/CONTEXT_PACK.md`** — the "lived history" document, not version-numbered
like 00–08. Eight sections: who/what (Jay, solo founder, Nairobi, offer ladder,
target segments); the Control-Tower-vs-Command-Station distinction ("do not
merge these," "share a design language, not a data model"); the Apps Script
artifact inventory (lives in Drive, not the repo — "port FROM, don't paste IN");
stack decisions with rationale (Cloudflare Pages over Netlify/Vercel; on_hand as
ledger-derived; HAL as reference specimen not customer; integration-first/
adapter-library; AI-drafts-Jay-approves; near-zero budget); five behavioral notes
on how Jay works (honest pushback, exact executable guidance, research-then-build,
first-person doc voice, anti-perfectionism per R-12); a build-history log (five
bullets, ending with the auth vertical); a five-item "next steps" list that is
now stale in its first three items (Stores, Cloudflare deploy, and Procurement
are listed as upcoming, but Stores and Procurement are both built — only the
Cloudflare deploy item is still accurate); and a Drive artifact map for the
founder-side specs.

**`docs/command-station-v0.5.1-analysis.md`** — explicitly headed `STATUS:
REFERENCE ONLY — DO NOT BUILD FROM THIS YET`. Analyzes the existing v0.5.1 Apps
Script Command Station: a Google-Sheets-backed read path that works
(`DataService.gs`'s `getAppState()`), a working Demo Mode, and a design system
worth porting (`Stylesheet.html`). Names seven concrete gaps in the old tool
itself: the "AI Command Bar" is a keyword `includes()` matcher with no real AI or
execution; action buttons are decorative; nothing generates prospects or intel
(hand-entered sheet rows only); writes are append-only (no edit/status
transitions); "Search Memory" dedupe is UI copy with no backing logic; no auth/
multi-user/integrity (a Sheets backend); Settings/Notifications are empty
scaffolds. Maps the spec-vs-reality gap against Jay's own Drive specs (Master
Context Pack v1's Autonomous Prospect Scout concept; the AI Command Bar & Daily
Intelligence Spec v1's reactive/proactive modes; the automation boundary rule
that AI may never auto-send/auto-commit). Infers a six-table COMMAND data model
(prospects, daily_intelligence, tasks, build_log, pipeline/revenue,
search_history — the same six `003_command_core.sql` implements, with the same
⚠-inferred-column caveats), restates the founder-only security model, and lays
out a five-step build order ending with "Command bar as agent LAST."

**`docs/control-tower-gap-analysis.md`** — explicitly headed `STATUS: REFERENCE
/ CHECKLIST`. The most recently-edited doc (one line was touched in this
project's prior session to mark "Real Supabase Auth" with a ✅). Opens with a
thesis: the app has nouns (requests, stock, items) but not verbs (submit,
approve, reject, receive, match, pay), and identifies auth/identity as the
keystone gap, "the same blocker as migration 004's demo-write sandbox." Names
the canonical eight-link procure-to-pay flow and states plainly "we have built
link 1." Gives per-screen gap lists for Procurement (approval workflow is "THE
biggest gap"; no PR detail view; no status tabs; no edit/cancel; no
attachments), Stores (no movement entry despite the schema being built for it;
no per-item movement history; no "reorder now" bridge; no location filter), and
Mission Control (tiles are dead ends; no pending-approvals surface; sample
activity feed). States the Invoices screen and everything downstream of PR
(Quotations, POs, GRN, Invoices, Payments, 3-way match) is correctly sequenced
as not-yet-built, not a flaw. A recommended five-item next-vertical order (auth
✅ → PR approval workflow → stock movements → Stores↔PR/Mission-Control bridges
→ the rest of the chain), and discipline notes reiterating "resist building the
chain before auth + approvals exist" and flagging the `pr_number` timestamp
shortcut again.

### Root files

**`/README.md`** — six lines of substance: layout (`apps/web`, `supabase/
migrations`, `docs`, `CLAUDE.md`), stack one-liner, and a "Status" line reading
"Phase 1 documented. Building the walking skeleton (cockpit shell → read
stock_items → deploy). See `CLAUDE.md` → 'Current goal'." This file has not been
updated since the very first session of this project — it still describes the
walking-skeleton stage and references a "Current goal" heading that no longer
exists in `CLAUDE.md` (the current file uses "Current state" / "Next step"
headings instead). This is itself a doc-vs-reality drift, inside the docs
themselves, not just docs-vs-code.

**`apps/web/README.md`** — the unmodified `create-vite` template README:
generic Vite+React+TS boilerplate text about HMR, Oxlint, the two official Vite
React plugins, and React Compiler. Contains no project-specific content
whatsoever — not even the project name.

**`/CLAUDE.md`** — the agent-facing standing contract, most actively maintained
document in the repo (dated 2026-06-29 as of this audit, with a 2026-06-25 date
still attached to a stale `## Current state` header label format inconsistency
— no, on inspection the header itself does say `(updated 2026-06-29)`, current).
States what the project is, the locked stack decisions, repo layout, the cockpit
design tokens (verbatim matching `index.css`'s actual values), six "non-
negotiable rules" (no table without RLS; anon-client/service-role-server key
separation; `.env` git-ignored; AI-drafts-human-approves; integration-first;
TypeScript-strict/functional/named-exports/small-components — the last of which
is only partially true per the `tsconfig.app.json` finding above), a "Current
state" section describing the auth vertical as live with both lanes "proven,"
an explicit open follow-up about the Cloudflare Pages redirect URL, a "Next
step" pointing at the PR approval workflow, and an "After that" section listing
stock movements, the Stores↔PR bridge, the rest of the procurement chain,
Command Station UX porting, and the n8n digest — in that order.

---

## PART 2 — DEEPER ANALYSIS

### 1. Architecture map

The entire runtime architecture is two tiers: a static-built React SPA served by
Vite (dev) or a static host (prod, not yet deployed), talking directly over HTTPS
to one Supabase project's PostgREST API. There is no server-side code anywhere in
`apps/web` — no API routes, no edge functions, no middleware. `n8n`, `Gemini`,
`Cloudflare Pages`, `eTIMS`, and `M-Pesa` all appear in `docs/03`'s architecture
diagram and nowhere in the actual repository.

**A read, traced line by line** (Mission Control's "SKUs tracked" tile):

1. `index.html` loads `/src/main.tsx`.
2. `main.tsx` calls `createRoot(...).render(<StrictMode><App /></StrictMode>)`.
3. `App.tsx` renders `<MissionControl />` (since `active === 'mission-control'`
   by default and `showSignIn` is `false`).
4. `MissionControl`'s `useEffect` calls `fetchStockItems()` from
   `data/stockItems.ts`.
5. `fetchStockItems()` runs `Promise.all([supabase.from('stock_items').
   select('id, sku, name, uom, reorder_level, reorder_qty, unit_cost,
   location').order('name'), supabase.from('v_stock_on_hand').select
   ('stock_item_id, on_hand')])`.
6. `supabase` (from `lib/supabaseClient.ts`) was constructed with
   `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` read from `.env` at build time
   via Vite's `import.meta.env`.
7. `supabase-js` issues two HTTPS GET requests to
   `https://wgvutexpbetkihwvswfj.supabase.co/rest/v1/stock_items?...` and
   `/v_stock_on_hand?...`, with an `apikey`/`Authorization: Bearer <token>`
   header — the anon key if no session exists, or the signed-in user's JWT if
   `useSession()` elsewhere in the app has established one (the same client
   instance is shared and stateful across the whole app).
8. PostgREST sets the Postgres session's role to `anon` or `authenticated`
   based on that JWT and runs the `select`.
9. Postgres evaluates RLS. For `anon`, `002`'s `demo_read` policy
   (`org_id in (select id from orgs where is_demo = true)`) admits only the
   four seeded demo rows. For `authenticated`, `001`'s `org_isolation` policy
   (`org_id = current_org_id()`) admits only that user's own org's rows, where
   `current_org_id()` is the `security definer` function
   `select org_id from profiles where id = auth.uid()`. `v_stock_on_hand` is
   `security_invoker = true`, so the same RLS check runs against its
   underlying `stock_items`/`stock_movements` tables for whichever role asked.
10. Rows return as JSON. `fetchStockItems()` builds a `Map` from the second
    result and merges it into the first, producing `StockItem[]`.
11. `MissionControl` calls `setItems(rows)` / `setLoadState('ready')`, React
    re-renders, and the "SKUs tracked" `SummaryTile` shows `items.length` —
    computed fresh in the render body, not memoized, not stored anywhere else.

**A write, traced line by line** (creating a Purchase Request):

1. User clicks "+ New purchase request" in `Procurement.tsx` →
   `setFormOpen(true)` mounts `PurchaseRequestForm`.
2. User submits the form; `handleSubmit` validates client-side, builds a
   `NewPurchaseRequestInput`, and calls the `onSubmit` prop —
   `Procurement.tsx`'s `handleCreate`.
3. `handleCreate` resolves `orgId`:
   `session ? await getOwnOrgId(session.user.id) : await getDemoOrgId()`.
   `getOwnOrgId` (`lib/userOrg.ts`) selects `org_id` from `profiles` where
   `id = userId`. `getDemoOrgId` (`lib/demoOrg.ts`) selects `id` from `orgs`
   where `is_demo = true`, cached after first call.
4. `createPurchaseRequest(input, orgId)` (`data/purchaseRequests.ts`) builds
   `prNumber = 'PR-' + Date.now()` and issues
   `supabase.from('purchase_requests').insert({org_id, pr_number,
   requested_by, department, needed_by, notes}).select('id').single()` — a
   POST to PostgREST under the caller's current role.
5. Postgres RLS on `INSERT`: for `anon`, `004`'s `demo_write_purchase_requests`
   policy (`with check (org_id in (select id from orgs where is_demo =
   true))`) — succeeds because `getDemoOrgId()` only ever returns that id. For
   `authenticated`, `001`'s `org_isolation` (`with check (org_id =
   current_org_id())`) — succeeds because `getOwnOrgId()` just read that exact
   value back from the same user's `profiles` row.
6. The new row's `id` returns; `createPurchaseRequest` builds line rows
   (`org_id`, `pr_id = that id`, `stock_item_id`, `description`, `qty`,
   `uom`) and issues a **second**, separate `supabase.from
   ('purchase_request_lines').insert(lineRows)` call, gated by the matching
   policy on that table. No transaction spans steps 4 and 6 — a failure here
   leaves the PR row committed with zero lines.
7. On success, `Procurement.handleCreate` calls `loadPurchaseRequests()`
   again — a fresh `fetchPurchaseRequests()` — replacing `items` state and
   re-rendering `PurchaseRequestTable` with the new row visible.

### 2. Data layer & Supabase

Every function that talks to Postgres, what it touches, and which RLS lane it
runs under (note: **no function branches on session for reads** — the identical
query runs regardless of auth state, and Postgres RLS alone determines which
rows come back; **exactly one function** — `Procurement.tsx`'s `handleCreate` —
branches explicitly):

| Function | File | Table/view | Columns | RLS lane |
|---|---|---|---|---|
| `fetchStockItems` | `data/stockItems.ts` | `stock_items` | id, sku, name, uom, reorder_level, reorder_qty, unit_cost, location | anon demo fence (002) or org_isolation (001), whichever the session implies |
| `fetchStockItems` | `data/stockItems.ts` | `v_stock_on_hand` | stock_item_id, on_hand | same, via `security_invoker` |
| `fetchPurchaseRequests` | `data/purchaseRequests.ts` | `purchase_requests` + embedded `purchase_request_lines(count)` | id, pr_number, requested_by, department, status, needed_by, notes, created_at | same dual-lane pattern |
| `createPurchaseRequest` | `data/purchaseRequests.ts` | `purchase_requests` (insert) | org_id, pr_number, requested_by, department, needed_by, notes | anon demo-write (004) or org_isolation insert (001) — **orgId is an explicit required parameter, not resolved here** |
| `createPurchaseRequest` | `data/purchaseRequests.ts` | `purchase_request_lines` (insert) | org_id, pr_id, stock_item_id, description, qty, uom | same as above, second request, no shared transaction |
| `getDemoOrgId` | `lib/demoOrg.ts` | `orgs` | id (where is_demo=true) | anon demo_read (002) |
| `getOwnOrgId` | `lib/userOrg.ts` | `profiles` | org_id (where id=userId) | authenticated profile_self (001) |
| `signInWithMagicLink` / `signOut` | `lib/auth.ts` | none (GoTrue Auth API, not Postgres) | n/a | n/a |
| `useSession` | `hooks/useSession.ts` | none (GoTrue Auth API) | n/a | n/a |

**Where org_id is resolved, hardcoded, or fenced:** No literal org UUID appears
anywhere in `apps/web/src` — confirmed by direct inspection of every file in
Part 1; the only place a UUID is hardcoded is `002_demo_seed.sql`'s seed data
(eleven fixed UUIDs, by design, for deterministic chain-linking). `getDemoOrgId`
and `getOwnOrgId` both *resolve* org_id dynamically via a live query rather than
embedding it, but `getDemoOrgId`'s fence ultimately bottoms out at the single
`is_demo = true` row created by `002` — if a second `is_demo = true` org were
ever seeded, `.single()` would throw at runtime. `getOwnOrgId` has no such
single-row assumption risk (a user has exactly one `profiles` row by the
table's own primary key on `auth.users.id`), but as of this audit exactly one
such mapping exists in the live database at all (the one created via the manual
SQL-Editor walkthrough).

### 3. Schema reality (migrations 001–005)

**Tables, and whether the app touches them:**

| Table | RLS policies | App reads? | App writes? |
|---|---|---|---|
| `orgs` | org_self (auth), demo_read (anon) | Yes — `getDemoOrgId`, `getOwnOrgId`'s join target | No |
| `profiles` | profile_self (auth) | Yes — `getOwnOrgId` reads `org_id` only; `full_name` and `role` are never read or written by any app code | No |
| `suppliers` | org_isolation (auth), demo_read (anon) | **No — zero references anywhere in `apps/web/src`** | No |
| `stock_items` | org_isolation, demo_read | Yes — `fetchStockItems` | No |
| `purchase_requests` | org_isolation, demo_read, demo_write (004, anon insert only) | Yes — `fetchPurchaseRequests` | Yes — `createPurchaseRequest` |
| `purchase_request_lines` | org_isolation, demo_read, demo_write (004) | Yes (via embedded count) | Yes |
| `quotations` | org_isolation, demo_read | **No** | No |
| `quotation_lines` | org_isolation, demo_read | **No** | No |
| `purchase_orders` | org_isolation, demo_read | **No** | No |
| `purchase_order_lines` | org_isolation, demo_read | **No** | No |
| `grns` | org_isolation, demo_read | **No** | No |
| `grn_lines` | org_isolation, demo_read | **No** | No |
| `invoices` | org_isolation, demo_read | **No** | No |
| `payments` | org_isolation, demo_read | **No** | No |
| `stock_movements` | org_isolation, demo_read | Indirectly only, via `v_stock_on_hand`'s `SUM` — never selected directly | No |
| `command.*` (6 tables, 003) | founder_all (founder role, which doesn't exist) | No — migration not run, schema not referenced anywhere | No |

Ten of the sixteen `public`-schema tables (62.5%) have zero application code
touching them in any way, despite nine of those ten being fully seeded with
realistic demo data by `002`. `suppliers` is the starkest case: it's referenced
by foreign key from `quotations`, `purchase_orders`, and `grns`, seeded with two
real rows, and never queried once by the front end.

**Views:** `v_stock_on_hand` is used (the only view the app actually queries).
`v_reorder_alerts` — which is defined as exactly `select * from
v_stock_on_hand where on_hand <= reorder_level` — is never queried; instead,
`MissionControl.tsx`, `Stores.tsx`, `StockOnHandList.tsx`, and `StockTable.tsx`
each independently re-implement the equivalent predicate
(`item.reorderLevel > 0 && item.onHand <= item.reorderLevel`, note the added
`> 0` guard the view doesn't have) in TypeScript. `v_quote_comparison` is
defined and never queried at all.

**Functions:** `current_org_id()` is exercised constantly but only indirectly
— it's invoked inside every `authenticated`-role RLS check, never called
directly by application code. `set_updated_at()` is wired via five triggers
(`trg_suppliers_updated`, `trg_stock_items_updated`,
`trg_purchase_requests_updated`, `trg_purchase_orders_updated`,
`trg_invoices_updated`) but is presently inert in practice: the app never
issues an `UPDATE` to any table anywhere (confirmed — every data-layer call is
`.select()` or `.insert()`, zero `.update()` calls exist in the codebase).

**Constraints:** every `check` constraint in `001` (purchase_requests.status,
quotations.status, purchase_orders.status, invoices.etims_status,
invoices.payment_status, payments.method, stock_movements.movement_type) is
defined and enforced by Postgres, but the app only ever relies on their
*default* values — nothing in the UI ever writes a non-default status to any of
these columns. `profiles.role`'s constraint was altered by `005`; nothing reads
the column's value anywhere in the app regardless of which four values are
legal.

**Tables that exist in SQL but have zero application UI:** `suppliers`,
`quotations`, `quotation_lines`, `purchase_orders`, `purchase_order_lines`,
`grns`, `grn_lines`, `invoices`, `payments`, `stock_movements` (read-only via
view aggregation), plus all six `command.*` tables (not even run).

### 4. Auth model

The full magic-link path, traced through actual code:

1. `AuthStatus.tsx`'s "Sign in" button → `App.tsx`'s `onSignInClick` →
   `setShowSignIn(true)`.
2. `App.tsx` renders `<SignIn onDone={...} />` in place of the active screen.
3. `SignIn.tsx`'s `handleSubmit` → `signInWithMagicLink(email)` (`lib/auth.ts`)
   → `supabase.auth.signInWithOtp({ email })` — a direct GoTrue API call; no
   custom `emailRedirectTo` is passed, so the redirect target is whatever the
   Supabase project's dashboard "Site URL" is configured to.
4. The user leaves the app, opens the email Supabase sends, clicks the link.
5. The link redirects the browser back to the configured Site URL with auth
   tokens in the URL fragment. `supabase-js`'s default `detectSessionInUrl`
   behavior parses these on load and persists a session to `localStorage`.
6. `useSession()` (`hooks/useSession.ts`) picks this up via its
   `onAuthStateChange` subscription (or the initial `getSession()` call,
   whichever resolves first), updating React state. **`App.tsx` and
   `Procurement.tsx` each call `useSession()` independently** — two live
   `onAuthStateChange` subscriptions exist simultaneously on the Procurement
   screen, not one shared value threaded through props.
7. **The profiles→org mapping is entirely manual.** There is no signup
   trigger anywhere in the schema (`003`'s commented-out `create role
   founder;` is the closest thing to a provisioning mechanism in the repo, and
   it's for an unrelated, unrun migration). A human must run `select id,
   email from auth.users order by created_at desc limit 5;` to find the new
   user's id, then a hand-written `with new_org as (insert into orgs (...)
   returning id) insert into profiles (id, org_id, full_name, role) select
   ..., 'owner' from new_org;` in the SQL Editor. Until that runs,
   `current_org_id()` resolves to `NULL` for that user and every
   `org_isolation`-gated query returns/accepts nothing.
8. Once provisioned, `current_org_id()` resolves correctly and every existing
   fetch function (none of which branch on session) starts returning that
   user's own org's rows automatically — purely a consequence of RLS, not of
   any new code path.

**The one explicit divergence point in code** is
`Procurement.tsx`: `const orgId = session ? await getOwnOrgId(session.user.id)
: await getDemoOrgId()`. Every read path has no equivalent branch — the
"lane" for reads is decided entirely inside Postgres, invisibly to the
TypeScript.

**Verified-live vs. assumed:** The anon/demo lane has direct, tool-captured
evidence from this project's own sessions — Playwright screenshots, body-text
dumps, and independent raw REST queries against the live Supabase project,
repeated across multiple turns including after the auth code was added (a
regression check). **The authenticated lane's actual end-to-end behavior — a
real magic-link click, a real redirect, a real session, the manual SQL
provisioning, and the resulting per-tenant isolation — has no equivalent
tool-captured evidence in this project's history.** It rests entirely on the
user's own report ("005 is applied and verified") and on `CLAUDE.md`'s own
"Both lanes proven live" claim, which was written based on that report, not on
an independent Playwright run or REST check exercising a real authenticated
session. This audit did not re-verify it either.

### 5. Wired vs. stubbed

**Nav items:** Mission Control (wired), Procurement (wired), Stores (wired),
Invoices (stubbed — `<ComingSoon title="Invoices" />`, literal placeholder
text, no fetch, no state).

**Screens:**
- **Mission Control** — wired. Live fetch; three `SummaryTile`s, all
  client-computed, none clickable; one read-only list.
- **Stores** — wired. Live fetch; search (functional, substring match); sort
  by Name or On hand (functional, verified live); two `SummaryTile`s, neither
  clickable; no write actions of any kind (no add-item, no movement entry).
- **Procurement** — wired, both read and write, both lanes. List is
  read-only (no row click, no detail view, no status-change control anywhere
  in `PurchaseRequestTable.tsx`). Create form is fully functional with
  client-side validation.
- **Sign In** — wired. Functional magic-link request; no email-format
  validation beyond the native HTML attribute.
- **Invoices** — stub only.

**Every interactive control that exists is wired to a real handler** — there
are no decorative/dead buttons anywhere in the current codebase (`Sidebar`'s
four nav buttons, `AuthStatus`'s sign-in/sign-out, `StockTable`'s two sort
headers, `PurchaseRequestForm`'s add-line/remove-line/submit/cancel,
`SignIn`'s submit/cancel — all confirmed wired by direct code inspection in
Part 1). The gaps in this app are entirely **absent** controls (no edit,
delete, approve, reject, detail-view, or click-through anywhere), not fake
ones. `SummaryTile` in particular has no `onClick` prop in its type at all —
the "click-through tiles" the gap-analysis doc calls for don't exist even as a
stub; the component's type signature doesn't support it yet.

### 6. Doc-vs-code drift

**PRD (`02`) functional requirements, FR-by-FR:**

| FR | Requirement | Status |
|---|---|---|
| FR-1 | Multi-tenant orgs + role-based access | Partial — multi-tenancy built; role-based access is schema-only, nothing in `apps/web` reads `profiles.role` |
| FR-2 | Stock items master | Partial — read-only; "master" implies CRUD, only read exists |
| FR-3 | Suppliers master | Not built — table exists, zero UI |
| FR-4 | PRs with line items + status workflow | Partial — create+list built; no status transitions beyond the implicit default |
| FR-5 | Quotations | Not built |
| FR-6 | Quote comparison | Not built (`v_quote_comparison` defined, unused) |
| FR-7 | Purchase Orders | Not built |
| FR-8 | GRNs | Not built |
| FR-9 | Supplier invoices, eTIMS fields | Not built (stub screen) |
| FR-10 | Payments | Not built |
| FR-11 | Live views (stock-on-hand / reorder alerts / quote comparison) | Partial — stock-on-hand built (via `v_stock_on_hand`); reorder alerts re-implemented in TS instead of querying `v_reorder_alerts`; quote comparison not built |
| FR-12 | Reorder/digest automation | Not built (no n8n anywhere) |
| FR-13 | PDF export | Not built |
| FR-14 | Live eTIMS transmission | Not built — correctly, per charter, sequenced to M5 |
| FR-15 | Audit trail on state changes | Not built — no state changes exist yet to audit |
| FR-16 | Excel/CSV import + de-dup | Not built in-app — `profile_source.py` is a separate offline CLI |
| FR-17 | WhatsApp intake → draft PR | Not built |
| FR-18 | QuickBooks export | Not built |
| FR-19 | Email/Outlook quote capture | Not built |

**RFC (`03`) divergences:**
- §3's architecture diagram includes n8n, Gemini, Cloudflare Pages, eTIMS, and
  M-Pesa boxes — none exist in the repo; only the PWA↔Supabase edge is real.
- §5: "roles (owner/officer/finance/viewer) enforced in policies and checked
  in UI" — false on both counts. No policy anywhere checks `profiles.role`;
  no UI reads it. Also note three different spellings of the second role
  across documents: RFC says "officer," IA says "Procurement," the schema
  (post-`005`) says `'procurement'` — never reconciled across the docs
  themselves.
- §6: "we generate TypeScript types from it (`supabase gen types`)" — false.
  Every row type in `data/*.ts` and `lib/*.ts` is hand-written, with unchecked
  `as Foo[]` casts; no `supabase gen types` invocation exists anywhere
  (confirmed: no such script in `package.json`, no generated-types file in
  `src/`).
- §9: CI/CD claims (commit lint, `supabase db start`/`db lint` in CI, AI
  review, Cloudflare Pages auto-build, release-please) — none exist; there is
  no `.github` directory in this repository at all.
- §7: the entire ingestion/adapter-library design has zero corresponding
  application code; only the standalone `profile_source.py` exists.

**IA (`04`) divergences:**
- §3 names five nav items (Dashboard, Procurement, Stores, Invoices &
  Payments, Master Data); the actual `Sidebar.tsx` has four ("Dashboard"
  renamed "Mission Control" in code, never reconciled in the doc; "Master
  Data" doesn't exist as a nav item at all).
- §7 lists fourteen screens with routes; only four have any code at all
  (Sign in — though as an in-app toggle, not a route; Dashboard/Mission
  Control; Purchase Requests list; Stock on Hand), and **there is no router
  anywhere in the codebase** — no `react-router` dependency, no `<Routes>`,
  no URL-based navigation of any kind. Every "route" in this document is
  conceptual only; the real app is one URL with client-state tab switching.
- §9's role-based access map is not enforced anywhere in application code or
  in any RLS policy (every policy checks only `org_id`, never `role`).

### 7. The six product modules

The user's framing names six modules — Procurement & Stores Control Tower,
Owner Daily Dashboard, WhatsApp CRM, Tender/Compliance Assistant, NGO Impact
Reporting, Autonomous Prospect Scout. **This exact six-item list does not
appear together in any single document in this repository** — it was read
across the full doc set (00–08, RFC, IA, CONTEXT_PACK, the two reference-only
analyses) and no file enumerates these six as a named set; some of these names
don't appear in the repo at all. What follows is the best-evidence mapping of
each to what actually exists in code today, stated plainly where there is no
repo evidence at all rather than inferring from outside knowledge.

1. **Procurement & Stores Control Tower** — built, partially. This is the
   actual subject of every other section of this audit: three live screens
   (Mission Control, Stores, Procurement), a real schema, real RLS, real
   auth. Far more complete than any of the other five.
2. **Owner Daily Dashboard** — thin partial. Mission Control is functionally
   this concept, but it's three static client-computed tiles and a read-only
   list — no daily digest, no automation (FR-12 is a "Should," not built), no
   WhatsApp/email/SMS delivery of anything.
3. **WhatsApp CRM** — not built. The PRD's FR-17 (WhatsApp intake → draft PR)
   and `docs/07`'s "messaging intake" adapter describe a feature of
   Procurement, not a standalone CRM, and neither has any code. No WhatsApp
   Cloud API integration, no contacts/leads table, no CRM concept exists
   anywhere in this repository. The closest adjacent idea, `command.prospects`
   (`003`, not run), is a founder BD-prospecting table, not a client-facing
   CRM.
4. **Tender/Compliance Assistant** — not built, and **not referenced anywhere
   in any document read for this audit.** A search across all nine planning
   docs, the RFC, the IA, both reference-only analyses, and CONTEXT_PACK
   turned up zero mentions of "tender" in this sense. The nearest adjacent
   concept is eTIMS tax compliance (`invoices.etims_status` etc.) — schema
   only, sequenced to M5, no code — which is a different kind of compliance
   (tax e-invoicing) than tender/bid compliance.
5. **NGO Impact Reporting** — not built. NGOs are named as a Tier-1 target
   *segment* (`docs/05`, `07`, `08`) whose "spine" is grant-to-report and
   whose differentiator is donor-ready reporting — but this is segment
   go-to-market language describing how the *same* Control Tower schema would
   be positioned for that segment, not a distinct module with its own tables
   or screens. No impact-metrics schema, no NGO-specific code exists.
6. **Autonomous Prospect Scout** — not built, but the most thoroughly
   specified of the five non-Control-Tower items *on paper*. `docs/
   command-station-v0.5.1-analysis.md` §3 names it explicitly (citing a Drive
   document, Master Context Pack v1, not present in this repo) and §7
   sequences it as build-order item 3 — after `003_command_core.sql` is run
   (it isn't) and after screens are ported onto it (they aren't). The
   document is explicit that even the *old* v0.5.1 tool this would replace
   has no real Scout engine either ("No engine generates prospects or
   intel... Scout shows hand-entered sheet rows"). Zero code exists for this
   anywhere in `apps/web`.

### 8. Debt & risks

- **`pr_number` is `` `PR-${Date.now()}` ``** (`data/purchaseRequests.ts`,
  `generatePrNumber()`) — explicitly flagged in its own code comment and in
  `CLAUDE.md`/`CONTEXT_PACK.md` as a shortcut. Relies entirely on the
  `unique(org_id, pr_number)` constraint to fail loudly on collision; no
  retry, no sequence, no server-assigned numbering.
- **No transaction across the two-insert PR-create path** — `purchase_
  requests` and `purchase_request_lines` are separate HTTP requests with no
  shared transaction or RPC. A failure on the second leaves an orphaned PR
  row with zero lines, surfaced only as a thrown `Error` string naming the PR
  number, with no automated cleanup or retry.
- **The anon demo-write surface (`004`) has no abuse mitigation** — no
  captcha, no rate limit, no per-org row cap. Once deployed publicly, anyone
  who finds the URL can insert unlimited purchase requests into the demo org
  indefinitely, logged out, forever.
- **Hardcoded seed UUIDs (`002`)** — eleven fixed UUIDs link the demo chain
  deterministically; intentional and reasonable for seed data, but it does
  mean `getDemoOrgId()`'s `.single()` call would throw at runtime if a second
  `is_demo = true` org were ever created.
- **Every Supabase response is an unchecked type cast** — `as StockItemRow[]`,
  `as { id: string }`, etc., appear in `stockItems.ts`, `purchaseRequests.ts`,
  `demoOrg.ts`, and `userOrg.ts`. None of these are runtime-validated; there
  is no `supabase gen types` pipeline (contradicting the RFC's own claim) and
  no schema-validation library (no zod/io-ts/etc. in `package.json`) — a
  silently-renamed column would surface as `undefined` at runtime, not a
  build error.
- **No tests exist anywhere in this repository** — no test runner is even a
  dependency (`package.json` has no `vitest`/`jest`/`@playwright/test` entry,
  no `test` script), and no `*.test.ts`/`__tests__` files exist. The
  Playwright verification done during this project's build sessions ran from
  a scratch directory outside the repo and was never committed as a
  repeatable test.
- **No error boundary** — `main.tsx` wraps `<App />` in `<StrictMode>` only;
  there is no `<ErrorBoundary>` anywhere. Each screen's `try/catch` covers
  only its own async fetch, not render-time exceptions; an uncaught render
  error anywhere blanks the entire app.
- **Duplicated low-stock predicate** — the exact expression
  `item.reorderLevel > 0 && item.onHand <= item.reorderLevel` is independently
  written in `MissionControl.tsx`, `Stores.tsx`, `StockOnHandList.tsx`, and
  `StockTable.tsx` — four copies of one business rule, none shared, despite
  `v_reorder_alerts` already encoding this exact rule server-side and never
  being queried.
- **Duplicated `inputClass` Tailwind string** — declared independently in
  `PurchaseRequestForm.tsx` and `SignIn.tsx`, and inlined uncommented a third
  time in `Stores.tsx`'s search input — three copies of the same ~140-
  character class string, no shared `components/` input primitive.
- **Duplicated load-state boilerplate** — the `'loading' | 'ready' | 'error'`
  union, the `useState` triple, the `cancelled`-flag `useEffect` pattern, and
  the try/catch error-message extraction are independently re-implemented in
  `MissionControl.tsx`, `Stores.tsx`, and `Procurement.tsx`, despite the
  codebase already having a `hooks/` directory (`useSession.ts`) that
  demonstrates the pattern for factoring this out.
- **`tsconfig.app.json`/`tsconfig.node.json` never set `"strict": true`** —
  this directly contradicts `CLAUDE.md`'s own stated non-negotiable rule,
  "TypeScript strict; functional components; named exports; keep components
  small." The functional/named-exports/small-components parts are true in
  practice; the strict-mode part is not actually configured.
- **No CI** — no `.github` directory anywhere in the repo, despite the
  Project Charter naming "100% of merges flow through the automated CI/CD...
  pipeline" as an explicit Objective-1 key result and the RFC describing a
  specific CI/CD design in detail.
- **No deployment** — Cloudflare Pages is the named target throughout every
  doc; nothing has been deployed (`CLAUDE.md`'s "Open follow-up" about the
  production redirect URL is forward-looking, for a site that doesn't exist
  yet).
- **Two simultaneous `onAuthStateChange` subscriptions** whenever the
  Procurement screen is mounted, since both `App.tsx` and `Procurement.tsx`
  call `useSession()` independently rather than sharing one subscription via
  context or props.
- **Root `/README.md` is stale** — still describes the "walking skeleton"
  stage and references a "Current goal" heading in `CLAUDE.md` that no longer
  exists there (now "Current state"/"Next step"). `apps/web/README.md` is
  the unmodified Vite template, with no project-specific content at all.

### 9. Verification state

**Tested live with direct tool evidence** (Playwright screenshots, body-text
dumps, and/or independent raw REST queries against the live Supabase project,
captured across this project's build sessions):
- Mission Control: live read of the 4-SKU demo data, desktop + mobile
  viewports, correct on-hand/reorder/stock-value numbers cross-checked by
  manual recomputation.
- Stores: live read, search filtering, sort-by-name and sort-by-on-hand
  (re-verified after an initial flaky test run traced to a Playwright
  selector bug, not an app bug), empty-state-on-no-match.
- Procurement list: live read of the seeded `PR-2026-001`.
- Procurement create (anon lane): full create flow — stock-item line +
  free-text line — verified via Playwright interaction AND independently
  cross-checked via raw REST queries confirming `org_id` on both the new PR
  row and its line rows exactly matched the demo org id.
- Post-auth-build regression: Mission Control, Stores, and Procurement's demo
  data all re-confirmed unchanged after the auth code was added; zero
  console errors; the Sign In screen opens and its Cancel button returns
  cleanly.
- Form validation: empty submit, requester-only submit, and a
  quantity-without-description line were each driven through the real form
  and confirmed to block submission (with the one previously-noted
  imprecision in the third case's error message).

**Reported by the user but not independently verified by tooling in this
audit or any prior session of this project:**
- The authenticated lane's actual magic-link round trip: the real email
  click, the redirect landing on `localhost:5173`, the session establishing,
  and the manual SQL provisioning succeeding. No Playwright run or REST query
  in this project's history exercises a real signed-in session — every
  tool-captured Procurement screenshot that shows a session-aware UI state
  was captured in the **signed-out** state (`AuthStatus` reading "Viewing the
  demo org (signed out)").
- Migration `005`'s live application — confirmed only by the user's own
  statement ("005 is applied and verified"); never independently queried via
  `information_schema` in any tool call.
- That `002`/`004`'s policies remain exactly as written in the live database
  — confirmed only behaviorally (reads/writes kept working in later test
  runs), never by directly querying `pg_policies`.
- `profile_source.py` — read for correctness via code review only; never
  executed against a real file in this project.
- Any Cloudflare Pages deployment — never attempted in this project at all;
  the "production redirect URL" note in `CLAUDE.md` is purely forward-looking.
