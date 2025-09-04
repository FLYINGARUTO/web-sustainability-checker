# Lighthouse Sustainability Extension

This repository contains **custom gatherers, audits, and configuration files** developed as part of my MSc dissertation project at the University of Glasgow.  

The purpose of these extensions is to evaluate sustainability-related aspects of web performance using [Google Lighthouse](https://github.com/GoogleChrome/lighthouse).

## Contents
- `/gatherers` → Custom gatherers for collecting sustainability-related data  
- `/audits` → Custom audits to assess data against sustainability criteria  
- `/configs` → Configuration files to run the custom audits  

## Usage
1. Clone the official Lighthouse repo:  
   ```bash
   git clone https://github.com/GoogleChrome/lighthouse
   cd lighthouse
2. Copy the contents of this repo into the corresponding directories in Lighthouse (gatherers, audits, configs).

3. Update config paths
In the config file (e.g., green-config2.js), update the paths so that they correctly point to the location of your custom gatherers and audits.

4. Run Lighthouse with the custom config:
   ```bash
   lighthouse --config-path=YOUR_CONFIG_PATH/green-config2.js --view https://www.WEBSITE_HERE.com
   #Replace YOUR_CONFIG_PATH with the path to configuration files of this repository.
   #Replace https://www.WEBSITE_HERE.com with the target website you want to audit.

## Notes

This repo only contains the modified and newly created files.

The full Lighthouse codebase is available at GoogleChrome/lighthouse
.

## License

This project follows the Apache 2.0 license, consistent with the original Lighthouse project.
