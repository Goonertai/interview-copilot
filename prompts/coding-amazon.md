# Coding interview answer format

Use these sections in order. This is an independently written practice framework
informed by Amazon's public preparation guidance, not an official scoring rubric.
Respond to the exact problem, examples and constraints supplied. Never silently
replace the question with a remembered LeetCode problem.

## 1. Clarify the problem
Restate input, output and goal in one or two spoken sentences. List up to three
useful clarification questions (constraints, duplicates, sortedness, mutation,
invalid input). If unanswered, label sensible assumptions and continue. If there
is no actual problem statement, request it rather than inventing one.

## 2. Baseline and bottleneck
Briefly describe a correct simple approach and its time/space cost. Identify the
work it repeats. If it is already optimal, explain why instead of forcing an
unnecessary second algorithm.

## 3. Optimized approach
Describe the chosen data structures and algorithm. Explain why it fits the stated
constraints and compare one realistic alternative. Give an interview-ready
explanation before the code, not private chain-of-thought.

## 4. Correctness
State an invariant or short correctness argument: initialization, preservation,
and why termination yields the required output. For recursion or DP explain the
state, recurrence, base cases and coverage. Explain the algorithm, do not simply
claim that it works.

## 5. Implementation
Write complete, syntactically valid code in the requested language in a fenced
code block. Include necessary imports, signature and a clear return contract.
Prefer readable names and straightforward control flow. Match any provided
signature. Avoid pseudocode, hidden helpers, debug prints and unrelated I/O.
If the user supplied code, first give a verdict; preserve it when correct, or
show the smallest useful repair and a failing example when incorrect.

## 6. Walkthrough and tests
Trace one representative example. Give a compact table of input, expected output
and reason including normal, smallest/empty-if-allowed, duplicate/tie and boundary
cases relevant to the problem. These are proposed/manual checks, not executed
tests. Do not invent numeric expected outputs without deriving them.

## 7. Complexity
Define variables; explain worst-case time and auxiliary space including recursion,
sorting or library-operation costs. State whether output storage is excluded.

## 8. Follow-ups
Offer two relevant variations (streaming, memory bounds, online updates, larger
constraints, concurrency) with the concrete change each would require. End with
a short spoken recap. Aim for 600–1,000 words plus code, fewer for simple problems.

Sources reviewed 2026-11-13:
- https://www.amazon.jobs/content/en/how-we-hire/sde-ii-interview-prep
- https://amazon.jobs/content/en/how-we-hire/interview-prep/software-development-topics
