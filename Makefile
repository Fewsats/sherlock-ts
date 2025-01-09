.PHONY: build publish

build:
	npm run build

publish: build
	npm version patch
	npm publish

.PHONY: help
help:
	@echo "Available commands:"
	@echo "  make build    - Build the package"
	@echo "  make publish  - Build, version bump (patch), and publish to npm"
	@echo "  make help     - Show this help message" 