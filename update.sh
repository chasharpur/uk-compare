#!/bin/bash
declare -a m_files=()
declare -a a_files=()
while read -r line
do
    flag=(`awk '{print $1}' <<< "$line"`)
    if [ "$flag" == '??' ]; then
        a_files+=(`awk '{print $2}' <<< "$line"`)
    else
        m_files+=(`awk '{print $2}' <<< "$line"`)
    fi
done < <(git status -s)
files_to_add=""
for f in ${a_files[@]}; do
    files_to_add="$files_to_add $f"
done
files_to_commit=""
for f in ${m_files[@]}; do
    files_to_commit="$files_to_commit $f"
done
if [ ! -z "$files_to_add" ]; then
    git add "$files_to_add"
fi
if [ ! -z "$files_to_add" ] || [ ! -z "$files_to_commit" ]; then
    scp $files_to_commit $files_to_add charles-harpur.org:/var/www/uk-compare/
    read -p "git message: " message
    git commit -a -m "$message"
    git push
else
    echo "no changes"
fi
