# Maritime Shadow Fleet — GRC-20 Ontology (revised for the World Affairs space)

**Status:** draft reflecting the review call decisions (Ahmed, review of the pilot dataset).
The relation-vs-entity choices below are proposed; the two items in *Open items* are for confirmation on the call.
Scope: World Affairs space, likely under the Russia-Ukraine War topic.

---

## 1. Design principles

1. **Identity anchors are entities; events and links are relations.** A Vessel, Company, Government Body, Sanctions Programme and Place are durable things → entities. A sanction designation, an ownership assertion, a flag, a port call are *statements connecting* two things → relations that carry their own properties.
2. **A predicate is never stronger than its source.** Ownership roles use the exact wording of the issuing document (OFAC "has an interest" → interest holder, not owner). Source discrepancies are recorded, not silently reconciled.
3. **Controlled vocabularies over free text** for vessel type, ownership role, designation status, observation type.
4. **Provenance travels with the claim.** Every relation carries a source URL (and, where the wording matters, an evidence quote) so any assertion can be traced to a document.
5. **Typed scalars → properties; entity links → relations.** No free-text where a relation to an existing entity is possible (resolve by name/IMO/LOCODE first).

GRC-20 value types used below: **Text, Number, Time, Url, Point, Relation** (relations are themselves entities and can carry properties).

---

## 2. Entity types

### 2.1 Vessel  *(new type — to be created in World Affairs)*
Lean identity anchor. Everything relational (owner, designation, flag, voyage) lives on relations, not here.

| Property | Value type | Notes |
|---|---|---|
| Name | Text | Current name |
| IMO number | Text | Unique key; 7 digits, stable across renames |
| MMSI | Text | Nullable; changes on reflag |
| Vessel type | Relation → *Vessel Type* | Controlled set: Crude oil tanker, Oil products tanker, LNG carrier, … |
| Former names / aliases | Text (multi-value) | **Core identifier in this domain** — hulls rename constantly (Mulan → Arctic Mulan; Beks Aqua → Lunar Tide) |
| Call sign | Text | Nullable |
| Year built | Number | Nullable |
| Gross tonnage / Deadweight | Number | Optional, where sourced |

Relations off a Vessel: *flagged in* (→ Place), *sanctioned by* (→ Government Body), *owned/controlled* (→ Company, via Ownership), *linked to* (→ Company/Entity), *reported voyage* (→ Place origin/destination).

### 2.2 Company
| Property | Value type | Notes |
|---|---|---|
| Name | Text | Official full name, sentence-case, no honorifics/parentheticals |
| IMO company number | Text | Nullable |
| Jurisdiction (incorporation) | Text | Only from an official registration ID; else "not stated in source" |
| Described as based in | Text | Soft descriptor ("UAE-based") — never promoted to incorporation |
| Address country | Relation → Place | Nullable |
| Registered address | Text | Nullable |
| Tax ID / Registration number / LEI | Text | Official IDs only |
| Source URL | Url | Issuing document |
| Jurisdiction source type | Text | Provenance qualifier (primary vs registry-derived) |

### 2.3 Government Body  *(reuse existing World Affairs type)*
Authorities: OFAC (U.S. Treasury), UK FCDO / OFSI. Properties: Name, Jurisdiction (→ Place), Type, Source URL.

### 2.4 Sanctions Programme  *(new type — enables cross-query)*
Making the programme a first-class entity is the condition for keeping the designation-as-relation model: it preserves "show everything designated under EO 14024" as a query.

| Property | Value type | Example |
|---|---|---|
| Name | Text | Executive Order 14024 |
| Short code | Text | EO14024 |
| Administering authority | Relation → Government Body | OFAC |
| Source URL | Url | Federal Register / legislation.gov.uk |

Instances in the pilot: EO 14024 (Russia), EO 13850 (Venezuela), The Russia (Sanctions) (EU Exit) Regulations 2019.

### 2.5 Place  *(reuse existing World Affairs type)*
Covers Country, Port, Region. Country: ISO alpha-3, coordinates (Point). Port: UN/LOCODE (Text), coordinates (Point), country (Relation → Place). If World Affairs has no Port granularity, a *Port* subtype or a `locodeType` flag is the only addition needed.

---

## 3. Relation types

### 3.1 Sanctioned by  *(Designation modelled as a relation)*
**From:** Vessel | Company → **To:** Government Body.

| Property on relation | Value type | Notes |
|---|---|---|
| Programme | Relation → Sanctions Programme | keeps cross-query |
| Designation date | Time | |
| Status | Text (controlled) | listed \| removed |
| Date removed | Time | present when removed (e.g. Yasa Golden Bosphorus, 2024-04-26) |
| Unique ID | Text | OFAC UID / UK UID (e.g. RUS2841) — needed for dedup + citation |
| Nature | Text | e.g. "blocked property in which X has an interest" |
| Source URL | Url | issuing action |
| Status verified at | Time | date of independent live-list check |
| Status source | Url | live consolidated list (not the notice PDF) |

Two invariants that must survive the entity→relation move: the **Unique ID** and the **listed → removed lifecycle** (so delistings remain represented rather than deleted).

### 3.2 Ownership  *(single relation type + role vocabulary)*
**From:** Vessel | Company → **To:** Company. One relation type; the precise predicate lives in a controlled `role`.

| Property on relation | Value type | Notes |
|---|---|---|
| Role | Text (controlled) | interest holder \| registered owner \| beneficial owner \| owner-operator |
| Confidence | Text | confirmed \| reported \| inferred |
| Role currency | Text | verified \| unverified (as-of a date) |
| Evidence date | Time | |
| Evidence quote | Text | verbatim source phrase (short) |
| Listing source URL | Url | the sanctions listing |
| Predicate evidence URL | Url | the document proving the specific role |

### 3.3 Linked to  *(generic association — NOT ownership)*
The OFAC "Linked To" association (e.g. vessel ↔ Arctic LNG 2). Kept separate from the ownership vocabulary. **From:** Vessel | Company → **To:** Company | Entity. Properties: Nature (Text), Source URL (Url).

### 3.4 Flagged in
**From:** Vessel → **To:** Place. Properties: Flag source URL (Url), Verified at (Time). (Flag at designation time; current flag can be a second dated relation — see Open items.)

### 3.5 Reported voyage  *(provenance layer — thinnest part of the pilot)*
**From:** Vessel, with origin/destination. Properties: Origin (Relation → Place), Destination (Relation → Place), Reported period (Text/Time), Time granularity (Text: month \| day), Observation type (Text: reported \| AIS-derived \| STS), Source URL (Url). At scale this is better as discrete **Port call** events (Vessel → Place + timestamp); flagged for the enrichment phase.

---

## 4. Field mapping (current seed → revised model)

| Seed field | New home |
|---|---|
| vessels.imo / name / mmsi / callSign / yearBuilt | Vessel properties (same) |
| vessels.vesselType | Vessel → *Vessel Type* relation (controlled) |
| vessels.aliases[] | Vessel.Former names / aliases (multi-value) |
| vessels.flagCountryId (+ flagSourceUrl, flagVerifiedAt) | *Flagged in* relation → Place |
| vessels.flagStatus | **Derived** from *Sanctioned by* status (drop as a stored field once relations exist) |
| companies.* | Company properties (same) |
| designations.appliesToId/Type | endpoints of *Sanctioned by* relation |
| designations.authorityId | *Sanctioned by* → Government Body |
| designations.program | *Sanctioned by*.Programme → Sanctions Programme |
| designations.designationDate / currentStatus / dateRemoved / uniqueId / nature / sourceUrl / statusVerifiedAt / statusSource | properties on *Sanctioned by* relation |
| ownership.role | Ownership.Role (controlled vocab) |
| ownership.{confidence, roleCurrency, evidenceDate, evidenceQuote, listingSourceUrl, predicateEvidenceUrl} | properties on Ownership relation |
| ownership.role == linkedTo | moved to *Linked to* relation |
| companylinks.* | *Linked to* (or Ownership, per `relation` value) |
| ports.* | Place (Port): UN/LOCODE, Point coordinates, country relation |
| reportedvoyages.* | *Reported voyage* relation |
| authorities.* | Government Body |
| countries / regions | Place |

Note: `flagStatus` becomes derived once designations are relations — it exists in the pilot only because the flat dataset had no relation layer. This removes the redundancy that surfaced in review (Yasa).

---

## 5. Open items (for the call)

1. **Vessel identity over time.** Flag, MMSI and name change on reflag/rename (Mulan/Palau → Arctic Mulan/Russia). Proposal: keep IMO as the stable key, store current values as properties, and represent *historical* flag/name via dated relations (*Flagged in* with a Verified-at) and the aliases field. Confirm how much history World Affairs wants to carry vs a designation-time snapshot.
2. **Registry-tier provenance.** West Maritime's incorporation (Saint Kitts and Nevis, reg. 0035133) is registry/Equasis-derived, below the primary-source bar the pilot holds. Confirm whether registry-sourced enrichment is admissible when explicitly labelled, or should stay "not stated in source".
3. **Designation: relation vs entity** — confirm the relation model in §3.1 (with Sanctions Programme as an entity).
4. **Place granularity** — confirm whether the existing Place type carries Port/Region, or a Port subtype is wanted.
