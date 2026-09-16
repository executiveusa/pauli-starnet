# Printify -> Etsy Handoff

A product cannot move from research to publish unless the receipt contains:
- brand and target Etsy shop;
- Printify shop ID, blueprint/product type, print provider, production region;
- exact variants and colors;
- source asset path plus checksum and license/ownership note;
- mockup set reviewed at full size;
- Printify base cost per variant and current shipping cost/policy;
- Etsy title, description, 13 tags, category, attributes, materials, occasion/recipient where relevant;
- exact retail price by variant, estimated marketplace fees, expected gross margin, and currency;
- processing time, shipping profile, returns/personalization terms;
- approved final state with owner observation reference.

The Etsy agent cannot silently alter a Printify variant or price. The Printify agent cannot publish a connected listing. A mismatch returns the item to `needs_input`.
