#!/bin/bash
TEMP=`mktemp`
find samples -name index.html -exec dirname {} \; > $TEMP
while IFS= read -r line || [[ -n "$line" ]]; do
    dir=`echo "$line" | awk -F/ '{print $1 "/" $2 "/" $3 "/" $4}'`
    version1=`echo "$line" | awk -F/ '{print "/" $5 "/" $6}'`
    docid=${dir/samples/english}
    echo "fetching docid=$docid version1=$version1"
    wget "https://charles-harpur.org/formatter/html?docid=$docid&version1=$version1" -q -O /tmp/index.html
    if [ $? -eq 0 ]; then
        sed '/<!--/,/-->/d' /tmp/index.html > $dir$version1/index.html
    else
        echo "failed $docid$version1"
    fi
    rm /tmp/index.html
done < $TEMP
