#!/bin/bash
TEMP=`mktemp`
rgrep -l "<p" > $TEMP
while IFS= read -r line || [[ -n "$line" ]]; do
    sed -i -e 's/<p/<p/g' -e 's/<\/h2>/<\/p>/g' $line
done < $TEMP

