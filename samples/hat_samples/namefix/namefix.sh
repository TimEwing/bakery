#!/bin/bash

# Script to organize files into folders matching their base names
# Example: a.mp3 -> ./a/a.mp3

for file in *; do
    # Skip if it's a directory
    if [[ -d "$file" ]]; then
        continue
    fi
    
    # Get the filename without extension
    basename="${file%.*}"
    
    # Create directory if it doesn't exist
    mkdir -p "$basename"
    
    # Move the file into its directory
    mv "$file" "$basename/"
    
    echo "Moved $file to $basename/"
done

echo "File organization complete!"