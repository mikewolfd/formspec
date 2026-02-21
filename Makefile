# Makefile for Formspec Documentation

PANDOC = pandoc
TEMPLATE = docs/template.html
DOCS_DIR = docs
SPECS_DIR = specs

all: docs

docs: $(DOCS_DIR)/spec.html \
      $(DOCS_DIR)/mapping.html \
      $(DOCS_DIR)/fel-grammar.html \
      $(DOCS_DIR)/changelog.html \
      $(DOCS_DIR)/extension-registry.html \
      $(DOCS_DIR)/theme-spec.html \
      $(DOCS_DIR)/component-spec.html

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

serve:
	busybox httpd -f -p 8000 -h docs

clean:
	rm -f $(DOCS_DIR)/spec.html \
	      $(DOCS_DIR)/mapping.html \
	      $(DOCS_DIR)/fel-grammar.html \
	      $(DOCS_DIR)/changelog.html \
	      $(DOCS_DIR)/extension-registry.html \
	      $(DOCS_DIR)/theme-spec.html \
	      $(DOCS_DIR)/component-spec.html

.PHONY: all docs serve clean
