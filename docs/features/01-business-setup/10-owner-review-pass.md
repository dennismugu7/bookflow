Owner's review pass — PR #15

I've read the review record (comment 5343499513). ADR-032's four questions, in turn.

COPY AND BEHAVIOUR

Sign out is offered on screens #5 and #17, there is no login screen, and both
buttons on the signed-out shell are disabled. Tapping it locks an owner out of
their own business until login ships. I am shipping it, because there are no
users yet and the only person who can be locked out is me — but that reasoning
expires the day someone signs up. Tracked as K81, blocking on the login slice.
If login ships and sign out is still a trapdoor, this call was wrong.

Every creation failure shows "That did not save. Check your connection and try
again.", including the 409. An owner who already has a business reads a message
about their connection. Fix it in 5b rather than here — 5b is the last commit
inside this slice. Tracked as K82.

The rest of the copy is what I want a salon owner to read.

DEBT

I accept K76, K78, K79, K80, criteria 48 and 49, the uq_ convention future
partial unique indexes now follow, and the scoped DELETE running against staging
on every merge to main. Each has a trigger and a carrier, which is the property
I care about. K76 cannot be forgotten because production refuses to boot without
it. The DELETE has four guards, and one of them caught a real error one commit
after it was written.

PREMISES

One business per account is ADR-003 and I still want it. Rename on screen #20
has decision 11's reasoning behind it and I accept it. Setup ending on a
dashboard listing four things that do not exist is a slice boundary rather than
a defect — and it stops being acceptable if the next slices are slow.

SHAPE

Five PRs in, this is going where I want it to go. What I am watching is the gap
between what the dashboard promises and what exists.

VERDICT: APPROVED ON CONDITION.

Two conditions, both above: K81 blocks the login slice, K82 lands in 5b. This PR
does not close the slice — DEFINITION_OF_DONE.md line 21 is unmet, and 5b closes
it.

PROVENANCE, so this record is worth what it claims: the decisions above are
mine, but the options and the recommendation came from the guiding session, and
I took its recommendation on all four. The wording is its draft. That makes this
a weaker artefact than a pass I reasoned to independently, and it is stated as
weaker rather than dressed up as one.
