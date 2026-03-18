# Clinical Intake Example

This example focuses on:

- Screener routing (`definition.screener`)
- Secondary instances + pre-population (`definition.instances`, `item.prePopulate`)
- Remote options (`bind.remoteOptions`)
- Nested repeats (`medicalHistory.conditions[*].medications[*]`)
- Calculations and composed validation shapes

Validate artifacts:

```bash
PYTHONPATH=src python3 examples/clinical-intake/validate.py
```
