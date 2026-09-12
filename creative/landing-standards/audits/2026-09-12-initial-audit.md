# Landing audit - 2026-09-12

Structural floor per LANDING-STANDARDS.md. Bars audited for information only.

| Page | Role | Verdict | Notes |
| --- | --- | --- | --- |
| [Max Digital Media (proof page)](https://macsdigitalmedia.netlify.app/) | family | STRUCTURAL-PASS | fails: es-mx |
| [Buffer Blaster (candidate 1)](https://bufferblaster.netlify.app/) | family | HOLD | fails: reachable |
| [Buffer Blaster (candidate 2)](https://buffer-blaster.netlify.app/) | family | HOLD | fails: reachable |
| [PARE](https://pauli-para.netlify.app/) | family | HOLD | fails: reachable |
| Posta Studio | family | N/A | No public deploy yet - rebuild pending. Add URL when the Netlify rebuild ships. |
| [Agent MAXX portal](https://macs-agent-portal-pi.vercel.app/) | family | HOLD | fails: es-mx, h1, cta |
| [Taste of Nawlins](https://tasteofnawlins.netlify.app/) | family | HOLD | fails: es-mx, cta |
| [ASC3ND](https://asc3nd.org/) | family | HOLD | fails: es-mx, cta |
| [BAR: maxfusion.ai](https://maxfusion.ai/) | bar | HOLD | fails: lang, es-mx, alt |
| [BAR: tryitnow.ai](https://tryitnow.ai/) | bar | STRUCTURAL-PASS | fails: es-mx |

## Max Digital Media (proof page) - STRUCTURAL-PASS

https://macsdigitalmedia.netlify.app/

| Check | Result | Critical |
| --- | --- | --- |
| HTTP 200, no redirect loop | PASS | yes |
| title: "MACS Digital Media | Technology partner for owner-led busine" | PASS | yes |
| meta description present | PASS | no |
| html lang="en" | PASS | yes |
| es-MX version linked/detectable | FAIL | no |
| one h1: "Your technology partner for the digital side of your vision." | PASS | yes |
| CTA found: Tell us what&#x27;s important / Tell us what&#x27;s important ↗ / Meet the team ↗ | PASS | yes |
| viewport meta present | PASS | yes |
| image alt coverage 100% (4/4) | PASS | no |
| HTML 44 KB | PASS | no |

## Buffer Blaster (candidate 1) - HOLD

https://bufferblaster.netlify.app/
Detail: final status 404

| Check | Result | Critical |
| --- | --- | --- |
| HTTP 404 | FAIL | yes |

## Buffer Blaster (candidate 2) - HOLD

https://buffer-blaster.netlify.app/
Detail: final status 404

| Check | Result | Critical |
| --- | --- | --- |
| HTTP 404 | FAIL | yes |

## PARE - HOLD

https://pauli-para.netlify.app/
Redirect chain: 302 https://pauli-para.netlify.app/ -> 301 https://pauli-para.netlify.app/pare-preview/
Detail: REDIRECT_LOOP

| Check | Result | Critical |
| --- | --- | --- |
| page reachable | FAIL | yes |

## Posta Studio

SKIPPED: No public deploy yet - rebuild pending. Add URL when the Netlify rebuild ships.

## Agent MAXX portal - HOLD

https://macs-agent-portal-pi.vercel.app/

| Check | Result | Critical |
| --- | --- | --- |
| HTTP 200, no redirect loop | PASS | yes |
| title: "MAXX — Follow-Up Recovery for Nonprofits &amp; Social-Purpos" | PASS | yes |
| meta description present | PASS | no |
| html lang="en" | PASS | yes |
| es-MX version linked/detectable | FAIL | no |
| 0 h1 elements | FAIL | yes |
| no CTA-like link/button detected | FAIL | yes |
| viewport meta present | PASS | yes |
| image alt coverage 100% (0/0) | PASS | no |
| HTML 2 KB | PASS | no |

## Taste of Nawlins - HOLD

https://tasteofnawlins.netlify.app/

| Check | Result | Critical |
| --- | --- | --- |
| HTTP 200, no redirect loop | PASS | yes |
| title: "Taste of Nawlins" | PASS | yes |
| meta description present | PASS | no |
| html lang="en" | PASS | yes |
| es-MX version linked/detectable | FAIL | no |
| one h1: "New Orleans food, wherever we pull up." | PASS | yes |
| no CTA-like link/button detected | FAIL | yes |
| viewport meta present | PASS | yes |
| image alt coverage 100% (0/0) | PASS | no |
| HTML 2 KB | PASS | no |

## ASC3ND - HOLD

https://asc3nd.org/

| Check | Result | Critical |
| --- | --- | --- |
| HTTP 200, no redirect loop | PASS | yes |
| title: "ASC3ND Collective" | PASS | yes |
| meta description present | PASS | no |
| html lang="en" | PASS | yes |
| es-MX version linked/detectable | FAIL | no |
| one h1: "Empower Youth Elevate Futures Build Community" | PASS | yes |
| no CTA-like link/button detected | FAIL | yes |
| viewport meta present | PASS | yes |
| image alt coverage 100% (1/1) | PASS | no |
| HTML 13 KB | PASS | no |

## BAR: maxfusion.ai - HOLD

https://maxfusion.ai/

| Check | Result | Critical |
| --- | --- | --- |
| HTTP 200, no redirect loop | PASS | yes |
| title: "Maxfusion AI - AI Creative Layer for Brands and Agencies" | PASS | yes |
| meta description present | PASS | no |
| html lang="MISSING" | FAIL | yes |
| es-MX version linked/detectable | FAIL | no |
| 2 h1 elements | PASS | yes |
| CTA found: Get Started / Try RIZZ Now / Start creating | PASS | yes |
| viewport meta present | PASS | yes |
| image alt coverage 33% (49/148) | FAIL | no |
| HTML 835 KB | PASS | no |

## BAR: tryitnow.ai - STRUCTURAL-PASS

https://tryitnow.ai/
Redirect chain: 307 https://tryitnow.ai/ -> 200 https://www.tryitnow.ai/

| Check | Result | Critical |
| --- | --- | --- |
| HTTP 200, no redirect loop | PASS | yes |
| title: "AI Products, Agents and Automation · TryItNow.ai" | PASS | yes |
| meta description present | PASS | no |
| html lang="en" | PASS | yes |
| es-MX version linked/detectable | FAIL | no |
| one h1: "AI products for people. Intelligent systems for businesses." | PASS | yes |
| CTA found: Contact / Discuss a Project / Meet TryOnNow | PASS | yes |
| viewport meta present | PASS | yes |
| image alt coverage 100% (35/35) | PASS | no |
| HTML 166 KB | PASS | no |

