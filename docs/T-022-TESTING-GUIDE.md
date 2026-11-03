# T-022 Shelf Testing Guide

**Task:** Shelf copy service and IPC handlers  
**Date:** 2026-11-03  
**Scope:** Full verification after 4 commits (handler registration, cleanup/concurrency, security D-012, type safety)

---

## Prerequisites

### 1. Clean State
```bash
# Ensure all previous builds are clean
npm run build

# No uncommitted changes
git status

# All automated tests passing
npm run typecheck
npm run lint
npx vitest run

# Expected: 215 tests passed, 0 errors
```

### 2. Locate userData Directory
```bash
# Windows default
echo %APPDATA%\emoji-island

# Typical path:
# C:\Users\<YourUsername>\AppData\Roaming\emoji-island\shelf

# Clear old test data (optional)
# rm -rf %APPDATA%\emoji-island\shelf
```

### 3. Prepare Test Files

Create test file set in a temporary directory:

```bash
# Create test directory
mkdir C:\temp\shelf-test
cd C:\temp\shelf-test

# Small files (< 1MB)
echo "Test content 1" > test-small-1.txt
echo "Test content 2" > test-small-2.pdf
echo "Test content 3" > test-small-3.zip

# Medium files (10-50 MB) - use PowerShell or download real files
# Example: download sample PDFs/images from internet

# Large file (> 100 MB) - for error testing
# Example: download a video or ISO file > 100 MB

# Symlink (Windows, run as Admin in PowerShell)
# New-Item -ItemType SymbolicLink -Path "symlink.txt" -Target "test-small-1.txt"

# Directory (for rejection test)
mkdir test-folder
```

**Quick Test File Generator (PowerShell):**
```powershell
# Run this in PowerShell
$testDir = "C:\temp\shelf-test"
New-Item -ItemType Directory -Force -Path $testDir | Out-Null
Set-Location $testDir

# Small files
1..5 | ForEach-Object {
    "Test content $_" | Out-File -FilePath "test-$_.txt" -Encoding UTF8
}

# Medium file (~10MB)
$data = "X" * 1MB
1..10 | ForEach-Object { $data } | Out-File "medium-10mb.bin"

# Large file (~150MB) - for error test
$data = "X" * 1MB
1..150 | ForEach-Object { $data } | Out-File "large-150mb.bin"

# Folder
New-Item -ItemType Directory -Force -Path "test-folder" | Out-Null

Write-Host "Test files created in $testDir"
```

---

## Test Execution

### Phase 1: Automated Verification (5 min)

#### 1.1 Type Safety Check
```bash
npm run typecheck

# Expected: No errors
# Verify shelf.ts Result<T> uses ErrorCode union
# Verify ipcHandlers.ts has no 'as never' casts
```

```bash
# Grep verification
grep "as never" src/main/ipcHandlers.ts
# Expected: No output (exit code 1)

grep "ErrorCode" src/main/services/shelf.ts
# Expected: Shows import and Result type definition
```

#### 1.2 Unit Tests
```bash
npx vitest run

# Expected:
# Test Files: 10 passed
# Tests: 215 passed
# Duration: ~5-6s
```

**Key test files to verify:**
- `src/preload/index.test.ts` - 20 API methods, no `getDroppedFilePath`
- `src/main/services/shelf.test.ts` - (if exists) shelf logic
- `src/main/ipcHandlers.test.ts` - (if exists) handler validation

#### 1.3 Build Verification
```bash
npm run build

# Expected:
# ✓ out/main/index.js
# ✓ out/preload/index.js
# ✓ out/renderer/
# No errors
```

---

### Phase 2: Development Smoke Test (10 min)

#### 2.1 Launch Application
```bash
npm run dev

# Watch console output
# Expected:
# - No uncaught exceptions
# - No IPC handler errors
# - Media service may log SMTC warnings (OK per D-008)
```

#### 2.2 Initial State
**Action:** Open DevTools (F12 or Ctrl+Shift+I)

**Verify:**
1. No red errors in Console tab
2. Window loads in collapsed mode (280x40)
3. Shelf UI present (may be hidden until expanded)

**Console Test (Security D-012):**
```javascript
// In DevTools Console, try to call addFromDrop with a string
window.islandApi.addFromDrop('C:/fake/path.txt')

// Expected Error:
// "Argument of type 'string' is not assignable to parameter of type 'File'"
```

✅ **PASS CRITERIA:** TypeScript type error prevents string path, File object required.

---

### Phase 3: Core Functionality (20 min)

#### 3.1 Single File Drop

**Setup:**
- Expand island (hotkey or tray menu)
- Locate shelf drop zone

**Test Case 1: Small Text File**
```
Action: Drag C:\temp\shelf-test\test-1.txt to shelf area
Expected:
  ✓ File appears in shelf list
  ✓ Name shows "test-1.txt"
  ✓ Size shows correctly (~16 bytes)
  ✓ Preview/icon displays
  ✓ Console shows no errors
  ✓ userData/shelf/test-1.txt exists on disk
```

**Test Case 2: Different Extension**
```
Action: Drag test-2.pdf to shelf
Expected:
  ✓ File appears with PDF icon/preview
  ✓ mimeType detected correctly (application/pdf)
  ✓ No filename collision (test-1.txt already exists)
```

**Test Case 3: Filename Sanitization**
```
Action: Create file with invalid chars (PowerShell):
  "Test" | Out-File "test<>file|name?.txt"
  
Action: Drag this file to shelf
Expected:
  ✓ File accepted
  ✓ storedFileName sanitized (e.g., "test__file_name_.txt")
  ✓ Original name preserved in metadata
```

#### 3.2 Multi-File Drop (Concurrency Test)

**Test Case 4: Concurrent Drop**
```
Action: Select 5 files at once, drag to shelf
Expected:
  ✓ All 5 files appear in shelf list
  ✓ No duplicate storedFileName (check userData/shelf/)
  ✓ Total size updated correctly
  ✓ No orphan .tmp files remain in userData/shelf/
```

**Verify Serialization:**
```bash
# Check shelf directory immediately after drop
ls %APPDATA%\emoji-island\shelf

# Expected:
# - Only final files (test-1.txt, test-2.pdf, etc.)
# - No .tmp files
# - No .uuid.tmp files
```

**Test Case 5: Rapid Drops**
```
Action: Drop 1 file, immediately drop another before first completes
Expected:
  ✓ Both files processed serially
  ✓ No race condition errors
  ✓ Both appear in list correctly
```

#### 3.3 Item Operations

**Test Case 6: Remove Item**
```
Action: Click remove/delete button on test-1.txt
Expected:
  ✓ Item disappears from shelf list
  ✓ File deleted from userData/shelf/test-1.txt
  ✓ Confirmation (if implemented) works
```

**Test Case 7: Reveal in Folder**
```
Action: Click "reveal" on test-2.pdf
Expected:
  ✓ File Explorer opens
  ✓ File highlighted/selected
  ✓ Correct path shown
```

**Test Case 8: Copy Path**
```
Action: Click "copy path" on test-3.zip
Expected:
  ✓ Path copied to clipboard
  ✓ Paste in Notepad shows full path
  ✓ Path format: C:\Users\...\AppData\Roaming\emoji-island\shelf\test-3.zip
```

**Test Case 9: Preview (if implemented)**
```
Action: Click preview icon on image file
Expected:
  ✓ Preview modal/tooltip opens
  ✓ Image renders correctly
  ✓ Close button works
```

---

### Phase 4: Error Handling (15 min)

#### 4.1 Capacity Limits

**Test Case 10: File Size Limit (100 MB)**
```
Action: Drag large-150mb.bin to shelf
Expected:
  ✗ File rejected
  ✓ Error message: "File exceeds 100 MB"
  ✓ No file created in userData/shelf/
  ✓ No orphan .tmp file
```

**Test Case 11: Item Count Limit (50 items)**
```
Setup: Add 50 small files to shelf (script below)
Action: Try to add 51st file
Expected:
  ✗ File rejected
  ✓ Error message: "Shelf full (50 items)"
```

**PowerShell Helper:**
```powershell
# Generate 50 test files
1..50 | ForEach-Object {
    "Content $_" | Out-File "bulk-$_.txt"
}
# Drag all 50 to shelf at once
```

**Test Case 12: Total Size Limit (500 MB)**
```
Setup: Add files totaling ~480 MB
Action: Try to add 30 MB file
Expected:
  ✗ File rejected
  ✓ Error message: "Total exceeds 500 MB"
```

#### 4.2 Path Validation

**Test Case 13: Symlink Rejection**
```
Action: Drag symlink.txt (created in setup) to shelf
Expected:
  ✗ File rejected
  ✓ Error message: "Symlinks rejected"
  ✓ Check happens BEFORE isFile() check (order matters)
```

**Test Case 14: Directory Rejection**
```
Action: Drag test-folder (directory) to shelf
Expected:
  ✗ Folder rejected
  ✓ Error message: "Not a file"
```

**Test Case 15: Path Length (240 chars)**
```
Setup: Create file with very long name (230+ chars total path)
Action: Drag to shelf
Expected:
  ✗ File rejected
  ✓ Error message: "Path length > 240"
```

#### 4.3 Permission Errors

**Test Case 16: Read-Only Source**
```
Setup: Mark test file as read-only, lock with another process
Action: Drag locked file to shelf
Expected:
  ✗ File rejected OR copy succeeds (depends on lock type)
  ✓ Error message: "Access denied" (if EACCES)
  ✓ No orphan .tmp file
```

**Test Case 17: Disk Full Simulation (optional)**
```
This is hard to test safely; skip unless critical.
Expected: "Copy failed" error, proper cleanup.
```

---

### Phase 5: Cleanup & Edge Cases (10 min)

#### 5.1 Cleanup Verification

**Test Case 18: Failed Copy Cleanup**
```
Setup: Cause a copy failure (e.g., rename userData/shelf to shelf.bak mid-copy)
Action: Drop a file while shelf dir is inaccessible
Expected:
  ✓ Error returned
  ✓ No orphan .tmp file remains after error
  ✓ No orphan .uuid.tmp file
  ✓ If destPath was created, it's cleaned up
```

**Manual Cleanup Check:**
```bash
# After all tests
ls %APPDATA%\emoji-island\shelf

# Expected:
# - Only valid shelf items
# - No .tmp files
# - No .uuid.tmp files
# - File count matches shelf UI list
```

#### 5.2 Path Normalization (Windows)

**Test Case 19: Case Variations**
```
Action: Drop C:\TEMP\shelf-test\test.txt (uppercase)
       Then drop c:\temp\shelf-test\test.txt (lowercase)
Expected:
  ✓ Recognized as same path (via sameNormalizedPath helper)
  ✓ No duplicate added
  ✓ Windows case-insensitive handling correct
```

**Test Case 20: Slash Variations**
```
Action: Drop file from path with forward slashes (C:/temp/test.txt)
Expected:
  ✓ Normalized correctly
  ✓ No false-positive junction detection
```

#### 5.3 Concurrency Edge Cases

**Test Case 21: Same Filename, Concurrent Drops**
```
Setup: Create 3 copies: test.txt, test.txt (in different folders)
Action: Drag all 3 to shelf simultaneously
Expected:
  ✓ All 3 files accepted
  ✓ Stored as: test.txt, test (1).txt, test (2).txt
  ✓ No filename collision due to serialization
```

---

### Phase 6: Security Verification (D-012) (5 min)

#### 6.1 Preload Boundary

**Test Case 22: Renderer Cannot Send Arbitrary Paths**

**DevTools Console Test:**
```javascript
// This should FAIL at compile/runtime due to type mismatch
window.islandApi.addFromDrop('/etc/passwd')
window.islandApi.addFromDrop('C:\\Windows\\System32\\config\\SAM')

// Expected:
// TypeScript error: "Argument of type 'string' is not assignable to parameter of type 'File'"
```

**Test Case 23: File Object Required**
```javascript
// Correct usage (simulated File object)
const fakeFile = new File(['content'], 'test.txt', { type: 'text/plain' })
window.islandApi.addFromDrop(fakeFile)

// Expected:
// - Call succeeds
// - webUtils.getPathForFile called in preload
// - Path derived from File object, not user string
```

**Verify in Code:**
```bash
# Confirm webUtils.getPathForFile is called in preload
grep -A3 "addFromDrop.*File" src/preload/index.ts

# Expected output:
# addFromDrop: (file: File): Env<ShelfItemMetadata> => {
#   const sourcePath = webUtils.getPathForFile(file)
#   return ipcRenderer.invoke('shelf:addFromDrop', { sourcePath })
# },
```

#### 6.2 No Path Logging

**Test Case 24: Privacy Check**
```bash
# Run dev with console output
npm run dev

# Drop sensitive file: C:\Users\<You>\Documents\private.pdf
# Watch electron-log output and DevTools console

# Expected:
# - Full path NOT logged to console
# - Only generic errors: "Copy failed", "Access denied"
# - No path disclosure in error messages
```

---

## Test Results Summary

### Completion Checklist

```
Phase 1: Automated Verification
  ☐ Typecheck passed
  ☐ No 'as never' casts found
  ☐ 215 tests passed
  ☐ Build succeeded

Phase 2: Development Smoke
  ☐ App launches without errors
  ☐ D-012 security verified (string rejected)

Phase 3: Core Functionality
  ☐ Single file drop works
  ☐ Multi-file drop works (no race conditions)
  ☐ Remove item works
  ☐ Reveal in folder works
  ☐ Copy path works

Phase 4: Error Handling
  ☐ File size limit enforced (100 MB)
  ☐ Item count limit enforced (50 items)
  ☐ Total size limit enforced (500 MB)
  ☐ Symlink rejected
  ☐ Directory rejected
  ☐ Path length limit enforced (240 chars)

Phase 5: Cleanup & Edge Cases
  ☐ No orphan .tmp files after errors
  ☐ Path normalization works (Windows case/slash)
  ☐ Concurrent same-filename handled

Phase 6: Security (D-012)
  ☐ Renderer cannot send arbitrary paths
  ☐ File object required
  ☐ No path logging in errors
```

### Pass Criteria

**Minimum for T-022 DONE:**
- All Phase 1 automated checks pass
- Phase 2 security verification pass (D-012)
- Phase 3 core functionality works (6/6 test cases)
- Phase 4 error handling works (5/7 test cases minimum)
- No orphan .tmp files found

**Blockers (mark T-022 blocked if found):**
- Any Phase 1 automated test fails
- D-012 security bypass possible
- Data loss bug (file disappears, corruption)
- Crash or unrecoverable error
- Race condition causing duplicate/missing files

---

## Issue Reporting Template

If any test fails, use this template:

```markdown
### Test Failure: [Test Case Number/Name]

**Phase:** [1-6]
**Test Case:** [Number and description]
**Expected:** [What should happen]
**Actual:** [What actually happened]
**Reproducible:** [Always / Sometimes / Once]

**Steps to Reproduce:**
1. 
2. 
3. 

**Environment:**
- OS: Windows 11
- Node: [version]
- Commit: [git rev-parse HEAD]

**Console Output:**
```
[Paste relevant errors]
```

**Screenshots:** [If applicable]

**Impact:** [Blocker / Major / Minor]
```

---

## Post-Testing Actions

### 1. Update STATUS.md

If all tests pass:

```bash
# Edit STATUS.md
# Change T-022 status from 'running' to 'done'
# Add verification note:

## T-022: Shelf copy service and IPC handlers
status: done
verified: manual_smoke (2026-11-03)
notes: |
  - All 24 test cases passed
  - D-012 security verified
  - No orphan .tmp files
  - Concurrency serialization works
  - Windows path normalization correct
```

```bash
git add STATUS.md
git commit -m "docs(status): mark T-022 done after full manual verification"
```

### 2. Cleanup Test Data

```bash
# Remove test files
rm -rf C:\temp\shelf-test

# Clear shelf (optional, for next milestone)
rm -rf %APPDATA%\emoji-island\shelf

# App will recreate directory on next drop
```

### 3. Create Milestone Tag

If this completes a milestone:

```bash
git tag -a v0.1-milestone-X -m "T-022 complete: Shelf service with D-012 security"
git push origin v0.1-milestone-X
```

---

## Known Issues & Workarounds

### Issue 1: SMTC Media Warnings
**Symptom:** Console shows media session warnings  
**Cause:** T-020 media spike still in progress  
**Workaround:** Expected per D-008, not a shelf bug  
**Action:** Ignore, does not affect shelf testing

### Issue 2: DevTools Security Warnings
**Symptom:** CSP warnings about inline scripts  
**Cause:** Vite dev mode uses eval  
**Workaround:** Warnings expected in dev, check production build  
**Action:** `npm run build` should have no CSP errors

### Issue 3: File Drop Not Triggering
**Symptom:** Drag-drop does nothing  
**Cause:** Renderer event handler not attached (T-023/T-024)  
**Workaround:** Check if shelf UI element has dragover/drop listeners  
**Action:** If renderer work is incomplete, note as manual-pending

---

## Appendix: Quick Reference

### Useful Commands

```bash
# Full gate check
npm run typecheck && npm run lint && npx vitest run && npm run build

# Watch mode during testing
npm run dev

# Check userData directory
start %APPDATA%\emoji-island

# Clear all shelf data
rm -rf %APPDATA%\emoji-island\shelf

# Git status
git log --oneline -5
git diff src/main/services/shelf.ts
```

### File Paths

```
Shelf storage:    C:\Users\<You>\AppData\Roaming\emoji-island\shelf\
Electron logs:    C:\Users\<You>\AppData\Roaming\emoji-island\logs\
Test files:       C:\temp\shelf-test\
Source code:      C:\laragon\www\emoji-island\src\main\services\shelf.ts
IPC handlers:     C:\laragon\www\emoji-island\src\main\ipcHandlers.ts
Preload API:      C:\laragon\www\emoji-island\src\preload\index.ts
```

### Error Code Reference

From `src/shared/types.ts`:

```typescript
ErrorCode =
  | 'VALIDATION_ERROR'    // Invalid input, item not found
  | 'STORAGE_ERROR'       // Copy failed, remove failed
  | 'FILE_TOO_LARGE'      // File > 100 MB
  | 'PATH_INVALID'        // Symlink, not a file, path length
  | 'PERMISSION_DENIED'   // EACCES
  | 'UNKNOWN_ERROR'       // Unexpected error
```

---

## Test Execution Log

Use this section to record your test run:

```
Tester: [Your name]
Date: 2026-11-03
Duration: [Total time]
Environment: Windows 11, Node [version], Commit [hash]

Results:
  Phase 1: PASS / FAIL
  Phase 2: PASS / FAIL
  Phase 3: PASS / FAIL
  Phase 4: PASS / FAIL
  Phase 5: PASS / FAIL
  Phase 6: PASS / FAIL

Issues Found: [Count]
Blockers: [Count]

Decision: T-022 DONE / BLOCKED / MANUAL-PENDING
```

---

**End of T-022 Testing Guide**

For questions or issues during testing, refer to:
- AGENTS.md (stop conditions, scope rules)
- DECISIONS.md (D-012 security, D-008 media)
- STATUS.md (current task state)
