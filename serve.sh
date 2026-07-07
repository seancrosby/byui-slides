#!/bin/bash

set -euo pipefail

node "$(dirname "$0")/bin/byui-slides.js" serve "$@"
