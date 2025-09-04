#!/bin/bash


CONFIG="./core/config/green-config2.js"
OUTPUT_DIR="../reports"

# create output directory
mkdir -p $OUTPUT_DIR

# websites list
urls=(
  "https://www.nhs.uk/"
  "https://bbc.com"
  "https://openai.com"
  # MORE
)

i=1
for url in "${urls[@]}"; do
  filename=$(echo "$url" | sed 's|https\?://||g' | tr '/:' '_' )
  output="${OUTPUT_DIR}/report_${filename}.json"

  echo -e "\n[$i/${#urls[@]}] Running Lighthouse for $url"
  lighthouse "$url" \
    --config-path="$CONFIG" \
    --output=json \
    --output-path="$output" \
    --quiet

  ((i++))
done
