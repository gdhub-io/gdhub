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
| **Uzbekistan — LLC, IT Park resident** | ~$200 registration through an agent | 1% of income to IT Park + annual audit | **not supported** | local banks only; foreign trade through the e-contract system | Cannot carry Stripe. Interesting as the **licensor** in place of the Georgian IE — see below. |

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

### Uzbekistan

A different kind of option: not a home for the Stripe account, and no EU residence, but a
cheap, low-tax home for the **licensor** (the platform's owner, paid by the VšĮ) and a
country a Belarusian can move to without a visa.

- **Stripe:** merchant accounts are not offered for Uzbekistan-based businesses (payouts
  and Stripe Tax list it, acceptance does not). The VšĮ keeps selling; Uzbekistan only
  receives the fee.
- **IT Park residency** (an Uzbek LLC first; foreign ownership unlimited; no fee for the
  application; working remotely is normal):
  - **no taxes at all, VAT and social tax included, until 1 January 2028**; from 2028 to
    2040 all taxes except VAT, if exports exceed 50% of income — a fee from a Lithuanian
    licensee is export;
  - **dividends to a foreign founder 5%** instead of 10% (to 2040, same export test);
  - employees' income tax 7.5% instead of 12%;
  - costs: a monthly contribution of **1% of income** to IT Park (2–3% from April 2026 for
    larger companies missing a minimum export share — not our case below 5 bn soums a
    year), an annual financial and export audit by 1 July, quarterly reports;
  - "licensing of software" and "export of information services over the Internet" are on
    the activity list — **confirm** that a platform service fee from a foreign operator
    qualifies;
  - export proceeds must go through an Uzbek bank and the e-contract system.
- **Staying there:** Belarusians enter visa-free (up to 90 days, per visa aggregators —
  **confirm**); from July 2026 a protocol gives each other's citizens 10 days without
  registration. The **IT visa** (up to 3 years, on IT Park's recommendation; an investor
  needs a $30,000 share, waived for the "Digital startups" programme) is for visa
  countries, so a Belarusian would need a residence permit on other grounds — **confirm**.
  A planned "Talent Hub" for remote company registration and online banking for
  foreigners was presented in July 2026 but is not law yet.
- **What it does not fix:** EU sanctions Art. 1u(2) apply to Belarusian **nationals** unless
  they hold an EU/EEA/Swiss residence permit — living in Uzbekistan does not lift that. It
  does end "located in Belarus" for Stripe, if the founder really lives there; while he
  lives in Belarus, an Uzbek company run from Belarus risks the Belarusian management test
  like any other.

**Fit:** worth it only together with a move to Uzbekistan — then an IT Park LLC as the
licensor (0% to 2028, 5% on dividends) beats the Georgian IE, whose royalties fall outside
the 1% regime. Without a move it adds an audit and an Uzbek bank for no gain over Georgia.

#### Uzbekistan as the operator, without Stripe

Asked 21 Oct 2026: drop Stripe and the VšĮ, sell from the Uzbek company, pay curators
abroad.

- **Card acceptance:** Visa / Mastercard internet acquiring through an Uzbek bank or a
  local gateway (Click, ATMOS), ~3.5% for international cards (0.8% for Uzcard / Humo).
  Hold-then-capture is not documented, so the human-curator flow changes to **pay after
  the curator says yes** — the author chooses, the curator accepts, the payment link goes
  out. That works with any acquirer and removes the 3-day hold. Expect more declines from
  European issuers paying an Uzbek merchant; promotion codes and partial refunds become
  our own logic.
- **Curator payouts — the hard part.** Paying a non-resident for services carries **20%
  withholding** at source unless a double tax treaty applies **and** the curator's tax
  residence certificate is on file **before the payment date**; monthly reporting; the
  foreign trade contract registered and paid through an Uzbek bank. Uzbekistan has about
  50 treaties — Belarus, Germany, Lithuania, Poland and Spain among them (PwC, Jan 2026);
  the UK is uncertain, **Georgia and Kazakhstan are not on the list**. Under a treaty, a
  curator's fee is usually taxed only where the curator lives, so the rate drops to 0% —
  at the price of one certificate per curator per year. IT Park's withholding exemption
  for foreign suppliers is reported only above $10M exports a year. IT Park residents may
  pay foreign specialists to international cards within their export earnings.
  **Confirm** with an Uzbek adviser how payments to foreign **individuals** (not companies)
  are documented.
- **Freedom Pay** (Freedom Holding) works in Uzbekistan: Visa, Mastercard, Humo, Uzcard,
  recurring payments, invoices. Its API (documented for Kazakhstan and Kyrgyzstan —
  **confirm** the Uzbek one matches) has a **two-step payment** (`pg_auto_clearing = 0`
  blocks the amount, `do_capture` takes all or part of it later) — so the current hold
  flow survives — and **payouts to cards and IBANs** (`reg2nonreg`, enabled through a
  manager). It is a rail, not a tax answer: withholding, certificates and the e-contract
  rules above apply to its payouts the same way. Fees on request.
- **Which Uzbek bank:** as of the consolidated Regulation 833/2014 of 24 July 2026 (21st
  package included), **no Uzbek bank** is under the EU transaction ban for third-country
  banks (Annex XLV — the neighbours there are Kyrgyz: Tolubay, Eurasian Savings Bank,
  Keremet, Capital Bank of Central Asia), and no OFAC designation of an Uzbek bank was
  found. The risk is softer: Uzbekistan sits on the "circumvention risk" lists, and banks
  that serve Russian money transfer systems draw questions (the July 2026 Zolotaya Korona
  operator switch). Choose a bank with no Russian business and Western shareholders, and
  ask Freedom Pay which bank it settles through.
- **EU obligations stay:** an EU representative under GDPR Art. 27, non-Union OSS for the
  AI curator's VAT, EU consumer law.
- **Paddle** does not list Uzbekistan as unsupported, but **does** list Belarus for
  suppliers "operating from" it — the same exposure the Georgian IE has today.

**Verdict:** workable with a move to Uzbekistan and a payout process built around
treaty certificates; without the move, the founder-in-Belarus problem is unchanged and
the payout overhead is added on top. The cheaper first step is the reverse split —
the VšĮ keeps selling and paying curators (no withholding inside the EU), the Uzbek
company is the licensor.

([PwC: Uzbekistan treaties](https://taxsummaries.pwc.com/republic-of-uzbekistan/individual/foreign-tax-relief-and-tax-treaties),
[Bizreg: non-resident taxes 2026](https://www.bizreg.uz/en/blog/nalogi-dlya-nerezidentov),
[EY: withholding reporting, Jul 2026](https://www.ey.com/en_uz/technical/tax-alerts/2026/07/uzbekistan-withholding-tax-reporting-beneficial-ownership-requirements),
[Onedev: online payments in Uzbekistan](https://onedev.uz/en/blog/how-to-accept-online-payments-in-uzbekistan-click-payme-uzum-and-cards),
[Tavat: IT Park, VAT on imported services](https://tavat.uz/stati-1/it-park-virtualnyj-ofis-nds-scheta),
[Paddle: supported countries](https://www.paddle.com/help/legal/sanctions/which-countries-are-supported-by-paddle))

([Tax & Legal: IT Park](https://tax-legal.uz/en/it-park/),
[Mondaq: Astana Hub and IT Park](https://www.mondaq.com/income-tax/1730650/part-i-astana-hub-and-it-park-uzbekistan-tax-benefits-resident-registration-and-startup-support),
[Pactum: dividend withholding 2026](https://pactum.uz/en/blog/dividendy-inostrannomu-uchastniku-nalog-5-ili-10-protsentov-i-repatriatsiya),
[Black Swan: IT visa](https://blackswan.law/ru/insights/it-visa-v-uzbekistane/),
[Spot.uz: Talent Hub, 7 Jul 2026](https://www.spot.uz/ru/2026/07/07/it-startups),
[Daryo: 10 days without registration](https://daryo.uz/en/2026/07/14/uzbekistan-belarus-extend-registration-free-stay-to-10-days/),
[PayAtlas: Uzbekistan](https://payatlas.com/countries/uzbekistan-uz))
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

## Alternatives to Stripe

What the Checkpoint needs from a provider: card acceptance worldwide, a **hold captured
later** (up to 3 days for the curator's answer), **partial refunds**, a hosted checkout,
and acceptance of **human advisory services**. Promotion codes are Stripe's today; with
another provider they become our own logic. Curator payouts are bank transfers, not
provider-dependent.

**No provider removes the Belarus question.** Every EU or US acquirer screens owners and
representatives the same way Stripe does, and EU ones are bound by Art. 1u. An
alternative is a **second rail** in case Stripe holds funds or closes the account, not a
way around the founder's residence.

| | Hold + later capture | Partial refund | Human services | Who can sign up | Cost | Fit |
|---|---|---|---|---|---|---|
| **Mollie** | yes, cards, `captureMode: manual`; one capture per payment, expiry releases the hold (~28 days per a third party) | yes | not confirmed | businesses in the EEA, Switzerland, UK — **Lithuania included** | per transaction, no monthly fee | **Best backup for the VšĮ**: same model as Stripe, EU-based. Check its prohibited-business list. |
| **Braintree (PayPal)** | yes | yes | generally allowed | Lithuania among supported markets | 1.9% + €0.30, +1% for non-EEA cards (fee schedule 29 Jun 2026) | Good second rail; adds PayPal as a payment method. PayPal's own risk reviews of services are known to hold funds. |
| **Paysera** (Lithuanian EMI) | not documented | yes, acceptance fee not returned | — | EU-registered businesses | reserve deposit held against refunds and chargebacks | Resells an acquirer (Adyen named in its rules, valid from 1 Sep 2026). Simple, local, but no documented manual capture — would break the hold. |
| **Montonio** (Baltic) | — | — | — | Baltic merchants | — | Bank links are its strength; for cards it routes to Stripe. Not an alternative. |
| **Adyen / Checkout.com** | yes | yes | yes | enterprise onboarding | volume minimums | Too early for our volume. |
| **Gumroad** (merchant of record since 1 Jan 2025) | no | yes | sells calls/coaching — **confirm** | sellers paid out by Stripe Connect | 10% + $0.50 | Takes VAT and chargebacks off us, but no hold-then-capture and a high fee; payouts still run on Stripe. |
| **Paddle / Lemon Squeezy** | — | — | **prohibited** (Paddle AUP: consulting, coaching, advisory) | — | — | Ruled out (legal open points §5). Lemon Squeezy is moving onto Stripe Managed Payments. |

([Mollie: place a hold](https://docs.mollie.com/docs/place-a-hold-for-a-payment),
[Mollie: countries](https://help.mollie.com/hc/en-us/articles/115002116105),
[Braintree fees, 29 Jun 2026](https://www.paypalobjects.com/marketing/ua/pdf/ROE/en/roe-en-braintree-fees-29-June-2026.pdf),
[Paysera card payment collection rules](https://www.paysera.lt/v2/en-LT/legal/card-payment-collection-rules),
[Montonio](https://siliconcanals.com/montonio-raises-11m/),
[Stripe vs Paddle vs Lemon Squeezy vs Gumroad](https://www.globalsolo.global/blog/stripe-vs-paddle-vs-lemon-squeezy-2026))

**For the code:** the payment layer is one provider today (`src/services/stripe`,
`/api/stripe/webhooks`); `Payment.provider` already distinguishes providers. Adding Mollie
as a second rail is a checkout, a webhook and capture / cancel / refund calls behind the
same functions — plus promotion codes moved from Stripe into our own table.

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
