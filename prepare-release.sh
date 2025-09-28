#!/bin/bash

# FoundryMagic Release Preparation Script
# Creates a zip file ready for GitHub release

echo "🚀 Preparing FoundryMagic release..."

# Create release directory
mkdir -p release

# Create the foundrymagic.zip file for GitHub releases
echo "📦 Creating foundrymagic.zip..."
zip -r release/foundrymagic.zip \
  module.json \
  src/ \
  styles/ \
  lang/ \
  macros/ \
  docs/README.md \
  docs/USER_GUIDE.md \
  docs/API.md \
  LICENSE \
  -x "*.DS_Store" "*node_modules*" "*tests*" "*reference-code*" "*specs*" "*.env*" "*package*.json" "*babel*" "*jest*" "*tsconfig*" "*eslint*" "*prettier*"

# Copy module.json for direct download
echo "📋 Copying module.json..."
cp module.json release/

echo "✅ Release files ready in ./release/"
echo ""
echo "📁 Files created:"
echo "  - release/foundrymagic.zip (main module package)"
echo "  - release/module.json (manifest file)"
echo ""
echo "🚀 Next steps:"
echo "1. Push your code to GitHub"
echo "2. Create a new release on GitHub"
echo "3. Upload both files to the release"
echo "4. Use this manifest URL in Foundry:"
echo "   https://github.com/sfatkhutdinov/FoundryMagic/releases/latest/download/module.json"