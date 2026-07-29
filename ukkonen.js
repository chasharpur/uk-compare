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
var lhs_len;
var str;
// switch to turn on debug logs
var debug_code = false;
var node_id=0;
var alignments = [];
// the last created internal node
var current = null;
// the initial start position of phase 1
var start_pos = 0;
// the last position of str[j..i-1] used in the extension algorithm
var last;
// the last value of j in the previous extension
var old_j = 0;
// location of last suffix str[j..i] inserted by an extension
var old_beta = {};
var root={},f={};
var left_html= "<body><p>The quick brown fox jumps over the lazy fox</p></body>";//63 chars
var right_html="<body><p>The slow old fox jumps over the energetic dog</p></body>";//65 extra chars
var debug_tree = "";
// Javascript uses signed 32 bit integers
// so here we fake 31 bit unsigned ints
// with the top bit acting as our KIND_MASK
// leaving just the bottom 30 bits for length
// whether the children are in a list or hashtable
const KIND_MASK = 0x40000000;
const LEN_MASK = 0x3FFFFFFF;
const MAX_LIST_CHILDREN = 6;
// this is 2^30-1, the maximum 30 bit unsigned
const INFINITY = 1073741823;
// end of current leaves
var e = 0;
var root;
// define masks
const BAR_VALUE = 61708863;
const BAR_SPACE = 536870912;
// for print_tree
var links = null;
function PARENT_HASH(p) {
    return (p.len&KIND_MASK)==KIND_MASK;
}
function PARENT_LIST(p) {
    return (p.len&KIND_MASK)==0;
}
/**
 * Exit the program on an error
 * @param message display this message first
 */
function fail( message ) {
    console.log(message);
}
function hash( key, nbuckets ) {
    if ( debug_code && !key )
        console.log("oops!");
    return key.charCodeAt(0) % nbuckets;
}
/**
 * Create a hashtable by conversion from a list of child-nodes
 * @param children add these nodes to the hashtable for starters
 * @return an initialised hashtable
 */
function hashtable_create( parent ) {
    let ht = {};
    let nnodes = node_num_children( parent );
    ht.nbuckets = nnodes*2;
    ht.items = [];
    ht.nitems = 0;
    for ( let i=0;i<ht.nbuckets;i++ )
        ht.items.push(null);
    let iter = node_children( parent );
    while ( node_iterator_has_next(iter) ) {
        let temp = node_iterator_next( iter );
        node_clear_next( temp );
        hashtable_add( ht, temp );
    }
    return ht;
}
/**
 * Add an item to the hashtable
 * @param ht the table
 * @param child the node
 */
function hashtable_add( ht, child ) {
    let b = {};
    let res = 1;
    b.next = null;
    b.v = child;
    b.c = node_first_char( child );
    let index = hash( b.c, ht.nbuckets);
    if ( ht.items[index] == null )
        ht.items[index] = b;
    else {
        let b2 = ht.items[index];
        while ( b2.next != null )
            b2 = b2.next;
        b2.next = b;
    }
    ht.nitems++;
    return res;
}
/**
 * Get a node from the table. Has to be fast.
 * @param ht the hashtable in question
 * @param c the first char 
 * @return the node or null if not found
 */
function hashtable_get( ht, c ) {
    let index = hash( c, ht.nbuckets );
    let b = ht.items[index];
    while ( b != null && b.c != c )
        b = b.next;
    if ( b != null )
        return b.v;
    else
        return null;
}
/**
 * Remove a node from the hashtable
 * @param ht the table to remove it from
 * @param first_char the first char of the entry to remove
 * @return 1 if it was removed
 */
function hashtable_remove( ht, first_char ) {
    let index = hash( first_char, ht.nbuckets);
    let b = ht.items[index];
    if ( b != null ) {
        let last = b;
        while ( b != null && b.c != first_char ) {
            last = b;
            b = b.next;
        }
        if ( b != null ) { // found it
            if ( last != b )
                last.next = b.next;
            else
                ht.items[index] = b.next;
            ht.nitems--;
            return 1;
        }
    }
    return 0;
}
/**
 * Replace one node with another
 * @param ht the hashtable to do it in
 * @param v the child to replace
 * @param u the node to replace it with
 * @return 1 if it worked
 */
function hashtable_replace( ht, v, u ) {
    if ( hashtable_remove(ht,node_first_char(v)) )
        return hashtable_add(ht,u);
    else
        return 0;
}
/**
 * How many nodes are in the table?
 * @param ht the hashtable object
 * @return the number of current nodes stored
 */
function hashtable_size( ht ) {
    if ( debug_code && ht == undefined )
        console.log("undefined");
    return ht.nitems;
}
/**
 * Convert a hashtable's values to an array
 * @param ht the hashtable to convert
 * @return an array of nodes in the hashtable
 */
function hashtable_to_array( ht ) {
    let i,j;
    let nodes = [];
    for ( i=0,j=0;i<ht.nbuckets;i++ ) {
        let b = ht.items[i];
        while ( b != null ) {
            nodes.push( b.v );
            b = b.next;
        }
    }
    return nodes;
}
/**
 * Add a child node (can't fail)
 * @param parent the node to add the child to
 * @param child the child to add
 */
function node_add_child( parent, child ) {
    if ( PARENT_LIST(parent) )
        node_append_sibling( parent, child );
    else
        hashtable_add( parent.ht, child );
    child.parent = parent;
}
/**
 * Add another child to the sibling list
 * @param parent the parent
 * @param child the new sibling of parent's children
 */
function node_append_sibling( parent, child ) {
    if ( parent.children == null )
        parent.children = child;
    else {
        let temp = parent.children;
        let size = 1;
        while ( temp.next != null ) {
            size++;
            if ( size >= MAX_LIST_CHILDREN ) {
                parent.ht = hashtable_create( parent );
                delete parent.children;
                parent.len |= KIND_MASK;
                hashtable_add( parent.ht, child );
                return;
            }
            temp = temp.next;
        }
        temp.next = child;
    }
}
/**
 * Iterate through a set of nodes
 * @param parent the parent whose children should be iterated through
 * @return an iterator or null if it failed
 */
function node_children( parent ) {
    let iter = {};
    if ( PARENT_LIST(parent) ) {
        let size = node_num_children( parent );
        iter.nodes = [];
        iter.num_nodes = size;
        iter.position = 0;
        let i=0;
        let v = parent.children;
        while ( v != null ) {
            iter.nodes[i++] = v;
            v = v.next;
        }
    }
    else {
       let size = hashtable_size( parent.ht );
       iter.num_nodes = size;
       iter.nodes = hashtable_to_array( parent.ht );
       iter.position = 0;
    }
    return iter;
}
function node_clear_next( v ) {
    if ( PARENT_LIST(v.parent) )
        v.next = null;
}
/**
 * Create a node safely
 * @param start the start index in the side version
 * @param len the length of the fragment
 * @return the finished node 
 */
function node_create( start, len ) {
    let n = {};
    n.start = start;
    if (debug_code && n.start > str.length)
        console.log("node_create: error");
    n.len = len;
    n.id = ++node_id;
    n.next = null;
    n.children = null;
    // we will replace "children" with "ht" if it gets too big
    // this was a union in C
    // suffix link 
    n.link = null;
    // parent of node : needed to implement splits
    n.parent = null;
    return n;
}
/**
 * Create a leaf starting at a given offset 
 * @param i the offset into the string
 * @return the finished leaf
 */
function node_create_leaf( i ) {
    let leaf = {};
    leaf.id = ++node_id;
    leaf.start = i;
    if ( debug_code && leaf.start > str.length)
        console.log("node_create_leaf: error");
    leaf.len = INFINITY;
    leaf.children = null;
    leaf.parent = null;
    leaf.next = null;
    return leaf;
}
function node_end( v, max ) {
    if ( node_len(v) == INFINITY )
        return max;
    else
        return v.start+node_len(v)-1;
}
function node_first_char( v ) {
    return str[node_start(v)];
}
/**
 * Is this node the last one in this branch of the tree?
 * @param v the node to test
 * @return 1 if it is else 0
 */
function node_is_leaf( v ) {
    if ( PARENT_LIST(v) )
        return v.children == null;
    else
        return 0;
}
/**
 * Are there any more nodes in this iterator?
 * @param iter the iterator
 * @return 1 if it does else 0
 */
function node_iterator_has_next( iter ) {
    return iter.position < iter.num_nodes;
}
/**
 * Get the next node pointed to by the iterator
 * @param iter the iterator 
 * @return the next node object
 */
function node_iterator_next( iter ) {
    try {
        if ( iter.position < iter.num_nodes )
            return iter.nodes[iter.position++];
        else
            return null;
    }
    catch ( e ) {
        console.log(e);
    }
}
function node_len_real( v ) {
    return (node_len(v)==INFINITY)?e:node_len(v);
}
function node_len( v ) {
    return LEN_MASK&v.len;
}
/**
 * Get the suffix link
 * @param v the node to get the link of
 * @return the node sv
 */
function node_link( v ) {
    return v.link;
}
/**
 * Find out the number of children we have
 * @param v the node in question
 * @return an integer
 */
function node_num_children( v ) {
    let size = 0;
    if ( PARENT_LIST(v) ) {
        let temp = v.children;
        while ( temp != null ) {
            size++;
            temp = temp.next;
        }
    }
    else
        size = hashtable_size( v.ht );
    return size;
}
function node_parent( v ) {
    return v.parent;
}
/**
 * Replace one child with another
 * @param v the node to be replaced
 * @param u its replacement
 */
function node_replace_child( v, u ) {
    if ( PARENT_LIST(v.parent) ) {
        // isolate v and repair the list of children
        let child = v.parent.children;
        let prev = child;
        while ( child != null && child != v ) {
            prev = child;
            child = child.next;
        }
        if ( child == prev )
            v.parent.children = u;
        else
            prev.next = u;
        u.next = child.next;
        v.next = null;
        //node_print_children(v.parent);
    }
    else if ( PARENT_HASH(v.parent) ) {
        let res = hashtable_replace( v.parent.ht, v, u );
        if (!res)
            fail( "failed to replace node\n" );
    }
    else
        fail( "unknown node kind \n" );
}
function node_set_len( v, len ) {
    v.len = (v.len&KIND_MASK)+len;
}
/**
 * Set the node's suffix link
 * @param v the node in question
 * @param link the node sv
 */
function node_set_link( v, link ) {
    v.link = link;
}
/**
 * Get the node's side (left or right)
 * @param v the node  
 * @returns the side: 1=left, 2=right
 */
function node_side( v ) {
    return (v.start<=lhs_len)?1:2;
}
/**
 * Split this node's edge by creating a new node in the middle. Remember 
 * to preserve the "once a leaf always a leaf" property or f will be wrong.
 * @param v the node in question
 * @param loc the place on str after which to split it
 * @return the new internal node
 */
function node_split( v, loc ) {
    // create front edge u leading to internal node v
    let u_len = loc-v.start+1;
    let u = node_create( v.start, u_len );
    // now shorten the following node v
    if ( !node_is_leaf(v) ) {
        if ( debug_code && v.id == 1 )
            console.log("root!");
        v.len -= u_len;
    }
    // replace v with u in the children of v.parent
    node_replace_child( v, u );
    v.start = loc+1;
    if ( debug_code && v.start > str.length )
        console.log("node_split: error");
    // reset parents
    u.parent = v.parent;
    v.parent = u;
    // NB v is the ONLY child of u
    u.children = v;
    return u;
}
function node_start( v ) {
    if ( v != null )
        return v.start;
    else
        return -1;
}
/**
 * Create a path
 * @param start the start index into str
 * @param len the length of this path 
 * @return the complete path
 */
function path_create( start, len ) {
    let p = {};
    p.start = start;
    if ( debug_code && p.start > str.length )
        console.log("path_create: error");
    p.len = len;
    return p;
}
/**
 * Access the start field
 * @param p the path in question
 * @return the path length
 */
function path_len( p ) {
    return p.len;
}
/**
 * Add one path to the front of another
 * @param p the current path
 * @param len the length of the prefix
 */
function path_prepend( p, len ) {
    p.start -= len;
    if ( debug_code && p.start > str.length )
        console.log("error");
    p.len += len;
}
/**
 * Access the start field
 * @param p the path in question
 * @return the path start index in str
 */
function path_start( p ) {
    return p.start;
}
function inc_e(offset) {
    e++;
}
/**
 * Does the position continue with the given character?
 * @param p a position in the tree. 
 * @param c the character to test for in the next position
 * @return 1 if it does else 0
 */
function continues( p, c ) {
    if ( node_end(p.v,e) > p.loc )
        return str[p.loc+1] == c;
    else
        return find_child(p.v,c) != null;
}
function verify_beta(j,i){
    let txt = str.substring(j,i+1);
    let v = root;
    while ( txt.length > 0 ) {
        v = find_child(v, txt[0]);
        if ( v == null )
            break;
        else if ( node_len(v) > txt.length )
        {
            let test = str.substring(v.start,v.start+txt.length);
            if ( test == txt )
                txt = "";
            else
                console.log("expected "+txt+" but found "+test);
        } 
        else
            txt = txt.substring(v.len);
    }
}
/**
 * Find a location of the suffix in the tree.
 * @param j the extension number counting from 0
 * @param i the current phase - 1
 * @return the position (combined node and edge-offset)
 */ 
function find_beta( j, i ) {
    let p;
    if ( old_j > start_pos && old_j == j ) {
        if ( debug_code && old_beta.v.start > str.length )
            console.log("error");
        p = pos_create();
        p.loc = old_beta.loc;
        p.v = old_beta.v;
        if ( debug_code && p.v.start > str.length )
            console.log("find_beta_1: error");
    }
    else if ( j>i ) { // empty string
        p = pos_create();
        p.loc = start_pos;
        p.v = root;
        if ( debug_code && p.v.start > str.length )
            console.log("find_beta_2: error");
    }
    else if ( j==start_pos ) {  // entire string
        p = pos_create();
        p.loc = i;
        p.v = (start_pos<lhs_len)?f:g;
        if ( debug_code && p.v.start > str.length )
            console.log("find_beta_3: error");
    }
    else { // walk across tree
        let v = last.v;
        let len = last.loc-node_start(last.v)+1;
        let q = path_create( node_start(v), len );
        v = node_parent( v );
        while ( v != root && node_link(v)==null ) {
            path_prepend( q, node_len(v) );
            v = node_parent( v );
        }
        if ( v != root ) {
            v = node_link( v );
            p = walk_down( v, q );
        }
        else
            p = walk_down( root, path_create(j,i-j+1) );
        if ( debug_code && p.v.start > str.length )
            console.log("find_beta_4: error");
    }
    last = p;
    if ( debug_code )
        verify_beta(j,i);
    if ( debug_code && p.v.start > str.length )
        console.log("find_beta_4: error");
    return p;
}
/**
 * If current is set, set its link to point to the next node, then clear it
 * @param v the link to point current to
 */
function update_current_link( v ) {
    if ( current != null ) {
        node_set_link( current, v );
        current = null;
    }
}
/**
 * Extend the implicit suffix tree by adding one suffix of the current prefix
 * @param j the offset into str of the suffix's start
 * @param i the offset into str at the end of the current prefix
 * @return 1 if the phase continues else 0
 */
function extension( j, i ) {
    let res = 1;
    let p = find_beta( j, i-1 );
    // rule 1 (once a leaf always a leaf)
    if ( node_is_leaf(p.v) && pos_at_edge_end(p) ){
        res = 1;
    }
    // rule 2
    else if ( !continues(p,str[i]) ) {
        //printf("applying rule 2 at j=%d for phase %d\n",j,i);
        let leaf = node_create_leaf( i );
        if ( p.v==root || pos_at_edge_end(p) ) {
            node_add_child( p.v, leaf );
            update_current_link( p.v );
        }
        else {
            let u = node_split( p.v, p.loc );
            update_current_link( u );
            if ( i-j==1 )
                node_set_link( u, root );
            else 
                current = u;
            node_add_child( u, leaf );
        }
        update_old_beta( p, i );
    }
    // rule 3
    else {
        //printf("applying rule 3 at j=%d for phase %d\n",j,i);
        update_current_link( p.v );
        update_old_beta( p, i );
        res = 0;
    }
    return res;
}
/**
 * Find a child of an internal node starting with a character
 * @param v the internal node
 * @param c the char to look for
 * @return the child node or null
 */
function find_child( v, c ) {
    if ( PARENT_LIST(v) ) {
        v = v.children;
        while ( v != null && str[v.start] != c )   
           v = v.next;
        return v;
    }
    else if ( PARENT_HASH(v) ) {
        let u = hashtable_get( v.ht, c );
        return u;
    }
    else
        return null;
}
function find_string( txt, debug ) {
    let v = root;
    if ( debug )
        console.log("looking for "+txt);
    while ( txt.length > 0 ) {
        v = find_child(v, txt[0]);
        if ( v == null )
            return false;
        else {
            if ( debug )
                console.log("found id "+v.id+" txt="+str.substring(v.start,v.start+node_len_real(v))+" @ "+v.start);
            txt = txt.substring(node_len_real(v));
        }
    }
    return true;
}
/**
 * Process the prefix of str ending in the given offset
 * @param i the inclusive end-offset of the prefix
 */
function phase( i ) {
    let j;
    current = null;
    for ( j=old_j;j<=i;j++ )            
        if ( !extension(j,i) )
            break;
    // remember number of last extension for next phase
    old_j = (j>i)?i:j;
    // update all leaf ends
    inc_e(i);
   // print_tree( root );
}
/**
 * Create a position safely
 * @return the finished pos or fail
 */
function pos_create() {
    let p = {
        v: null,
        loc: 0
    };
    return p;
}
/**
 * Are we at the end of this edge?
 * @param p the position to test
 * @return 1 if it is, else 0
 */
function pos_at_edge_end( p ) {
    return p.loc==node_end(p.v,e);
}
/**
 * Add a new bar to the bars array
 * @param bars an array of bar positions
 * @param bar a new bar position to add
 * @return the revised array of bar-positions
 */
function add_bar( bars, bar ) {
    if ( bars == null )
        bars = [];
    bars.push(bar);
    return bars;
}
/**
 * Print a series of bars
 * @param bars the bars themselves
 * @param skip_last print a space instead of a vertical bar for the last bar
 */
function print_bars( bars, skip_last ) {
    if ( bars != null ) {
        let j,i = 0;
        while ( bars[i] != 0 ) {
            let bar_value = bars[i] & BAR_VALUE;
            for ( j=0;j<bar_value;j++ )
                debug_tree += " ";
            if ( !skip_last || bars[i+1]!=0 ) {
                if ( bars[i] & BAR_SPACE )
                    debug_tree += " ";
                else
                    debug_tree += "|";
            }
            i++;
        }
    }
}
/**
 * Print a series of bars and then a CR
 */
function print_bar_line( bars ) {
    print_bars( bars, 0 );
    debug_tree += "\n";
}
/**
 * Print the label of the node
 * @param v the node to print
 * @return number of characters written
 */
function print_label( v ) {
    let i,start,end;
    end = node_end(v,e);
    start = node_start(v);
    debug_tree += "("+v.parent.id+"->"+v.id+")"+start+": ";
    for ( i=node_start(v);i<=end;i++ ) {
        if ( str[i]=='\0' ) // !needs to account for side
            debug_tree += "$";
        else
            debug_tree += str[i];   // ! needs to account for side
    }
    // print terminal star for unfinished leaves
    if ( node_num_children(v)==0 && e < lhs_len )
        debug_tree += "*";
    return end-start+1;
}
/**
 * Set the mode of the final bar in a series
 * @param bars the bar array to modify
 * @param mode the new mode for the last bar
 */
function set_last_bar( bars, mode ) {
    bars[bars.length-1] |= mode;
}
/**
 * Print a tree out left to right by preorder traversal
 * @param v the node to start printing from
 * @param bars array of vertical bars to draw on each line
 */
function print_node( iter, bars ) {
    let depth;
    let first = true;
    while ( node_iterator_has_next(iter) ) {
        let u = node_iterator_next(iter);
        if ( !first ) {
            print_bar_line( bars );
            print_bars( bars, 1 );
            first = false;
        }
        if ( !node_iterator_has_next(iter) )
            set_last_bar(bars,BAR_SPACE);
        debug_tree += "-";
        depth = print_label(u);
        if ( node_is_leaf(u) )
            debug_tree += "\n";
        else
            print_node( node_children(u), add_bar(bars,depth) );
    }
}
/**
 * Print the entire tree recursively
 * @param root the node to start from
 */
function print_tree( root ) {
    print_node( node_children(root), add_bar(null,0) );
    console.log(debug_tree);
}
/**
 * Set the length of each leaf to e recursively
 * @param v the node in question
 */
function set_e( v ) {
    if ( node_is_leaf(v) ) {
        // if a leaf and len != INFINITY then it is already set for version 1
        if ( node_len(v) == INFINITY ){
            node_set_len( v, e-node_start(v) );
        }
    }
    else { 
        let iter = node_children( v );
        if ( iter != null ) {
            while ( node_iterator_has_next(iter) ) {
                let u = node_iterator_next( iter );
                set_e( u );
            }
        }
    }
}
/**
 * Record the position where the latest suffix was inserted
 * @param p the position of j..i-1.
 * @param i the desired index of the extra char
 */
function update_old_beta( p, i ) {
    if ( node_end(p.v,e) > p.loc ) {
        old_beta.v = p.v;
        old_beta.loc = p.loc+1;
        if ( debug_code ) {
            if (old_beta.loc > str.length || old_beta.v.start > str.length )
                console.log("update_old_beta: error");
        }
    }
    else {
        let u = find_child( p.v, str[i] );
        old_beta.v = u;
        old_beta.loc = node_start( u );
        if ( debug_code ) {
            if (old_beta.loc > str.length || old_beta.v.start > str.length )
                console.log("update_old_beta: error");
        }
    }
}
/**
 * Walk down the tree from the given node following the given path
 * @param v the node to start from its children
 * @param p the path to walk down and then free
 * @return a position corresponding to end
 */
function walk_down( v, p ) {
    let q = null;
    let start = path_start( p );
    let len = path_len( p );
    v = find_child( v, str[start] );
    while ( len > 0 ) {
        if ( len <= node_len(v) ) {
            q = pos_create();
            q.loc = node_start(v)+len-1;
            q.v = v;
            break;
        }
        else {
            start += node_len(v);
            len -= node_len(v);
            v = find_child( v, str[start] );
        }
    }
    if ( debug_code && q.v.start > str.length )
        console.log("error");
    return q;
}
/**
 * Are two leaf nodes split between the two versions?
 * @param v the first leaf node
 * @param w the other leaf node with the same parent
 * @return true if they belong to two versions, false otherwise
*/
function leaf_is_split( v, w ) {
    return v.start <= lhs_len && w.start >= lhs_len+1;
}
/**
 * Extract the text of a node, counting back to root
 * @param u the node
 * @return a string
 */
function path_extract_text( u ) {
    let e_str = "";
    while ( u != root ) {
        e_str = str.substring(u.start,u.start+node_len_real(u))+e_str;
        u = u.parent;
    }
    return e_str;
}
/**
 * Extract a string back to root and add it to the alignments
 * @param u the node to start from (included) 
 */
function path_extract_align( u ) {
    let text = path_extract_text(u);
    let starts = [];
    let child = u.children;
    while ( child != null ) {
        starts.push(child.start);
        child = child.next;
    }
    let a = {text:text};
    for ( let start of starts ) {
        if ( start <= lhs_len )
            a.start1 = start-text.length;
        else if ( start > lhs_len )
            a.start2 = (start-text.length) - (lhs_len+1);
    }
    alignments.push(a);
}
function find_alignments( u ) {
    let nnodes = node_num_children( u );
    if ( nnodes == 2 ) {
        let iter = node_children( u );
        let v = node_iterator_next(iter);
        let w = node_iterator_next(iter);
        if ( node_is_leaf(v) && node_is_leaf(w) && leaf_is_split(v,w) ) {
            if ( debug_code && node_start(u) >= lhs_len )
                console.log("find_alignments: this shouldn't happen" )
            else
                path_extract_align(u);
        }
        else {
            if ( !node_is_leaf(v) )
                find_alignments( v );
            if ( !node_is_leaf(w) )
                find_alignments( w );
        }
    }
    else {
        let iter = node_children( u );
        while ( node_iterator_has_next(iter) ) {
            let v = node_iterator_next(iter);
            find_alignments(v);
        }
    }
}
/**
 * Return the end of the alignment (one char AFTER the end)
 * @param a the alignment
 * @param side the side (1 or 2)
 * @return the alignment start position+text length
 */
function alignment_end(a, side ) {
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
 * @return the AMOUNT of overlap. >0 menas overlap, <= 0 means none 
 */
function alignment_overlap(a,b,side) {
    return alignment_end(a,side)-alignment_start(b,side);
}
function flip_side(side){
    return (side==1)?2:1;
}
function alignment_last_char(a) {
    return (a.text.length>0)?a.text[a.text.length-1]:'\0';
}
function alignment_first_char(a) {
    return (a.text.length >0)?a.text[0]:'\0';
}
/**
 * Pick alignments using the longest increasing subsequence heuristic
 * @param a a non-empty alignment set sorted on start position
 * @param selected output: the selected set of alignments
 * @param side left (1) or right (2)
 */
function lis_align(a,selected,side) {
    // find longest alignment in a
    let longest = 0;
    for ( let i=1;i<a.length;i++ ) {
        if ( a[i].text.length > a[longest].text.length )
            longest = i;
    }
    // find element to insert before (or null)
    let before = null;
    for ( let i=0;i<selected.length;i++ ) {
        // yes, less than or equal - see alignment_end above
        if ( alignment_end(a[longest],side) <= alignment_start(selected[i],side) )
            before = i;
    }
    if ( before == null )
        selected.push(a[longest]);
    else
        selected.splice(before,0,a[longest]);
    // recurse into the left and right sets of aligments
    // NB sort left set by their increasing ENDS
    let left = a.slice(0,longest);
    left.sort((a,b)=>alignment_end(a,side)-alignment_end(b,side));
    // sort right set by their increasing starts
    let right = a.slice(longest+1);
    right.sort((a,b)=>alignment_start(a,side)-alignment_start(b,side));
    // remove overlapping alignments
    // left side complicated by possibility of fake overlap
    let i = left.length-1;
    // dangerous loop - must exercise caution
    while ( i >= 0 ){
        let overlap = alignment_overlap(left[i],a[longest],side);
        // 1. no overlap
        if ( overlap <= 0 )
            break;
        // 2. lots of overlap
        else if ( overlap > 1 ) {
            left.splice(i,1);
        }
        // 3. overlap == 1
        else {  
            let other_side = flip_side(side);
            let other_overlap = alignment_overlap(left[i],a[longest],other_side);
            // if v1: foo\nbar v2: foo\n92\nbar left align=foo\n right align=\nbar: fake "overlap" is \n
            // only in this case we curtail the left alignment by 1 and keep it
            if ( other_overlap <= 0 && alignment_last_char(left[i])==alignment_first_char(a[longest]) ) {
                left[i].text = left[i].text.slice(0,left[i].text.length-1);
            }
            // in all other overlap cases we drop the alignment
            else {
                left.splice(i,1);
            }
        }
        // ALWAYS decrement index
        i--;
    }
    // no special treatment for right facing overlap yet, and maybe not needed
    while ( right.length>0 && alignment_start(right[0],side) < alignment_end(a[longest],side) ){
        right.shift();
    }
    // recurse
    if ( left.length > 0 )
        lis_align(left,selected,side);
    if ( right.length > 0 )
        lis_align(right,selected,side);
}
function filter_alignments() {
    let filtered = [];
    let final_filtered = [];
    alignments.sort((a,b)=>a.start1-b.start1);
    lis_align(alignments,filtered,1);
    filtered.sort((a,b)=>a.start2-b.start2);
    lis_align(filtered,final_filtered,2);
    return final_filtered;
}
/**
 * Remove all interior or leaf nodes whose text runs over the middle 
 * @param v the node to start from (initially root)
 */
function prune_tree( v ) {
    let end = v.start+node_len_real(v);
    if ( v.start <= lhs_len && end > lhs_len ) {
        if ( node_is_leaf(v) )
            v.len = lhs_len-v.start;
        else { // internal node with children
            if ( PARENT_HASH(v) ) {
                v.ht = null;
                v.len = lhs_len-v.start;
            }
            else {
                v.len = lhs_len-v.start;
                v.children = null;
            }
        }
    }
    else if ( !node_is_leaf(v) ) {
        let iter = node_children( v );
        let u = node_iterator_next(iter);
        while ( u != null ) {
            prune_tree(u);
            u = node_iterator_next(iter);
        }
    }
}
/** Compare two versions */
function ukkonen_compare(lhs,rhs) {
    node_id=0;
    alignments = [];
    current = null;
    start_pos = 0;
    debug_code = false;
    last;
    old_j = 0;
    old_beta = {};
    debug_tree = "";
    e = 0;
    links = null;
    // create I_0 manually
    lhs_len = lhs.length;
    str = lhs+'\0'+rhs+'%';
    //console.log("str.length="+str.length);
    // do the lhs first
    root = node_create( 0, 0 );
    f = node_create_leaf( 0 );
    node_add_child( root, f );
    for ( let i=1; i<str.length; i++ )
        phase(i);
    set_e( root );
    prune_tree( root );
    //print_tree(root);
    find_alignments(root);
    alignments = filter_alignments();
    //find_string( " dog</p></body>", true );
    return alignments;
}
/*ukkonen_compare(left_html,right_html);
for ( const a of alignments ) {
    let a_end = a.start1+a.text.length;
    console.log(a.start1+":"+a_end+"="+a.text);
}*/