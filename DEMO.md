# Demo narrative — tracing one tanker, end to end

The trace view answers the bounty's core question: *follow a tanker from origin → ownership →
destination, with a source for every link.* Open `/trace?imo=9610810` (**Viktor Bakaev**).

## The chain

1. **Flag state → vessel.** Viktor Bakaev (IMO 9610810, MMSI 636015565) is flagged in **Liberia** per
   the OFAC listing.
2. **Vessel → registered owner.** Predicate `registeredOwner`. Listing: OFAC Recent Actions 20231201;
   **predicate proof**: Treasury press release **jy1940**, which names UAE-based **Streymoy Shipping
   Limited** as the registered owner. (S&P reporting of *ultimate* Sovcomflot control is secondary and
   is shown as a note — not asserted as an ownership edge, because the listing does not state it.)
3. **Company → listed-address country.** Streymoy's listed address resolves to the UAE — labelled
   "listed address", explicitly *not* a jurisdiction of incorporation or a place of control.
4. **Vessel → authority.** OFAC under E.O. 14024 (price-cap program). `designationDate = 2023-12-01`;
   `currentStatus = active` — re-verified on the live OFAC Sanctions List Search on **2026-06-15**
   (OFAC UID **46611**), shown with its detail page as the current-status source.
5. **Reported voyage.** One **reported voyage** (Primorsk → Zhoushan, `reportedPeriod = 2024-07`,
   `timeGranularity = month`, `observationType = secondary-analysis`) sourced from Brookings. It is a
   month-level secondary observation, **not** an AIS-confirmed track.

Every edge is clickable in the graph (predicate + quoted wording + both URLs + confidence), and the
provenance table lists the same beneath it.

## A second path worth opening

`/trace?imo=9277735` (**Lunar Tide**) shows the UK side: a `binding-sanction` with
`currentStatus = active` (verified 2026-02-10, UID **RUS2841**), an `ownerOperator` relation to **West
Maritime Services and Trading Inc**, and flag **Guinea** (recorded from the OFAC entry — see the dual-listing
note below; the UK notice had struck an erroneous flag value without replacement).

## What the demo deliberately does not show

Dense AIS position history (out of scope), and any "current sanction" claim that hasn't been
status-verified against a dated source.

## Note: Lunar Tide is dual-listed (IMO 9277735)

The Lunar Tide trace shows **two designations on one hull**: the **UK** Russia listing (current
owner-operators West Maritime, RUS2841, 2026-02-10) and the **OFAC** Venezuela listing of the same hull as
**Rosalind (a.k.a. Lunar Tide)**, Guinea flag. The Treasury press release **sb0348** names **Winky
International Limited** as ROSALIND's registered owner and identifies the vessel as blocked property in
which Winky has an interest — so the trace renders two authority nodes and **three** ownership edges
(`registeredOwner` + `interestHolder` → Winky, `ownerOperator` → West Maritime), each with `evidenceDate`
("as of") and, on the conflicting roles, `roleCurrency = unverified` flagging an unreconciled source
discrepancy. The OFAC ROSALIND record (UID 56724) and the Winky company record (UID 56723) were both
verified on the live OFAC list on 2026-06-15.
