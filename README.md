# Ukkonen's suffix tree compare tool
Esko Ukkonen created a linear time algorithm for building a suffix tree 
in 1995[1]. This Javascript module uses it to compare two HTML files, 
marking unshared portions as deleted or added, depending on the side of 
the comparison: deleted = left side, added = right-side. Its 
implementation in Javascript allows comparison between two versions to 
be carried out in the user's browser directly, rather than relying on a 
server to perform the calculation.

## Rationale
Most textual comparison tools use a collation algorithm in which, 
potentially at least, each character position in one version is compared 
to all character positions in the other version. Misalignments are 
common, and the efficiency is only N squared, where N is the average 
length of one version. Also this does not normally calculate 
transpositions. Certain versions of the collation algorithm claim faster 
run times, but no faster than NxD, where D is the edit distance between 
the versions, and for completely dissimilar texts the efficiency is 
still N squared. The other drawbacks remain. There has to be a better 
way, and that way is to use suffix trees.

## Suffix trees
A suffix tree stores in a tree structure all possible suffixes for a 
string. For the string "banana" the suffixes are: 
    a, na, ana, nana, anana, banana
Sorting the suffixes from left to right yields:
```
    a
    ana
    anana
    banana
    nana
```
A tree can easily be constructed out of this sorted list:
```
    a-
    -na-
    ---ana
    banana
    nana
```
So the root of the tree has three children: a, b and n. The a-branch has 
one child a->na, which in turn has one child a->na->ana. banana is a 
leaf-node on its own, as is nana.

It may not be immediately obvious that a suffix tree can be used for 
comparison, but it can clearly be used for searching. When looking for 
the string ana we travel first to the root, locate the a-child, then 
verify that it continues with at least na. Similarly for the string na. 
Since the suffix tree stores ALL start positions in the text we can find 
all SUBstrings of the string in time proportional to the length of the 
text BEING SEARCHED FOR. In a text of 1 million characters we can test 
if a string of four letters occurs in it in time proportional to four. 
An exhaustive search, on the other hand, would find that string in time 
proportional to 1 million. Quite an improvement!

## Extending suffix trees to do comparison
To compare two texts we simply concatenate them. At the end of the first 
text we place a marker, and at the end of the second another, DIFFERENT 
marker. For markers we can use the NULL or ONE character. These will 
never occur in the text. We then build the suffix tree with the 
concatenated string.

One drawback with this method is that substrings starting in one text 
and ending in the other will be found, which is NOT wanted. However, the 
solution is simple: we can prune the tree. Any branches starting in the 
first version and ending in the second can simply be curtailed at the 
marker ending the first version.

A pruned suffix tree created in this way can be used to find text found 
in both versions. We can examine the leaves of the tree in linear time. 
If the parent of a leaf has exactly two children, and one of those 
children begin in version 1 and the other in version 2, it follows that 
the route through the tree to this parent must be text shared by each 
version.

However, this method is not infallible. 

1. Although it lists all matches between two versions they may be 
entirely contained by other longer matches, and so must be removed.

2. Even after weeding out these redundant matches it may be that two 
shorter overlapping matches provide a better overall alignment than one 
long one, which overlaps both of them.

3. Finally, we have no guarantee that any of the matches are unique.

I will pass over problems 2 and 3 for now.

## Constructing the suffix tree
Ukkonen's algorithm is simple enough but hard to understand in detail. I 
made an effort to explain it fully in the C language some years ago [2]. 
In simpler terms Ukkonen's method is to examine the suffixes starting 
from left to right. Because this means that the "suffixes" are all 
incomplete until the end of the text is reached, the tree is also 
incomplete until it is finished. This also means that the time taken 
ought to be proportional to N cubed. However, using a couple of tricks 
the time is reduced to LINEAR (proportional to N) especially by the use 
of links between the branches of the unfinished tree. The algorithm 
essentially remembers where it last was and uses this information to 
avoid going back to the root as each suffix is added. It is a bit like a 
monkey travelling through the jungle by swinging from tree to tree 
instead of laboriously climbing each one in turn.

## To do
At the moment all I have working is Ukkonen's algorithm extended to two 
versions. It is just a test program with two hardwired strings. Although 
the algorithm is complete, and works, there is still much to do: 

1. Build a html rig to load two versions of a single work.

2. Run the diff 
algorithm on both versions to produce a sorted array of alignments. Use 
a simple left/right division using a table and a dropdown on the right. 
Use a sync scrolling algorithm to align left and right sides based on 
alignments. You could use a recalc_alignment routine after two versions 
were compared. 

3. Iterate through the characters of each version, skipping to the 
contents of the body element and the script element. Skip also any 
characters inside a tag. For each textual token test if it is inside an 
alignment. If the previous character was not in alignment, emit a close 
span tag and then the character, followed by an anchor tag with a id. If 
it is not in alignment, but the previous character was, emit a start 
delete/insert span tag (depending on the side), followed by the 
character. If you encounter a start or end tag and you were in an 
insert/delete span, emit the end span tag followed by '<'. 

4. Set the text of each side to the revised body content.

[1] Ukkonen, E. (1995). "On-line construction of suffix trees" (PDF). Algorithmica. 14 (3): 249–260

[2] D. Schmidt (2013). [Ukkonen's suffix tree algorithm ](https://programmerspatch.blogspot.com/2013/02/ukkonens-suffix-tree-algorithm.html)
