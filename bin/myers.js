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
var DEMO = true;
/**
 * Using the history array generate an edit script
 * @param history an array of successive d positions, each 
 * containing a map of diagonal indices to x values reached on 
 * that diagonal
 */
function backtrack(history, n, m) {
    const edits = [];
    let x = n, y = m;

    for (let d = history.length-1; d > 0; d--) {
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
            edits.unshift({ type: 0, l_index: --x, r_index: --y });
        }

        // The actual edit
        if (d > 0) {
            if (x === prev_x) {
                edits.unshift({ type: 1, r_index: --y });
            } else {
                edits.unshift({ type: -1, l_index: --x });
            }
        }
        x = prev_x;
        y = prev_y;
    }
    // Remaining diagonal moves at d=0
    while (x > 0 && y > 0) {
        edits.unshift({ type: 0, l_index: --x, r_index: --y });
    }
    return edits;
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
    let x = 0,y = 0;
    for (let d = 0; d <= max; d++) {
        // save snapshot of current frontier for later backtracking 
        v_history.push(new Map(v));
        for (let k = -d; k <= d; k += 2) {
            // Choose the source diagonal down=more negative, up = more positive
            const down = v.get(k - 1);
            const up = v.get(k + 1);

            if (k === -d || (k !== d && down < up)) {
                x = up; // down from k + 1
                if ( DEMO )
                    path="from:"+up+','+(up-(k+1));
            } else {
                x = down + 1; // across from k - 1
                if ( DEMO )
                    path="from:"+down+','+(down-(k-1));
            }
            y = x - k;
            if ( DEMO )
                console.log(path+" to:"+x+','+y);
            let old_x = x;
            let old_y = y;
            // Follow diagonal "snakes" where elements match
            while (x < n && y < m && lhs[x] == rhs[y]) {
                x++;
                y++;
            }
            if ( old_x != x ) {
                if ( DEMO )
                    path="from:"+old_x+','+old_y;
                console.log(path+" to:"+x+','+y);
            }
            v.set(k, x);
            // Check if we have reached the end of both sequences
            if (x >= n && y >= m) {
                final_d = d;
                v_history.push(new Map(v));
                found = true;
                break;
            }
        }
        if ( DEMO )
            console.log("d="+d);
        if (found) break;
    }
    let changes = backtrack(v_history,n,m);
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
                obj.text = lhs[changes[i].l_index];
            else
                obj.text += lhs[changes[i].l_index];
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
if ( DEMO ) {
    var left_text = "is strung too high";// 18 chars
    var right_text = "too high is strung";// 18 chars
    myers_compare(left_text,right_text);
}
