# Ukkonen's suffix tree compare tool
Esko Ukkonen created a linear time algorithm for building a suffix tree 
in 1995[1]. "Linear time" means that as the length of the texts to be 
compared increases, the time taken is directly proportional to that. So 
comparing two texts four times as long overall takes no more than four 
times longer. This is fast enough to do a comparison even between long 
texts without the user noticing any significant time lag.

This Javascript module uses it to compare two HTML files, marking 
unshared portions as deleted or added, depending on the side of the 
comparison: deleted = left side, added = right-side. Its implementation 
in Javascript allows comparison between two versions to be carried out 
in the user's browser directly, rather than relying on a server to 
perform the calculation. The server can thus simply be a repository of 
information served up to the user rather than a complex piece of 
software needing constant maintenance.

## Rationale
Most textual comparison tools use a collation algorithm where, 
potentially at least, each character position in one version is compared 
to all character positions in the other version. Misalignments are 
common, and the time taken is proportial to N squared, where N is the average 
length of one version. Also this method does not normally calculate 
transpositions. Certain versions of the collation algorithm claim faster 
run times, but none is faster than NxD, where D is the edit distance between 
the versions, and for completely dissimilar texts the efficiency is 
still N squared[2]. The other drawbacks remain, and in particular the 
slowness makes this method useless for anything but short texts. There 
has to be a better way, and that way is to use suffix trees.

## Suffix trees
A suffix tree stores in a tree structure all possible suffixes for a 
string. For the string "banana" the suffixes are: 
```
    a, na, ana, nana, anana, banana.
```
Sorting the suffixes from left to right yields:
```
    a
    ana
    anana
    banana
    nana
```
A tree can easily be constructed out of this sorted list by replacing shared text at the start of each line with branches:
```
    a->
    ->na->
    --->ana🙑
    banana🙑
    nana🙑
``` 
So the root of the tree – here represented by the first column of 
characters – has three children: a, b and n. The a-branch has one child 
a->na, which in turn has one child a->na->ana. banana is a leaf-node (🙑) on 
its own, as is nana.

It may not be immediately obvious that a suffix tree can be used for 
comparison, but it can clearly be used for searching. When looking for 
the string ana we travel first to the root, locate the a-child, then 
verify that it continues with at least na. Similarly for the string na we find n at the root, then follow it until it fully matches na. 
Since the suffix tree stores ALL start positions in the text we can find 
all SUBstrings of the string in time proportional to the length of the 
text BEING SEARCHED FOR. In a text of 1 million characters we can test 
if a string of four letters occurs within it in time proportional to four. 
An exhaustive search, on the other hand, would find that string in time 
proportional to 1 million. Quite an improvement!

## Extending suffix trees to do comparison
To compare two texts we simply concatenate them. At the end of the first 
text we place a marker, and at the end of the second another, DIFFERENT 
marker. For markers we can use the NULL or ONE character. These will 
never occur in the text. We then build the suffix tree with the 
concatenated string.

One drawback with this method is that substrings starting in the first text 
and ending in the second will be found, which is NOT wanted. However, the 
solution is simple: we can prune the tree. Any branches starting in the 
first version and ending in the second can simply be curtailed at the 
marker ending the first version.

A pruned suffix tree created in this way can be used to find text found 
in both versions. We can examine the leaves of the tree in linear time. 
If the parent of a leaf has exactly two children, and one of those 
children begin in version 1 and the other in version 2, it follows that 
the route through the tree to this parent must be text shared by each 
version.

## Constructing the suffix tree
Ukkonen's algorithm is hard to understand in detail. I made an effort to 
explain it fully in the C language some years ago [3]. In simpler terms 
his method is to examine the suffixes by moving through the text from 
left to right, rather than the established right to left approach. 
Initially this seems worse. The left to right approach increases the 
time complexity from N squared to N cubed. However, by using a couple of 
tricks, the time is reduced to LINEAR (proportional to N) especially by 
the use of links between the branches of the unfinished tree. The 
algorithm essentially remembers where it last was and so avoids having 
to go back to the root as each new suffix is added. It is a bit like a 
monkey travelling through the jungle by swinging from tree to tree 
instead of laboriously climbing each tree in turn.

## What works
At the moment all I have working is Ukkonen's algorithm extended to two 
versions. There is a partially written test rig with some sample files taken from the Charles Harpur archive.
I hope soon to complete this to demonstrate comparison between two texts selected in the test rig.

## The future
I hope to extend this to N versions. If we have N versions then the number of two-way comparisons that can be done is 
N(N-1)/2. So for 30 versions this is only 435. That is a lot but once the results of all two-way comparisons are known it 
should be possible to build an accurate MVD, or multi-version document, which is just a partial order of text fragments 
belonging to subsets of the total number of versions. Once in the MVD format it will be possible to instantly display a 
table of all differences between all versions or between a subset of them.

## Installation
Clone the repository and place it inside a web server's documents directory. Navigate to index.html.

[1] Ukkonen, E. (1995). "On-line construction of suffix trees" (PDF). Algorithmica. 14 (3): 249–260

[2] Myers, E. (1986). An O(ND) Difference Algorithm and Its Variations," Algorithmica Vol. 1 No. 2, 1986, pp. 251-266.

[3] D. Schmidt (2013). [Ukkonen's suffix tree algorithm ](https://programmerspatch.blogspot.com/2013/02/ukkonens-suffix-tree-algorithm.html)
