#!/bin/bash
declare -A works
make_obj() {
    local parent=`dirname "$1"`
    local layer=`basename "$parent"`
    parent=`dirname "$parent"`
    local version=`basename "$parent"`
    parent=`dirname "$parent"`
    local work=`basename "$parent"`
    echo "{\"layer\":\"$layer\",\"version\":\"$version\",\"work\":\"$work\",\"path\":\"$1\"}"
}
read -p "Directory to index:" DIR
if [ -z "$DIR" ]; then
    echo "Specify a directory to index"
    exit 1
elif [ ! -d "$DIR" ]; then
    echo "Can't find $DIR directory"
    exit 1
fi
TMP=`mktemp`
files=()
find "$DIR" -name index.html > "$TMP"
while IFS=  read -r line; do
    files+=("$line")
done <$TMP
rm $TMP
echo -n "[" > index.json
nfiles=${#files[@]}
fnum=0
for f in "${files[@]}"; do
    obj=`make_obj $f`
    let fnum=$fnum+1
    if [ $fnum -lt $nfiles ]; then
	    echo "$obj," >> index.json
	else
	    echo "$obj" >> index.json
	fi
done
echo -n "]" >> index.json
