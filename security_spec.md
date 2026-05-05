# Security Specification - SGE Psicologia

## 1. Data Invariants
- A **Student** must always have a `ra` and `schoolId`.
- An **Appointment** must be linked to a valid `studentId` and `professionalId`.
- **Documents** must contain sensitive health data and must be strictly restricted to the owner or authorized units.
- **Anonymous Reports** must be truly anonymous on creation but only readable by authorized staff.
- **RBAC**: Only `super-admin` can manage `users`.

## 2. The "Dirty Dozen" Payloads (Attack Vectors)

1. **Identity Spoofing**: Attempting to create a student with someone else's `ownerId`.
   - `payload: { name: "John", ra: "123", ownerId: "attacker_id_not_current_user" }`
2. **Privilege Escalation**: A regular user trying to update their own `role` to `admin`.
   - `payload: { role: "admin" }` (on self update)
3. **Unit Poisoning**: Trying to access a student record by injecting a fake unit name.
4. **Update Gap**: Modifying a student's `ra` (immutable field).
5. **State Shortcut**: Approving an appointment request without being an admin.
6. **Denial of Wallet**: Sending massive document IDs to exhaust lookup resources.
7. **Cross-Tenant Leak**: Listing schools by guessing unit names without belonging to that unit.
8. **Shadow Field Injection**: Adding `isVerified: true` to a user profile to bypass system checks.
9. **Timestamp Spoofing**: Sending a client-side `createdAt` date from 2020.
10. **ID Poisoning**: Attempting to create a document with a 1MB string as the document ID.
11. **PII Leak**: A user trying to 'get' another user's private email/phone.
12. **Orphaned Record**: Creating an appointment for a `studentId` that doesn't exist (relational sync check).

## 3. Test Runner Design (Logic Verification)
The `firestore.rules` will be hardened to block all these payloads using:
- `request.auth.uid` comparison.
- `affectedKeys().hasOnly()` gates.
- `isValidId()` regex checks.
- `request.time` for timestamps.
- `exists()` and `get()` for relational integrity.
