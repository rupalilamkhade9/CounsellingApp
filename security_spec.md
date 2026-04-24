# Security Specification - CounselingExpert

## Data Invariants
1. **User Profiles**: A user can only create/update their own profile. Roles (admin, counselor) cannot be self-assigned.
2. **Documents**: Documents must belong to a valid user. Only the owner or an assigned counselor/admin can read/write.
3. **Cutoffs**: Read-only for public students. Write-only for admins.
4. **Chat Messages**: Messages can only be read/written by participants (sender or receiver).

## The Dirty Dozen Payloads

### 1. Identity Spoofing (Profile)
**Payload**: `create { uid: 'target_uid', name: 'Attacker' }` to `/users/attacker_uid`
**Result**: `PERMISSION_DENIED` (userId mismatch)

### 2. Privilege Escalation
**Payload**: `update { role: 'admin' }` by a student.
**Result**: `PERMISSION_DENIED` (role is immutable for students)

### 3. State Shortcutting (Documents)
**Payload**: `update { status: 'Verified' }` by a student.
**Result**: `PERMISSION_DENIED` (status check fails `affectedKeys`)

### 4. Shadow Field Injection
**Payload**: `update { isVerified: true, ... }`
**Result**: `PERMISSION_DENIED` (`affectedKeys().hasOnly()` gate)

### 5. Path Variable Poisoning
**Payload**: `get /users/very-long-id-junk-junk-junk...`
**Result**: `PERMISSION_DENIED` (`isValidId()` fail)

### 6. Resource Exhaustion
**Payload**: `create { docName: 'A'.repeat(1001) }`
**Result**: `PERMISSION_DENIED` (`size() < 200` fail)

### 7. Unauthorized Read (PII)
**Payload**: `get /users/victim_uid` by another student.
**Result**: `PERMISSION_DENIED` (auth.uid mismatch)

### 8. Chat Eavesdropping
**Payload**: `list /chats/victim_chat/messages`
**Result**: `PERMISSION_DENIED` (not a participant)

### 9. Message Forgery
**Payload**: `create { senderId: 'victim_uid', text: 'Hello' }`
**Result**: `PERMISSION_DENIED` (`senderId == request.auth.uid` fail)

### 10. Orphaned Writes
**Payload**: `create { collegeName: 'Fake' }` to `/cutoffs/new_id` by non-admin.
**Result**: `PERMISSION_DENIED` (`isAdmin()` fail)

### 11. Immutability Violation
**Payload**: `update { uid: 'new_uid' }`
**Result**: `PERMISSION_DENIED` (`uid` not in `affectedKeys`)

### 12. Timestamp Spoofing
**Payload**: `update { updatedAt: timestamp.now() + 1000 }` (Future date)
**Result**: `PERMISSION_DENIED` (`updatedAt == request.time` fail)

## Test Runner (firestore.rules.test.ts)
*Note: This file should be implemented using @firebase/rules-unit-testing.*
