# Where to hold the operating entity — research

Internal, not a published document. Checked 20 October 2026. What the platform needs a
legal entity for, where one can be kept remotely for the least money and effort, with a
founder who is a Belarusian citizen resident in Belarus, Stripe access, and sales to the
world except Belarus and Russia. Nothing here is legal or tax advice: every row marked
**confirm** goes to a lawyer before money moves.

## What the entity has to carry

From the financial operations of the platform (see the checkpoint standard §7–8, the
Checkpoint Purchase Terms §5, the Expert Services Terms):

- **Card acceptance through Stripe**, with manual capture (hold, then capture on the
  curator's yes), partial refunds, promotion codes, disputes. Stripe is a processor, not a
  merchant of record: invoices, VAT and chargebacks are ours.
- **Payouts to curators and experts in many countries**, monthly, by bank transfer, with
  self-billing or their invoices; withholding where a payee's law demands it.
- **Paddle** for vacancies, courses and events (Paddle is the merchant of record there, so
  any entity Paddle accepts will do).
- One currency for prices and payouts, set by the entity (`LegalEntity.currency`).

## The finding that decides everything

**The obstacle is the founder's residence, not the country of incorporation.**

1. **Stripe does not support users located in Belarus** — its own sanctions page, without
   defining "located". Stripe screens owners and representatives against sanctions lists
   and looks for "nexus" to sanctioned jurisdictions. A company anywhere whose only
   director, representative and owner lives in Belarus is exactly that nexus.
   ([Stripe: Sanctions on Russia and Belarus](https://support.stripe.com/questions/sanctions-on-russia-and-belarus),
   [Stripe: Financial Crimes Risk Appetite](https://support.stripe.com/questions/financial-crimes-risk-appetite-policy-statement))
2. **EU sanctions, Regulation 765/2006 Art. 1u** (consolidated 24 July 2026):
   - 1u(2)(b): no **acquiring of payment transactions**, issuing of payment instruments or
     e-money **to Belarusian nationals or persons residing in Belarus, or to entities
     established in Belarus**. A company established elsewhere is not named — but an EU
     provider de-risks rather than parse that.
   - 1u(1): no deposits above **€100,000 per credit institution** from an entity
     **established outside the Union** that is more than 50% owned by Belarusians.
     An **EU-established** company is not caught; a UK, US or UAE one banking in the EU is.
   - 1u(4): none of this applies to a Belarusian **holding an EU/EEA/Swiss residence
     permit**.
   ([EUR-Lex, 02006R0765-20260724](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R0765-20260724))
3. **Belarusian tax law follows the management** (per a summary of the Tax Code to
   30 Dec 2025, **confirm** with a Belarusian adviser): a foreign company effectively run
   from Belarus can be treated as seated there (Art. 16) and taxed at 20% on worldwide
   profit; a person in Belarus who concludes contracts for it can create a permanent
   establishment (Art. 180). Dividends to a Belarusian resident: 13%, 25% above BYN 350,000
   a year. Whether Belarus has a CFC regime for individuals is contested between sources.
   A cash contribution to a foreign company's capital is a currency operation that must be
   registered with the National Bank.
   ([CorpSec: Wyoming LLC from Belarus](https://corpsec.io/jurisdiction/usa-wyoming/guides/from-belarus))

So any jurisdiction works only if **someone not located in Belarus is the Stripe
representative and actually runs the company** — a real co-founder or director abroad
(a nominee is how accounts get closed), or the founder's own residence moving (an EU
residence permit lifts the Art. 1u restrictions entirely). Short of that, every option
below carries the same risk of a Stripe account closed after launch, with funds held.

## The options

Costs are orders of magnitude from vendor pages, per year, **confirm** with quotes.

| | Setup | Yearly | Stripe | Bank | Fit for us |
|---|---|---|---|---|---|
| **Lithuania — the existing VšĮ** | done | accountant ~€800–2,400 | supported; account already decided for it | Lithuanian banks de-risk Belarusian owners; EMIs (Paysera) | **Cheapest — it exists.** Non-profit: no profit distribution, the founder is paid for services. EU-established, so the €100k deposit cap does not bite. |
| **Lithuania — UAB or MB** | UAB capital €1,000, MB none; notary / power of attorney | accountant from €65/month + VAT | supported | same as above | A commercial twin of the VšĮ if profit must reach the founder. Lithuanian e-resident status is closed to Belarusians since May 2023, so signing is through a notary or a proxy. |
| **UK Ltd** | ~£50–100 state fee, formation agent | ~£1,000–2,000 accountant + registered office | supported | UK banks hard for non-residents; Wise/Airwallex-type EMIs | Fully remote, cheap, English law. Identity verification at Companies House mandatory since Nov 2025, doable through an agent. Outside the EU: the €100k deposit cap applies to EU banks. |
| **US LLC (Wyoming / Delaware)** | $100 + agent | $60 + agent ~$100 + Form 5472 (penalty $25,000 if missed) | supported; Atlas $500, eligibility for Belarus residents unconfirmed | Mercury, Relay, Wise list Belarus as closed | Cheapest to keep, hardest to bank from Belarus. Dividends from a US corporation to a Belarusian resident: 30% withholding, the treaty has no dividend article. |
| **UAE free zone** | licence | ~$4,000–7,000 + residence visa | supported for free zone companies | strict for Belarusians, source-of-wealth checks | Expensive; 9% corporate tax above AED 375,000. Only worth it with a move to the UAE. |
| **Estonia OÜ** | — | — | — | — | **Closed:** e-residency suspended for Belarusian citizens since March 2022. |
| **Georgia** (the existing IE) | done | low | **not supported** | fine | Keeps Paddle; cannot carry Stripe. |

Not pursued: Cyprus (substance and accounting cost of an EU company without the VšĮ's head
start), Poland (no remote advantage over Lithuania for a Belarus resident).

### VAT, briefly

A Checkpoint with a human curator is advisory work (legal open points §4): sold by an EU
company to EU consumers it is taxed where the company is; sold by a UK or US company to EU
consumers it is outside EU VAT under the same rule. The **AI curator** is closer to an
electronically supplied service, taxed in the customer's country — a non-EU seller then
registers in the non-Union OSS. **Confirm** the classification with the accountant.

## Startup programmes

Programmes that make incorporation easier almost all assume the founder moves; none of
them fixes "located in Belarus" while the founder stays.

- **Stripe Atlas** — $500 for a Delaware C-corp, EIN, registered agent, $2,500 of Stripe
  credit; the fee comes back on a $5,000 Treasury deposit within 90 days. Its page names no
  excluded countries, but it is Stripe: the Belarus policy applies.
  ([stripe.com/atlas](https://stripe.com/atlas))
- **Startup visas in the EU** — any EU residence permit lifts Art. 1u, and living there
  means the founder is no longer "located in Belarus". Every one of them requires actually
  living in the country (Portugal: 16 of 24 months), so the founder's tax residence moves
  with it. Status for Belarusian citizens, per IMI Daily's comparison of 15 Oct 2026 and
  official pages — "not mentioned" means not checked, **confirm** with the authority:

  | Country | Belarusians | Money | Notes |
  |---|---|---|---|
  | Lithuania | **suspended** | — | also no VFS centre in Belarus since Dec 2024 |
  | Estonia | **closed** — no business or startup permits | — | Police and Border Guard Board |
  | Latvia | **closed** in practice — OECD citizens only from 20 May 2026 | — | |
  | Italy | **closed** since 27 Oct 2023 | — | |
  | Ireland | **closed** | — | |
  | Poland (Business Harbour) | **suspended** since 26 Jan 2024 | — | general self-employment route remains |
  | **Spain** | not mentioned | no capital; €7,200/yr living funds | ENISA report; 3 years, renews for 2 |
  | **Portugal** | not mentioned | no capital; ~€6,450 personal funds | certified incubator, IAPMEI decides in 30 working days; 2 + 3 years |
  | **Netherlands** | not mentioned | ~€21,200/yr income unless the facilitator funds it | facilitator required; 1 year; €423 |
  | **Denmark** | not mentioned | ~€20,540 for year one | 75 permits a year, panel |
  | **Finland** | not mentioned | ~€12,360–14,520/yr income | needs two founders holding 60%+ |
  | **France** (talent card) | not mentioned | €22,404 living funds | Ministry of Economy opinion; up to 4 years |
  | **Belgium — Flanders** (from 1 Sep 2026) | not mentioned | none for "innovative added value" | €140; 1–3 years |
  | **Austria** | not mentioned | €30,000, half equity | points test; 2 years |
  | **Malta** | not mentioned | €25,000 | company under 7 years |
  | **Bulgaria** | not mentioned | ~€51,000 from a venture fund | |
  | **UK** (Innovator Founder) | not mentioned | endorsement £1,000 + £500 per review | settlement after 3 years |

  The likeliest fit for a solo founder with a running product and no outside investor:
  **Spain** or **Portugal** (no capital, modest living funds), then the **Netherlands**.
  ([IMI Daily, 15 Oct 2026](https://www.imidaily.com/analysis/europes-cheapest-startup-visas-ranked-by-minimum-capital/),
  [Estonian Police: restrictions for Belarusian citizens](https://www.politsei.ee/en/news/restrictions-on-employment-and-business-activities-for-russian-and-belarusian-citizens-10460),
  [Notes from Poland: Business Harbour suspended](https://notesfrompoland.com/2024/01/29/poland-suspends-programme-to-attract-it-specialists-from-eastern-neighbours-over-visa-concerns/),
  [Nasha Niva on Lithuanian permits](https://nashaniva.com/en/404222))

### Spain, Portugal, Belgium in detail

No restriction for Belarusian citizens found for any of the three. Each means living in
the country, so the founder's tax residence moves there; the Georgian entrepreneur then
probably has to close (CFC rules) and a local company takes the licence from the VšĮ.

**Spain — entrepreneur residence** (Law 14/2013 Art. 69–70, as rewritten by the Startups
Act, Law 28/2022):

- The gate is a **favourable ENISA report** on the project — requested by the immigration
  unit UGE-CE, free, due in 10 working days, business plan may be in English. ENISA weighs
  innovation and special economic interest (scalability, market, team, contracts). No
  minimum investment or jobs; the company need not be a certified *empresa emergente*.
- **Two routes:** from abroad (UGE-CE 20 working days, then the consulate 10 days, a 1-year
  visa converted to the permit; from Belarus documents reportedly go through Minsk to the
  Consulate General in Moscow, 60+ days) or **from inside Spain while legally present**,
  even as a tourist (20 working days, silence is approval, filing extends the stay).
- **Means:** €2,442 a month for the applicant (200% of the minimum wage), +€916 for the
  first family member, +€305 for each further one. Spanish health insurance, criminal record
  for 2 years. Fees ~€73 + TIE €16 + consular fee.
- **Permit:** 3 years, renewable for 2; long-term residence after 5.
- **Tax:** the ENISA report qualifies for the **Beckham regime — flat 24%** on employment and
  business income up to €600,000, for the arrival year plus five (no Spanish residence in
  the previous 5 years; form 149 within 6 months). A certified *empresa emergente* pays 15%
  corporate tax instead of 25% for its first four profitable years — 483 of 2,529 certified
  companies have already lost the status.
- **Company:** an SL, capital from €1, notary and registry a few hundred euros, gestoría
  ~€100–200 a month.
- The application has to lead with the product (AI curator, the platform), not with live
  consultations, which are not innovation.

([esextranjeria.es, Aug 2026](https://esextranjeria.es/en/guides/spain-entrepreneur-startup-visa),
[Economía 3, 15 Oct 2026](https://economia3.com/2026/10/15/762915-certificado-de-empresa-emergente-2-529-startups-lo-tienen-pero-no-garantiza-el-visado/),
[ENISA certification](https://www.enisa.es/servicios/certificacion/),
[Legalfournier — from Belarus](https://legalfournier.com/en/spain-residency/belarus/))

**Portugal — StartUP Visa** (IAPMEI):

- A contract with a **certified incubator** (list updated 23 Jan 2026), then the IAPMEI
  application and declaration, then a **D visa at a consulate** (€110), then the AIMA
  residence permit after arrival. Applying requires proof of residence **outside
  Schengen** — filing from Belarus fits; where Belarusians file is unconfirmed.
- **Means:** €6,445.56 per applicant (2026). The project must show potential for €325,000
  turnover or assets within 5 years; up to five founders, none added after approval.
- **Cost:** the incubator, "often several thousand euros"; lawyer €1,500–5,000+;
  translations €150–800; company and accounting €500–2,500+; AIMA ~€307.
- **Time:** no fixed term. AIMA's backlog runs to 6–12+ months against the 30–90 days
  announced; Law 62/2026 reportedly set a 90-day decision period.
- **Permit:** 2 years, renewable for 3; absences limited (6 consecutive / 8 cumulative
  months under the general rules — **confirm**). Citizenship now after **10 years**
  (Organic Law 1/2026, from 19 May 2026).
- **Tax:** IFICI 20% flat for 10 years, but for a founder only through a company certified
  by Startup Portugal. Corporate tax 19%, 15% on the first €50,000 for SMEs.

([Movingto, verified 17 Oct 2026](https://movingto.com/pt/portugal-startup-visa),
[Global Citizen Solutions](https://www.globalcitizensolutions.com/portugal-startup-visa/),
[Builduplabs — IFICI](https://builduplabs.com/expat-portugal-startup-ecosystem/nhr-ifici-tax-regime/),
[Jobbatical — AIMA](https://www.jobbatical.com/blog/aima-residence-permits-process-times-requirements))

**Belgium — professional card**, in Flanders the **Innovation & Startup Permit** from
1 Sep 2026:

- Issued by the region of the activity; the card comes before the visa, filed through the
  Belgian consular post for the place of residence.
- **Innovative added value** (new products, services, technology, or work with an
  incubator, accelerator or research body): **no capital**. Economic added value instead
  needs €22,838 in the founder's own account. A **fast track** with a signed letter, in
  Dutch, from a Flemish incubator, innovator or knowledge institution.
- Business plan (market, competition, SWOT, marketing), secondary education, net income
  of 110% of the guaranteed minimum. At least 2 months; fee €140; 1–3 years.
- **Against it:** the tax — personal income up to 50% plus ~20% self-employed social
  contributions — and the cost of a Belgian company and accountant.

([Vlaanderen — professional card](https://www.vlaanderen.be/en/working-enterprise-and-investment/working/professional-card-for-foreign-entrepreneurs),
[Vlaanderen — requirements](https://www.vlaanderen.be/en/working-enterprise-and-investment/working/professional-card-for-foreign-entrepreneurs/requirements-for-a-professional-card),
[hub.brussels](https://info.hub.brussels/en/guide/permits-regulations-and-obligations/professional-card-non-european-nationals))

| | Spain | Portugal | Belgium (Flanders) |
|---|---|---|---|
| Living money | ~€29,300 a year | **€6,450** | 110% of minimum income |
| Intermediary | none; ENISA free | incubator, thousands of euros | incubator letter for the fast track |
| Speed | 20 working days, silence = yes | unpredictable (AIMA) | 2+ months |
| File from | abroad or inside Spain | outside Schengen only | abroad (consulate) |
| Permit | 3 + 2 years | 2 + 3 years | 1–3 years |
| Preferential tax | 24% (Beckham) | 20% (IFICI, certified startup) | none |

Spain if the €2,442 a month can be shown; Portugal if it cannot.
- **Poland Business Harbour** — the visa for Belarusian IT founders; reporting speaks of it
  in the past tense, **confirm** it still takes applications. ZPP's Belarus Business Center
  helps only from $1M investment or 30 employees.
  ([Tech.eu](https://tech.eu/2026/02/18/from-repression-to-relocation-how-belarusian-founders-are-powering-polands-next-tech-boom/),
  [ZPP Belarus Business Center](https://belarus.zpp.net.pl/en/glavnaya-english/))
- **EU / EBRD support for Belarusian SMEs in exile** — advisory services, business
  education, EBRD Star Venture with local accelerators; the Belarusian Diaspora Initiative
  runs to the end of 2027. Aimed at businesses already relocated; worth an expression of
  interest for advice and introductions to banks.
  ([EU and EBRD help Belarusian SMEs abroad](https://euneighbourseast.eu/news/latest-news/eu-and-ebrd-offer-help-to-belarusian-smes-abroad/),
  [EU support to Belarusian people](https://euneighbourseast.eu/news/latest-news/eu-support-to-belarusian-people-reaches-e170-million-since-august-2020/))
- **Accelerators that incorporate you** (YC, Techstars and the like) form a Delaware
  C-corp as part of the deal; competitive, and the bank and Stripe checks are the same.

## Recommendation

1. **Keep the Lithuanian VšĮ as the operator for now.** It costs nothing new, sits inside
   the EU (outside the €100k cap), and every document already names it.
2. **Ask Stripe in writing**, before launch, whether the VšĮ's account is acceptable with
   its representative and beneficial owner located in Belarus. If the account was already
   verified, ask anyway: the risk is a review after the first payouts, not the sign-up.
3. **Give the company a representative outside Belarus** — a real person who runs the
   Stripe account and signs — or move the founder's residence (Spain's or Portugal's startup
   visa first — the Baltic ones are closed to Belarusians). This is what actually lowers the risk; changing the country
   of incorporation does not.
4. **Only if profit has to reach the founder**, add a commercial entity — a Lithuanian MB
   or UAB beside the VšĮ, or a UK Ltd if Lithuanian banking fails. Not a US LLC: banking
   from Belarus is closed and the dividend withholding is 30%.
5. **Before any of it**, one paid hour each with a Belarusian tax adviser (management
   test, CFC, registering the capital contribution) and a Lithuanian lawyer (VšĮ economic
   activity, legal open points §2.1).
