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
var pos = {type:null,x1:0,y1:0,x2:0,y2:0};
/**
 * save up track changes and report to the console
 * @param t the type: 0(align), 1(iinsert), -1(delete)
 * @param x1 old x coordinate
 * @param y1 old y coordinate
 * @param x2 new x coordinate
 * @param y2 new y coordinate
 */
function report_backtrack(t,x1,y1,x2,y2) {
    if ( pos.type == null ) {
        pos.x1 = x1;
        pos.y1 = y1;
        pos.x2 = x2;
        pos.y2 = y2;
        pos.type = t;
    }
    else if ( t != pos.type ) {
        console.log("backtrack:"+pos.x1+","+pos.y1+" to:"+pos.x2+","+pos.y2);
        pos.type = t;
        pos.x1 = x1;
        pos.y1 = y1;
        pos.x2 = x2;
        pos.y2 = y2;
    }
    else {
        pos.x2 = x2;
        pos.y2 = y2;
    }
}
function backtrack(trace,n,m) {
    const edits = [];
    let x = n;
    let y = m;
    let type = null;
    for (let d = trace.length - 1; d >= 0; d--) {
        const v_current = trace[d];
        const k = x - y;

        // Determine which previous diagonal we came from
        let prev_k;
        if (k === -d || (k !== d && (v_current[k - 1] ?? 0) < (v_current[k + 1] ?? 0))) {
            prev_k = k + 1;
        } else {
            prev_k = k - 1;
        }

        const prev_x = v_current[prev_k] ?? 0;
        const prev_y = prev_x - prev_k;

        // Process matched "snakes" backwards
        while (x > prev_x && y > prev_y) {
            edits.unshift({ type: 0, l_index:(x-1), r_index:(y-1) });
            if ( DEMO )
                report_backtrack(0,x,y,x-1,y-1);
            x--;
            y--;
        }

        // Record the specific insertion/deletion edit step
        if (d > 0) {
            if (x === prev_x) {
                if ( DEMO )
                    report_backtrack(1,x,y,x,y-1);
                edits.unshift({ type: 1, r_index: (y-1) });
                y--;
            } else {
                if ( DEMO )
                    report_backtrack(-1,x,y,x-1,y);
                edits.unshift({ type: -1, l_index: (x-1) });
                x--;
            }
        }
    }
    if ( DEMO )
        report_backtrack(null,0,0,0,0);
    return edits;
}
function myers_compare(lhs,rhs) {
    const n = lhs.length;
    const m = rhs.length;
    const max = n + m;
    
    // vHistory stores the V array snapshot at each edit distance d
    const history = [];
    const v = {1:0};
    let trace = null;
    for (let d = 0; d <= max; d++) {
        // save snapshot of current frontier for later backtracking 
        history.push({...v});
        for (let k = -d; k <= d; k += 2) {
            let x;
            // Choose the source diagonal down=more negative, up = more positive
            if ( k === -d || (k !== d && (v[k-1] ?? 0) < (v[k+1] ?? 0)) ) {
                x = v[k+1] ?? 0; // down from k + 1
                if ( DEMO )
                    path="from:"+x+','+(x-(k+1));
            } else {
                x = (v[k-1] ?? 0) + 1; // across from k - 1
                if ( DEMO )
                    path="from:"+(x-1)+','+((x-1)-(k-1));
            }
            let y = x - k;
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
                if ( DEMO ) {
                    path="from:"+old_x+','+old_y;
                    console.log(path+" to:"+x+','+y);
                }
            }
            v[k] = x;
            // Check if we have reached the end of both sequences
            if (x >= n && y >= m) {
                trace = history;
                break;
            }
        }
        if ( DEMO )
            console.log("d="+d);
        if (trace) break;
    }
    let changes = backtrack(trace,n,m);
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
