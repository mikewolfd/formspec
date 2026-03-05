# Invoice Example

This example focuses on:

- Repeatable groups (`lineItems`)
- Per-row calculation (`lineItems[*].lineTotal`)
- Multi-hop totals calculation (subtotal → tax/discount → grand total)
- CSV export via `invoice.mapping.json`

Validate artifacts:

```bash
PYTHONPATH=src python3 examples/invoice/validate.py
```
