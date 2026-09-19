/*
Copyright (C) [2026]  [Desmond Mackie]

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://gnu.org>.
*/
/**
 * Return the end of the alignment (one char AFTER the end)
 * @param a the alignment
 * @param side the side (1 or 2)
 * @return the alignment start position+text length
 */
function alignment_end( a, side ) {
    if ( side == 1 )
        return a.start1+a.text.length;
    else
        return a.start2+a.text.length;
}
/**
 * Get the start offset of an alignment, based on the side
 * @param a the alignment
 * @param side the side (1 or 2) 
 * @return the start index into the relevant version 
 */
function alignment_start(a, side ) {
    if ( side == 1 )
        return a.start1;
    else
        return a.start2;
}
/**
 * calculate overlap between two alignments
 * @param a first alignment
 * @param b second alignment
 * @param side the side to test
 * @return the AMOUNT of overlap. >0 means overlap, <= 0 means none 
 */
function alignment_overlap(a,b,side) {
    let a_start = alignment_end(a,side);
    let a_end = alignment_end(a,side);
    let b_start = alignment_start(b,side);
    let b_end = alignment_end(b,side);
    if ( a_end < b_start )
        return a_end - b_start;
    else if ( b_end < a_start )
        return b_end - a_start;
    else if ( a_end > b_start )
        return a_end - b_start;
    else
        return a_start - b_end;                                                       
}
/**
 * Check that an item to be inserted doesn't overlap
 * @param list the list sorted on side
 * @param item the item to insert later
 * @param side 1 for left, 2 for right
 * @return -2: append -1 overlaps, >=0 index to insert before
 */
function check_overlap(list,item,side) {
    if ( list.length == 0 || alignment_end(list[list.length-1],side) <= alignment_start(item,side) )
        return -2;
    else {
        let index = -1;
        for ( let i=0;i<list.length;i++ ) {
            if ( i == 0 && alignment_start(list[0],side) >= alignment_end(item,side) )
                return 0;
            else if ( alignment_start(list[i],side) >= alignment_end(item,side) ){
                if ( alignment_end(list[i-1],side) <= alignment_start(item,side) )
                    index = i;
                break;
            }
        }
        return index;
    }
}
/**
 * Find the item in a sorted list before which to insert
 * @param list the list sorted on side
 * @param item the item to insert later
 * @param side 1 for left 2 for right
 * @return -1: append >=0 the index to insert before
 */
function insert_before(list,item,side) {
    let index = -1;
    if ( list.length == 0 )
        return -1;
    for ( let i=0;i<list.length;i++ ) {
        if ( alignment_start(list[i],side) >= alignment_end(item,side) ){
            index = i;
            break;
        }
    }
    return index;
}
/**
 * During curtailment we set the start of alignment
 * @param item the item to curtail
 * @param start the new start
 * @param side 1 for left 2 for right
 */
function alignment_set_start( item, start, side ) {
    let old_start = alignment_start(item,side);
    item.text = item.text.slice(start-old_start);
    if ( side == 1 ) {
        item.start1 = start;
        item.start2 += start - old_start;
    }
    else {
        item.start2 = start;
        item.start1 += start - old_start;
    }
}
/**
 * During curtailment we set the end of alignment
 * @param item the item to curtail
 * @param end the new end offset (start+text.length)
 * @param side 1 for left 2 for right
 */
function alignment_set_end( item, end, side ){
    let text_len = 0;
    if ( side == 1 )
        text_len = end - item.start1;
    else
        text_len = end - item.start2;
    if ( text_len < 0 )
        text_len = 0;
    item.text = item.text.slice(0,text_len);
}
/**
 * Shorten an alignment
 * @param item the alignment to shorten
 * @param against trim to fit against this alignment
 * @param side the side: 1 (left) or 2 (right)
 */
function curtail(item,against,side) {
    let against_start = alignment_start(against,side);
    let item_start = alignment_start(item,side);
    let item_end = alignment_end(item,side);
    let against_end = alignment_end(against,side);
    if ( item_start < against_start && item_end > against_start )
        alignment_set_end( item, against_start, side );
    else if ( item_start < against_end && item_end > against_end )
        alignment_set_start(item,against_end,side);
    return item;
}
/**
 * Pick alignments using the longest increasing subsequence heuristic
 * @param a a non-empty unsorted alignment set
 * @param selected the selected set of alignments (non-overlapping)
 * @param transposed the set of accepted transpose alignments
 */
function lis_align(a,selected,transposed) {
    // find longest alignment in a
    let longest = 0;
    for ( let i=1;i<a.length;i++ ) {
        if ( a[i].text.length > a[longest].text.length )
            longest = i;
    }
    // find element to insert before (or -1)
    let before = insert_before(selected,a[longest],1);
    if ( before == -1 )
        selected.push(a[longest]);
    else
        selected.splice(before,0,a[longest]);
    // remove selected alignment from a
    let selected_item = a[longest];
    a.splice(longest,1);
    // partition remaining aligments into left, right and transposed sets
    let left = [];
    let right = [];
    for ( let i=0;i<a.length;i++ ) {
        // 1. a[i] is completely contained within selected_item - discard
        if ( alignment_start(a[i],1) >= alignment_start(selected_item,1) 
            && alignment_end(a[i],1) <= alignment_end(selected_item,1) )
            continue;
        else if ( alignment_start(a[i],2) >= alignment_start(selected_item,2)
            && alignment_end(a[i],2) <= alignment_end(selected_item,2) )
            continue;
        else {
            // for next step first curtail
            let overlap_1 = alignment_overlap(a[i],selected_item,1);
            if ( overlap_1 > 0 )
                a[i] = curtail(a[i],selected_item,1);   // NB rewrite curtail
            let overlap_2 = alignment_overlap(a[i],selected_item,2);
            if ( overlap_2 > 0 )
                a[i] = curtail(a[i],selected_item,2);
            // 2. a[i] is completely to the left of selected_item - add to left set
            if ( alignment_end(a[i],1) <= alignment_start(selected_item,1) 
                && alignment_end(a[i],2) <= alignment_start(selected_item,2) )
                left.push(a[i]);
            // 3. a[i] is completely to the right of selected_item - add to right set
            else if (alignment_start(a[i],1) >= alignment_end(selected_item,1) 
                && alignment_start(a[i],2) >= alignment_end(selected_item,2) )
                right.push(a[i]);
            // 4. a[i] is transposed around selected_item
            else if ( a[i].text.trim().length > 1 ){
                let dist_1 = Math.abs(alignment_end(a[i],1)-alignment_start(a[i],2));
                let dist_2 = Math.abs(alignment_start(a[i],1)-alignment_end(a[i],2));
                let dist = Math.max(dist_1,dist_2);
                if ( dist/a[i].text.length < MAX_TRANSPOSE )
                    transposed.push(a[i]);
            }
        }
    }
    // recurse
    if ( left.length > 0 )
        lis_align(left,selected,transposed);
    if ( right.length > 0 )
        lis_align(right,selected,transposed);
}
/**
 * Offset a set of alignments representing a portion of the text
 * @param 1 a set of alignments
 * @param offset1 the offset into version 1 where the alignments begin
 * @param offset2 the offset into version 2 where the alignments begin
 */
function offset_alignments( a, offset1, offset2 ) {
    for ( let i=0;i<a.length;i++ ) {
        a[i].start1 += offset1;
        a[i].start2 += offset2;
    }
}
/**
 * Align sections still unaligned after the first pass
 * @param a list of partial alignments (in/out)
 */
function recursive_align( a, transposed, lhs, rhs ) {
    let insets = [];
    let start_1 = 0;
    let start_2 = 0;
    for ( let i=0;i<a.length;i++ ) {
        if ( a[i].start1 > start_1 
            && a[i].start2 > start_2 
            && Math.min(a[i].start2-start_2,a[i].start1-start_1) > MIN_REALIGN ) {
            insets.push({text1:lhs.slice(start_1,a[i].start1),text2:rhs.slice(start_2,a[i].start2),start1:start_1,start2:start_2});
        }
        start_1 = a[i].start1+a[i].text.length;
        start_2 = a[i].start2+a[i].text.length;
    }
    // coda
    if ( start_1 < lhs.length
        && start_2 < rhs.length
        && Math.min(lhs.length-start_1,rhs.length-start_2) > MIN_REALIGN ) {
        insets.push({text1:lhs.slice(start_1),text2:rhs.slice(start_2),start1:start_1,start2:start_2});
    }
    // so insets holds the main still unaligned portions of text
    // on left and right which we have to align one by one
    for ( let i=0;i<insets.length;i++ ) {
        let alignments = ukkonen_compare(insets[i].text1,insets[i].text2);
        if ( alignments.length > 0 ) {
            offset_alignments(alignments,insets[i].start1,insets[i].start2);
            lis_align(alignments,a,transposed);
        }
    }
}
function add_transpositions(selected_1,transposed) {
    let selected_2 = Array.from(selected_1);
    selected_2.sort((a,b)=>a.start2>b.start2);
    for ( let i=0;i<transposed.length;i++ ) {
        let index_1 = check_overlap(selected_1,transposed[i],1);
        if ( index_1 == -1 )
            continue;
        let index_2 = check_overlap(selected_2,transposed[i],2);
        if ( index_2 == -1 )
            continue;
        if ( index_1 == -2 && index_2 == -2 ) {
            transposed[i].transposed = true;
            selected_1.push(transposed[i])
            selected_2.push(transposed[i]);
        }
        else { // both >= 0
            transposed[i].transposed = true;
            selected_1.splice(index_1,0,transposed[i]);
            selected_2.splice(index_2,0,transposed[i]);
        }
    }
    return selected_1;
}
function calc_alignments(lhs,rhs) {
    let selected = [];
    let transposed = [];
    let alignments = ukkonen_compare(lhs,rhs);
    lis_align(alignments,selected,transposed);
    recursive_align(selected,transposed,lhs,rhs);
    return add_transpositions(selected,transposed);
}
