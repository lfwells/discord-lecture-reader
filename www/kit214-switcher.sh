#!/bin/bash

# A simple script to switch the /var/www/html symlink

# --- Configuration ---
TUTORIALS_DIR="/var/www/html_tutorials"
A2_DIR="/var/www/html_a2"
SYMLINK_PATH="/var/www/html"
USER_TO_OWN="kit214" # The user that should own the files
# --- End Configuration ---

# Check if an argument was provided
if [ -z "$1" ]; then
  echo "Usage: sudo ./switch-html [tutorials|a2]"
  exit 1
fi

TARGET_DIR=""

# Determine the target directory based on the argument
if [ "$1" == "tutorials" ]; then
  TARGET_DIR="$TUTORIALS_DIR"
elif [ "$1" == "a2" ]; then
  TARGET_DIR="$A2_DIR"
else
  echo "Error: Invalid argument. Use 'tutorials' or 'a2'."
  exit 1
fi

# Check if the target directory actually exists
if [ ! -d "$TARGET_DIR" ]; then
  echo "Error: Target directory '$TARGET_DIR' does not exist."
  exit 1
fi

echo "Switching web root to point to $TARGET_DIR..."

# Atomically update the symlink.
# -s: create a symbolic link
# -f: force (remove existing destination files)
# -n: treat link name as a normal file if it's a symlink to a directory
ln -sfn "$TARGET_DIR" "$SYMLINK_PATH"

echo "Updating ownership for user '$USER_TO_OWN'..."
# Recursively set ownership of the target directory to allow writing.
# The script must be run with sudo for this to work.
chown -R "$USER_TO_OWN":"$USER_TO_OWN" "$TARGET_DIR"

echo "Switch complete. Current status:"
ls -l "$SYMLINK_PATH"

