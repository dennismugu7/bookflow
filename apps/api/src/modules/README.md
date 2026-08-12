One folder per domain, each holding `<name>.repository.ts`, `<name>.service.ts`, `<name>.routes.ts` and `<name>.schema.ts` — a feature adds a folder here, never a file to four top-level directories (`CLAUDE.md` §4).

## Every repository function takes its scope as a required parameter

`findBusinessForUser(executor, { userId, businessId })` — not `findBusiness(executor, businessId)` with the caller expected to check membership afterwards.

**There is no unscoped variant, and adding one is the thing to refuse.** `CLAUDE.md` §5 makes `user → membership → business` a non-negotiable applied in the repository layer, and spike 001/C7 established why it cannot be delegated to the database: the API's credential bypasses RLS, so nothing below this layer will catch a missing scope.

A rule enforced by discipline is enforced until someone is in a hurry. Making `userId` a required argument moves it into the type system: the convenient unscoped call does not exist, so it cannot be reached for at 5pm, and a reviewer looking at a call site can see the scope without opening the repository.

**The next author will want to add `findBusinessById` for something that "obviously doesn't need scoping" — an admin screen, a background job, a join.** That is the moment this rule is worth having. If a caller genuinely has no user, it needs its own deliberately-named function and its own review, not a general-purpose escape hatch that the next caller after that will find already there.
