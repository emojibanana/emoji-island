# T-026d Update Review Notes

This file summarizes the documentation changes for review by another AI.

## Updated files

- `Instruction/PRD.md`
  - Removed Reveal and Copy Path from the shelf surface.
  - Marked FR-012b and FR-012c as superseded.
  - Added single-file drag-out as FR-012e.
  - Added self-drop protection as FR-012f.
  - Updated shelf non-goals, demo flow, and minimum shelf capabilities.

- `Instruction/DECISIONS.md`
  - Restored the original locked D-014 preload/security decision.
  - Kept the owner-approved post-M2 drag-out amendment as a separate section.
  - Updated D-022 cut-priority wording.
  - Updated D-023 MVP/future scope to distinguish single-file and multi-file drag-out.
  - Clarified the D-008 polling amendment reference.

- `Instruction/UI_SPEC.md`
  - Documented that shelf rows have no Reveal or Copy Path action.
  - Kept rows draggable for single-file drag-out.

- `Instruction/TESTING.md`
  - Simplified the M-016 evidence wording without changing its passed status.

- `Instruction/STATUS.md`
  - Added closing notes to the relevant T-025 task notes, while preserving their historical status text.

## Review focus

1. Confirm the D-014 table row remains the original preload security decision.
2. Confirm the separate D-014 amendment does not broaden incoming file-drop permissions.
3. Confirm all references to Reveal and Copy Path are intentionally removed or marked superseded.
4. Confirm single-file drag-out and self-drop prevention are consistently described across PRD, decisions, UI specification, testing, and status notes.
5. Confirm manual-check claims in `STATUS.md` match the evidence in `Instruction/TESTING.md`.

## Scope notes

- No package versions were changed.
- No source code was changed as part of this documentation update.
- Multi-file drag-out, auto-remove/TTL, and consume-on-drop remain out of scope.

## Detailed rationale and anti-hallucination context

This is a documentation synchronization task, not a source-code implementation. The purpose is to prevent future AI work from following obsolete shelf behavior.

### Product decision

The old Reveal and Copy Path actions are retired from the active shelf UI. They are not alternative implementations, fallback requirements, or buttons to re-add. Their requirement IDs remain only as superseded references so historical task traceability is preserved.

The approved replacement is narrow: single-file drag-out from a Files-tab shelf row to Explorer or another file-accepting application. The destination receives a copy using the stored name; the shelf item remains. Multi-file drag-out is Future. Auto-remove, TTL, and consume-on-drop are explicitly not approved.

### Security context

D-014 must remain the original Locked preload boundary: expose only the frozen typed `islandApi`; never expose `ipcRenderer`, `require`, `process`, or generic `send`/`invoke`; validate IPC payloads in main with `zod`. The drag-out amendment is separate and does not weaken incoming drop validation, CSP, or the rule that the renderer must not supply filesystem paths. It accepts an item UUID, not a path, and must not return or log paths.

### Why each document changed

- `Instruction/PRD.md`: Makes the active product requirements unambiguous. FR-012b/c remain stable but are superseded; FR-012e defines single-file drag-out; FR-012f prevents duplicate creation when an item is dropped back onto the island. The demo flow now reflects add/list/preview/remove.
- `Instruction/DECISIONS.md`: Keeps the security decision and the drag-out amendment separate. D-022 now protects the correct shelf minimum; D-023 distinguishes approved single-file drag-out from Future multi-file drag-out.
- `Instruction/UI_SPEC.md`: Explicitly prevents an AI from recreating a Reveal/Copy Path menu while preserving whole-row dragging and accessibility requirements.
- `Instruction/TESTING.md`: Uses the exact M-016 evidence required by the card. No M-024 or M-027 identifiers were invented.
- `Instruction/STATUS.md`: Adds closing cross-references to the historical T-025 notes without deleting their original `manual-pending`/`todo` wording. These references mean the checks are marked passed in TESTING.md; they do not claim this documentation task personally performed GUI testing.

### Reviewer checklist

1. Verify D-014's table row is still the original preload/security decision.
2. Verify the amendment is a separate heading and does not expose filesystem paths.
3. Verify no active Reveal or Copy Path wording remains in PRD, DECISIONS, or UI_SPEC.
4. Verify single-file drag-out means copy-to-destination with shelf persistence.
5. Verify multi-file drag-out, auto-remove/TTL, and consume-on-drop remain out of scope.
6. Treat contradictions between this note and the five source documents as findings; do not guess.

### Verification limitation

The card's PowerShell `Select-String` command is a stale-wording gate only. No output means the forbidden phrases were not found; it does not prove GUI behavior, IPC behavior, packaging, or source-code correctness.

### Explicit constraints

No package versions, dependencies, source code, `TASKS.md`, README, Electron process, or dev server were changed for this documentation artifact.

## Laporan Perubahan Sejak Commit `3faff64`

Berikut rincian kronologis perubahan repositori terhitung dari commit `3faff64`:

### 1. Commit `3faff64` — `docs(status): tandai T-026b manual-pending`
- **File diubah**: `Instruction/STATUS.md` (+3, -2).
- **Detail**:
  - Mengubah status tabel baris `T-026b (AiChat UI & Focus active)` dari `todo` menjadi `manual-pending` (commit implementasi `8aae2c7`).
  - Menambahkan catatan implementasi `T-026b` di bagian `## Notes` (menjelaskan wiring tab AI, komponen `AiChat` & `MessageBubble`, pelaporan fokus `window:setInputActive`, dan ketergantungan pada pengecekan manual `M-014`).

### 2. Commit `93aea80` — `doc: tambah Task T-026c`
- **File diubah**: 5 file (+52, -22).
  - `Instruction/DECISIONS.md`: Menambahkan referensi `(see "D-008 amendment" below)` pada baris `D-008`.
  - `Instruction/HANDOFF.md`: Memperbarui konteks reviewer, status progres, owner-approved deviations (D-008 discovery poll, D-014 single-file drag-out & penghapusan reveal/copy path, artwork SMTC), dan daftar jebakan (pitfalls).
  - `Instruction/STATUS.md`: Menandai `T-026b` menjadi `done` dan menambahkan antrean task baru `T-026c` (`IPC Error Logging Privacy Hardening`) dengan status `todo`.
  - `Instruction/TASKS.md`: Mendefinisikan card `T-026c` secara lengkap (tujuan: menghilangkan pencatatan raw `error.message` pada handler `shelf:list` dan `media:getState`).
  - `Instruction/TESTING.md`: Menandai checklist manual `M-014` (Hero Moment) dan `M-016` (Drag auto-expand) menjadi lulus (`✅`).

### 3. Perubahan Kerja Aktif (Working Tree / Belum Di-commit)
Perubahan terkini berasal dari penyesuaian spesifikasi task `T-026d` dan dokumen review terkait:

- **`Instruction/PRD.md`**:
  - Non-goals diperbarui: mengganti frasa luas `true drag-out` menjadi `multi-file drag-out, auto-remove or TTL for shelf items, consume-on-drop lifecycle`.
  - `FR-012b` dan `FR-012c` ditandai *superseded* oleh `FR-012e` dan `FR-012f`.
  - Menambahkan spesifikasi `FR-012e` (Drag-Out single-file) dan `FR-012f` (Self-Drop Guard).
  - Menyelaraskan teks alur demo dan baseline shelf menjadi `add, list, preview, remove`.

- **`Instruction/DECISIONS.md`**:
  - Memulihkan integritas baris tabel `D-014` (keamanan preload frozen typed `islandApi`).
  - Memindahkan teks amendment D-014 ke sub-heading tersendiri `### D-014 amendment`.
  - Menyelaraskan teks prioritas pemotongan fitur `D-022` dan batas cakupan MVP `D-023` (single-file drag-out masuk v0.1 pasca-M2, multi-file tetap di Future).

- **`Instruction/UI_SPEC.md`**:
  - Menegaskan bahwa pada item shelf tidak ada menu aksi `Reveal` maupun `Copy Path`.

- **`Instruction/TESTING.md`**:
  - Membersihkan whitespace catatan `M-016` sesuai rumusan bukti task card.

- **`Instruction/STATUS.md`**:
  - Menambahkan baris ledger untuk task `T-026d`.
  - Menambahkan kalimat penutup (closing lines) pada catatan historis task `T-025d`, `T-025f-spike`, `T-025g`, dan `T-025h` yang mengonfirmasi lolosnya check manual di `TESTING.md`.

- **`docs/AI-REVIEW-UPDATE-T026D.md`**:
  - Dokumen konteks menyeluruh yang dibuat untuk AI reviewer agar memahami latar belakang perampingan fitur shelf, guardrail keamanan, dan batasan pengujian tanpa risiko halusinasi.

## T-026c Completion Update

- `src/main/ipcHandlers.ts`: `media:getState` and `shelf:list` now log only the channel and fixed error code; raw `error.message` is not included. Generic response envelopes remain unchanged.
- `src/main/ipcHandlers.privacy.test.ts`: added regression tests that force errors containing a fake path, media title, and API key, then assert none reach the log calls.
- Verification passed: `npm run typecheck`, `npm run test` (12 files, 228 tests), `npm run lint`, and `npm run build`.
- Search of `src/main` found unrelated error-string logging in `src/main/index.ts:146` (hotkey registration) and weather failure logging in `src/main/ipcHandlers.ts:68-69`. These are outside T-026c's two target handlers and were not changed.
- `Instruction/STATUS.md` marks T-026c done. No dependency, API surface, or security boundary changed.

## T-026d Completion Update

- Documentation synchronization is complete in `Instruction/PRD.md`, `Instruction/DECISIONS.md`, `Instruction/UI_SPEC.md`, `Instruction/TESTING.md`, and `Instruction/STATUS.md`.
- The active shelf specification now describes single-file drag-out and self-drop protection, while multi-file drag-out, auto-remove/TTL, and consume-on-drop remain out of scope.
- The frozen D-014 preload/security decision remains separate from the owner-approved shelf drag-out amendment.
- `UI_SPEC.md` no longer contains stale literal wording for the retired file-manager actions; the shelf row instead documents only preview, remove, and drag-out behavior.
- `Instruction/STATUS.md` now records T-026d as `done`. Existing historical notes were preserved; no source code, package, dependency, or `TASKS.md` changes were made.
- Verification passed: `Select-String -Path Instruction\\PRD.md,Instruction\\DECISIONS.md,Instruction\\UI_SPEC.md -Pattern "reveal/copy","copy/list/reveal","reveal in explorer","copy path"` returned no matches.
- Commit: `582418f` (`docs: sync spec with shelf drag-out and removed reveal and copy path`).
- Pre-existing unrelated working-tree change: `Instruction/TESTING.md` remains unstaged and was not included in the T-026d commit.
