
### 2026-08-16 — `ios-build` moves to a weekly schedule

**The amendment above was not enough, and the allowance ran out.** GitHub Free gives 2,000 Actions
minutes a month for private repositories; they were **exhausted on 2026-08-16**. The Actions budget
is $0 with stop-usage on, so runs are now refused rather than billed — three jobs reported failure
in two seconds with no runner and no logs, which is what a refusal looks like from the outside.
Nothing was charged. Recorded in `docs/ENVIRONMENT.md` §3.

**The arithmetic, since it is the whole argument:**

| | Cost |
|---|---|
| macOS billing multiplier | **10×** Linux |
| One iOS build, ~8 minutes wall clock | **~80 minutes** charged |
| On every merge to `main` | the single largest item in the pipeline |
| Month capped at | **~13 merges** |
| Weekly instead | **~320 minutes a month** |
| Merges the allowance then supports | roughly **3× more** |

**So `ios-build` runs on a weekly `schedule` — Monday 04:00 UTC — plus `workflow_dispatch`, plus
the existing `ios` pull-request label.** It no longer runs on pull requests generally, and **no
longer runs on push to `main`**, which is the real change: the previous amendment kept it there on
the grounds that "the result matters", and the result still matters — it just does not need to be
known within minutes of every merge.

**What the job is for is unchanged and still satisfied.** ADR-015 puts iOS builds in cloud CI
because the development machine is Windows and *cannot* compile the target at all; the job's value
is knowing **within days** whether iOS still compiles. A weekly cadence delivers exactly that.

**What is given up, stated plainly:** attribution. A weekly red says iOS broke somewhere in the
last week's merges rather than naming the commit. That is a bisect over a handful of merges, not a
lost answer — and `workflow_dispatch` means anyone who suspects a specific change can have the
answer in ten minutes without waiting for Monday.

**A second consequence, easy to miss:** every other job now carries
`if: github.event_name != 'schedule'`. Without that guard the weekly trigger would run the whole
Linux pipeline as well, spending the allowance the schedule exists to protect. A job added later
without that condition will quietly re-introduce the cost.

**Trigger to revisit:** a paid plan, an Apple Developer account (K53 — signing would make this job
do more than prove compilation), or iOS-specific work active enough that a week's attribution
window is genuinely obstructive.
