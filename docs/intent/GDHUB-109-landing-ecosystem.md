# GDHUB-109 — The main landing shows the ecosystem and the Checkpoint

[Linear](https://linear.app/gdhub/issue/GDHUB-109) · intent written 2026-10-23

## Want

A visitor of gdhub.io sees what the platform is made of and what it offers to
each of the people it serves:
- the spaces Advisor, Project and Scout, and the hub with its talents;
- the Checkpoint, as what moves a project forward;
- what each audience gets: authors, talents, scouts (publishers and investors),
  and industry experts.

Each audience has a way in: the Checkpoint landing, a request for Scout access,
the top experts. "About us" moves to its own page under the header's Platform
menu.

## Why now

The landing still describes the platform of 2015–2023: an incubator, "Gamelab",
mentors. It says nothing about the Checkpoint, which is what is sold now
(GDHUB-106), or about the spaces. Visitors arriving from the Checkpoint launch
land on a page that does not mention it.

## Constraints

- **Order of work:** first the current landing is rebuilt in Pencil as it is in
  code, desktop and mobile, starting from the header and hero `amsUw`. Then that
  design is changed. Only then the code.
- **Sections kept, text rewritten:** hero, For authors, For specialists, and the
  footer. The footer only gets its social links updated.
- **Copy:** through Tolgee keys with English defaults. The Checkpoint is never a
  "course", "training" or "class". The expert checkpoint reads as a waitlist
  while `EXPERT_CHECKPOINT_OPEN` is off.
- **Reuse** the `/checkpoint` landing pieces and the design system. No
  hand-rolled colours.

## Done when

- [ ] Pencil holds the current landing as built (desktop and mobile), and the new
      one next to it.
- [ ] Under the hero, a section names the spaces Advisor, Project and Scout and
      the hub with its talents.
- [ ] A Checkpoint section links to `/checkpoint`.
- [ ] For authors and For specialists say what each gets today, with no
      incubator, Gamelab or mentor wording.
- [ ] A scouts section offers a request for access to the Scout space.
- [ ] An experts section shows the top experts.
- [ ] The footer's social links are current.
- [ ] "About us" is its own page, linked from the header's Platform menu, and is
      gone from the landing.

## Out of scope

- The `/checkpoint` landing itself (GDHUB-53 / GDHUB-107).
- The spaces' own pages, and the Scout access flow beyond the button.
- New testimonials.

## Open questions

- **Where "request Scout access" leads:** assumed the existing Scout entry or
  request flow if there is one, otherwise a mailto. To be checked when the code
  starts.
- **"Top experts":** assumed the same featured advisors the Advisor space already
  ranks. To be checked in code.
- **The hero's investment counter:** assumed kept unless the redesign drops it.
