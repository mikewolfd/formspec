"""Compatibility CLI module for `python -m formspec.validator`."""

from validator.__main__ import main

if __name__ == "__main__":
    raise SystemExit(main())
