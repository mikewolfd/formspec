# Makefile for Formspec — documentation, tests, and full compile (Rust + JS/WASM + PyO3).

PANDOC = pandoc
TEMPLATE = docs/template.html
DOCS_DIR = docs
SPECS_DIR = specs

all: docs

spec-artifacts:
	npm run docs:generate

docs-check:
	npm run docs:check

test-unit:
	npm run test:unit

test-e2e:
	npm run test:e2e

test-studio-e2e:
	npm run test:studio:e2e

test-python:
	pytest

build-wasm:
	npm run build:wasm --workspace=@formspec/engine

# Full compile: Rust workspace + npm workspaces (WASM via formspec-engine) + formspec_rust into active Python.
# Also builds wos-spec and trellis submodules when their Makefiles are present (submodules may be uninitialized).
build: build-rust build-js build-python build-wos-spec build-trellis

build-rust:
	cargo build --workspace

build-js:
	npm run build

# Submodule delegation — no-ops silently when the submodule is not initialized.
build-wos-spec:
	@if [ -f wos-spec/Makefile ]; then $(MAKE) -C wos-spec build; else echo "wos-spec submodule not initialized — skipping build"; fi

build-trellis:
	@if [ -f trellis/Makefile ]; then $(MAKE) -C trellis build; else echo "trellis submodule not initialized — skipping build"; fi

test-wos-spec:
	@if [ -f wos-spec/Makefile ]; then $(MAKE) -C wos-spec test; else echo "wos-spec submodule not initialized — skipping test"; fi

test-trellis:
	@if [ -f trellis/Makefile ]; then $(MAKE) -C trellis test; else echo "trellis submodule not initialized — skipping test"; fi

clean-wos-spec:
	@if [ -f wos-spec/Makefile ]; then $(MAKE) -C wos-spec clean; else echo "wos-spec submodule not initialized — skipping clean"; fi

clean-trellis:
	@if [ -f trellis/Makefile ]; then $(MAKE) -C trellis clean; else echo "trellis submodule not initialized — skipping clean"; fi

# Builds the Rust extension and places the .so into the source tree for editable installs.
# Uses maturin develop so the in-tree _native.so stays current (pip install writes to
# site-packages, which is shadowed by the editable src/formspec/ on sys.path).
build-python:
	maturin develop --release --manifest-path crates/formspec-py/Cargo.toml

# Force-rebuild the Python extension from scratch. Use this when tests pick up
# stale bindings — typical symptom: a function signature was changed in Rust
# but Python still sees the old shape.
#
# Maturin installs the compiled `_native` module into site-packages, but
# `src/formspec/_rust.py` imports it as `from formspec import _native`, which
# requires the `.so` to live inside `src/formspec/`. We wipe, rebuild, then
# copy the fresh artifact back into the source tree.
rebuild-python:
	rm -f src/formspec/_native*.so
	maturin develop --release --manifest-path crates/formspec-py/Cargo.toml
	@SITE_PKG_SO=$$(python3 -c "import _native as m, os; print(os.path.dirname(m.__file__))")/_native.cpython-*.so; \
	cp $$SITE_PKG_SO src/formspec/ && echo "✓ copied fresh _native.so to src/formspec/"

test-rust:
	cargo test --workspace

# After pulling, if `git status` shows trellis/ or wos-spec/ submodule drift, run
# `git submodule update --init --recursive` so local `make test` matches CI SHAs.
# Submodule test suites run when their Makefiles are present.
test: test-unit test-python test-rust test-e2e test-studio-e2e test-wos-spec test-trellis

check: docs-check test

api-docs:
	PYTHONPATH=src python3 -c "import importlib.util, sys; sys.exit(0 if importlib.util.find_spec('pdoc') else 1)" || python3 -m pip install -e '.[docs]'
	PYTHONPATH=src python3 -m pdoc formspec --output-directory $(DOCS_DIR)/api/formspec
	npx typedoc --entryPoints packages/formspec-engine/src/index.ts --tsconfig packages/formspec-engine/tsconfig.json --out $(DOCS_DIR)/api/formspec-engine
	npx typedoc --entryPoints packages/formspec-webcomponent/src/index.ts --tsconfig packages/formspec-webcomponent/tsconfig.json --out $(DOCS_DIR)/api/formspec-webcomponent
	npx typedoc --entryPoints packages/formspec-core/src/index.ts --tsconfig packages/formspec-core/tsconfig.json --out $(DOCS_DIR)/api/formspec-core
	npx typedoc --entryPoints packages/formspec-chat/src/index.ts --tsconfig packages/formspec-chat/tsconfig.json --out $(DOCS_DIR)/api/formspec-chat
	npx typedoc --entryPoints packages/formspec-mcp/src/index.ts --tsconfig packages/formspec-mcp/tsconfig.json --out $(DOCS_DIR)/api/formspec-mcp
	npm run --workspace=@formspec-org/studio-core build
	cargo doc --workspace --no-deps
	rm -rf $(DOCS_DIR)/api/rust && cp -r target/doc $(DOCS_DIR)/api/rust
	PYTHONPATH=src python3 scripts/generate-api-markdown.py src/formspec/API.llm.md
	node scripts/generate-ts-api-markdown.mjs

html-docs: \
      $(DOCS_DIR)/spec.html \
      $(DOCS_DIR)/mapping.html \
      $(DOCS_DIR)/fel-grammar.html \
      $(DOCS_DIR)/changelog.html \
      $(DOCS_DIR)/extension-registry.html \
      $(DOCS_DIR)/theme-spec.html \
      $(DOCS_DIR)/component-spec.html \
      $(DOCS_DIR)/references-spec.html \
      $(DOCS_DIR)/ontology-spec.html \
      $(DOCS_DIR)/locale-spec.html \
      $(DOCS_DIR)/grant-application.html

docs: html-docs api-docs

$(DOCS_DIR)/spec.html: $(SPECS_DIR)/core/spec.md $(TEMPLATE)
	$(PANDOC) -s --toc --template=$(TEMPLATE) --metadata title="Formspec Core Specification" -o $@ $<

$(DOCS_DIR)/mapping.html: $(SPECS_DIR)/mapping/mapping-spec.md $(TEMPLATE)
	$(PANDOC) -s --toc --template=$(TEMPLATE) --metadata title="Formspec Mapping Specification" -o $@ $<

$(DOCS_DIR)/fel-grammar.html: $(SPECS_DIR)/fel/fel-grammar.md $(TEMPLATE)
	$(PANDOC) -s --toc --template=$(TEMPLATE) --metadata title="FEL Grammar Specification" -o $@ $<

$(DOCS_DIR)/changelog.html: $(SPECS_DIR)/registry/changelog-spec.md $(TEMPLATE)
	$(PANDOC) -s --toc --template=$(TEMPLATE) --metadata title="Formspec Changelog Specification" -o $@ $<

$(DOCS_DIR)/extension-registry.html: $(SPECS_DIR)/registry/extension-registry.md $(TEMPLATE)
	$(PANDOC) -s --toc --template=$(TEMPLATE) --metadata title="Formspec Extension Registry" -o $@ $<

$(DOCS_DIR)/theme-spec.html: $(SPECS_DIR)/theme/theme-spec.md $(TEMPLATE)
	$(PANDOC) -s --toc --template=$(TEMPLATE) --metadata title="Formspec Theme Specification" -o $@ $<

$(DOCS_DIR)/component-spec.html: $(SPECS_DIR)/component/component-spec.md $(TEMPLATE)
	$(PANDOC) -s --toc --template=$(TEMPLATE) --metadata title="Formspec Component Specification" -o $@ $<

$(DOCS_DIR)/references-spec.html: $(SPECS_DIR)/core/references-spec.md $(TEMPLATE)
	$(PANDOC) -s --toc --template=$(TEMPLATE) --metadata title="Formspec References Specification" -o $@ $<

$(DOCS_DIR)/ontology-spec.html: $(SPECS_DIR)/ontology/ontology-spec.md $(TEMPLATE)
	$(PANDOC) -s --toc --template=$(TEMPLATE) --metadata title="Formspec Ontology Specification" -o $@ $<

$(DOCS_DIR)/locale-spec.html: $(SPECS_DIR)/locale/locale-spec.md $(TEMPLATE)
	$(PANDOC) -s --toc --template=$(TEMPLATE) --metadata title="Formspec Locale Specification" -o $@ $<

$(DOCS_DIR)/grant-application.html: docs/grant-application-guide.md $(TEMPLATE)
	$(PANDOC) -s --toc --template=$(TEMPLATE) --metadata title="Grant Application — Formspec Walkthrough" -o $@ $<

setup:
	python3 -m venv .venv
	.venv/bin/pip install pre-commit
	.venv/bin/pre-commit install

serve:
	busybox httpd -f -p 8000 -h docs

clean: clean-wos-spec clean-trellis
	rm -f $(DOCS_DIR)/spec.html \
	      $(DOCS_DIR)/mapping.html \
	      $(DOCS_DIR)/fel-grammar.html \
	      $(DOCS_DIR)/changelog.html \
	      $(DOCS_DIR)/extension-registry.html \
	      $(DOCS_DIR)/theme-spec.html \
	      $(DOCS_DIR)/component-spec.html \
	      $(DOCS_DIR)/references-spec.html \
	      $(DOCS_DIR)/ontology-spec.html \
	      $(DOCS_DIR)/locale-spec.html \
	      $(DOCS_DIR)/grant-application.html
	rm -rf $(DOCS_DIR)/api
	rm -f src/formspec/API.llm.md \
	      packages/formspec-engine/API.llm.md \
	      packages/formspec-webcomponent/API.llm.md \
	      packages/formspec-core/API.llm.md \
	      packages/formspec-chat/API.llm.md \
	      packages/formspec-mcp/API.llm.md \
	      packages/formspec-studio-core/API.llm.md

.PHONY: all spec-artifacts docs-check check docs html-docs api-docs build build-rust build-js build-python rebuild-python build-wasm build-wos-spec build-trellis test test-unit test-python test-rust test-e2e test-studio-e2e test-wos-spec test-trellis setup serve clean clean-wos-spec clean-trellis
