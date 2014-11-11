#!/bin/bash

echo "Combining Javascript Files..."
bash combine.sh

echo "Compiling Javascript Files..."
bash compile.sh

yes | cp combined-compiled.js ../ReView_chrome_extension/thirdparty/combined-compiled.js
echo "Done!"
