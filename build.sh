#!/bin/bash
# Copy large video files to videos folder during build
# This avoids GitHub's 100MB file limit

echo "Setting up video files for deployment..."

# Ensure videos folder exists
mkdir -p videos

# Copy videos if they exist (only on local builds/CI)
if [ -f "Fancy_Interlude_LC.mov" ]; then
  echo "Copying Fancy_Interlude_LC.mov..."
  cp Fancy_Interlude_LC.mov videos/
else
  echo "Note: Fancy_Interlude_LC.mov not found - will need to be uploaded separately"
fi

echo "✅ Build setup complete"
