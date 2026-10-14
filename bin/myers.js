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
 * Using the history array generate an edit script
 * @param history an array of successive d positions, each 
 * containing a map of diagonal indices to x values reached on 
 * that diagonal
 * @param d_final the final d value equal to history.length
 */
function backtrack(history, d_final, n, m) {
    const edits = [];
    let x = n, y = m;

    for (let d = d_final; d > 0; d--) {
        const v_prev = history[d-1];
        const k = x - y;

        // Determine if we got here by insertion or deletion
        let prev_k;
        if (k === -d || (k !== d && (v_prev.get(k-1) ?? 0) < (v_prev.get(k+1) ?? 0))) {
            prev_k = k + 1; // was an insertion (move down)
        } else {
            prev_k = k - 1; // was a deletion (move right)
        }

        let prev_x = v_prev.get(prev_k) ?? 0;
        let prev_y = prev_x - prev_k;

        // Diagonal moves (matches) between prev position and current
        while (x > prev_x && y > prev_y) {
            edits.unshift({ type: "equal", l_index: --x, r_index: --y });
        }

        // The actual edit
        if (d > 0) {
            if (x === prev_x) {
                edits.unshift({ type: "insert", r_index: --y });
            } else {
                edits.unshift({ type: "delete", l_index: --x });
            }
        }
        x = prev_x;
        y = prev_y;
    }
}
function myers_compare(lhs,rhs) {
    const n = lhs.length;
    const m = rhs.length;
    const max = n + m;
    
    // vHistory stores the V array snapshot at each edit distance d
    const v_history = [];
    const v = new Map();
    v.set(1, 0);

    let found = false;
    let final_d = 0;

    for (let d = 0; d <= max; d++) {
        // save snapshot of current frontier for later backtracking 
        v_history.push(new Map(v));
        for (let k =  -d; k <= d; k += 2) {
            // Decide whether to move down (insertion) or right (deletion)
            let x;
            const left = v.get(k - 1);
            const right = v.get(k + 1);

            if (k === -d || (k !== d && left < right)) {
                x = right; // down from k + 1
                path="from:"+right+','+(right-(k+1));
            } else {
                x = left + 1; // across from k - 1
                path="from:"+left+','+(left-(k-1));
            }
            let y = x - k;
            console.log(path+" to:"+x+','+y);
            let old_x = x;
            let old_y = y;
            // Follow diagonal "snakes" where elements match
            while (x < n && y < m && lhs[x] == rhs[y]) {
                x++;
                y++;
            }
            if ( old_x != x ) {
                path="from:"+old_x+','+old_y;
                console.log(path+" to:"+x+','+y);
            }
            v.set(k, x);
            // Check if we have reached the end of both sequences
            if (x >= n && y >= m) {
                final_d = d;
                found = true;
                break;
            }
        }
        console.log("d="+d);
        if (found) break;
    }
    // build alignments from history
    const changes = []; // one char at a time
    let x = n;
    let y = m;
    for (let d = final_d; d > 0; d--) {
        const v_prev = v_history[d-1];
        const k = x - y;
        // determine the previous k from which we arrived
        const prev_k = (k === -d || (k !== d && v_prev.has(k-1) && v_prev.get(k-1) < v_prev.get(k+1))) 
            ? k + 1 
            : k - 1;
        const prev_x = (v_prev.has(prev_k))?v_prev.get(prev_k):0;
        const prev_y = prev_x - prev_k;
        // trace diagonal snake backwards (equal elements)
        while (x > prev_x && y > prev_y) {
            changes.unshift({ type: 0, val: lhs[x-1], l_index: --x, r_index:--y});
        }
        // add the single edit step that changed k
        if (x === prev_x) {
            // vertical move -> Insertion from dest
            changes.unshift({ type: 1, val: rhs[prev_y], r_index: --y });
        } else if (y === prev_y) {
            // horizontal move -> Deletion from orig
            changes.unshift({ type: -1, val: lhs[prev_x], l_index: --x });
        }
    }
    // coda
    while (x > 0 && y > 0) {
        changes.unshift({ type: 0, val: lhs[x - 1], l_index: --x, r_index:--y });
    }
    // extract alignments
    let alignments = [];
    let obj = {};
    for ( let i=0;i<changes.length;i++ ) {
        if ( changes[i].type == 0 ) {
            if ( ! Object.hasOwn(obj,"start1") )
                obj.start1 = changes[i].l_index;
            if ( !Object.hasOwn(obj,"start2") )
                obj.start2 = changes[i].r_index;
            if ( ! Object.hasOwn(obj,"text") )
                obj.text = changes[i].val;
            else
                obj.text += changes[i].val;
        }
        else if ( Object.hasOwn(obj,"text") ) {
            alignments.push(obj);
            obj = {};
        }
    }
    if ( Object.hasOwn(obj,"text") )
        alignments.push(obj);
    return alignments;
}
var left_text = "is strung too high";// 18 chars
var right_text = "too high is strung";// 18 chars
myers_compare(left_text,right_text);
