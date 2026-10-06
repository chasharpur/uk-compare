
## Rationale
Why write a comparison tool for HTML? Although there is little agreement 
on how texts may be represented on a server, whether in databases, as XML, 
or whatever, there IS agreement on the general format for presenting 
them to the reader, and that is in HTML. The method of 
comparison used here is thus the following:

1. Strip all the tags from the HTML of both versions being compared, 
including the head elements, leaving only plain text behind.

2. Compare the two resulting plain texts. 

3. Restore the removed markup, adding to it the tags used to describe 
the newly-computed deletions, insertions and alignments. 

The result is a side by side display, with deletions marked on the left
in red, transpositions in green, and additions on the right in blue.

The uk-compare tool is written in Javascript with a view to moving the 
most complex part of the Digital Scholarly Edition from the server to 
the client. The server can thus become a read-only dispenser of plain 
information, rather than a complex piece of software needing constant 
maintenance, and also insulate it from denial of server or penetration 
attacks. Contrary to popular belief, servers are not more powerful 
than the client computers, typically laptops, which access them. In 
fact, servers are often deliberately under-provisioned to save costs. 
This creates a weakness that can only be addressed by moving the most 
computationally intensive operations into the user's own browser.

To achieve this, we must re-examine the algorithms used to compute 
differences between texts, to see if a faster and more accurate method 
might produce results in the browser in real time. So far, most 
textual comparison tools use a collation algorithm in which, 
potentially at least, each character position in one version is 
compared to all character positions in the other version. 
Misalignments are common, and the time taken is proportial to N 
squared, where N is the average length of one version. Also this 
method does not normally calculate transpositions. Certain versions of 
these collation algorithms claim faster run times, but none is faster 
than NxD, where D is the edit distance between the versions, and for 
completely dissimilar texts the efficiency is still N squared[2]. 
There has to be a faster way, and that method is to use suffix trees.

## Suffix trees
Esko Ukkonen created a linear time algorithm for building a suffix tree 
in 1995[1]. "Linear time" means that as the length of the texts to be 
compared increases, the time taken is directly proportional to that. So 
comparing two texts four times as long overall takes no more than four 
times longer. This is fast enough to do a comparison even between long 
texts without the user noticing any significant time lag.

So what is a suffix tree and how can it be used to compute the 
similarities or differences between two versions of a work? A suffix 
tree can be thought of as an index into one or two versions. Once the 
common parts of the two versions have been computed they can also be 
used to also identify deletions, and additions. Deletions are simply 
the unaligned parts in the first version and additions are the 
unaligned parts in the second version. By aligning on the longest 
match between the versions and repeating this recursively on the 
remaining unaligned parts, a global alignment not based on a 
left-to-right approach, as in Myers' algorithm, can produce a more 
accurate alignment and also can discover transpositions for the first 
time. 

## Transpositions
Unlike Myers' algorithm, Ukkonen's works equally fast no matter how 
dissimilar two versions are. This is a great feature, but it has a 
dark side. Transpositions, where the left and right parts of an 
alignment are on opposite sides of an already aligned piece of text in 
the middle, are not distinguished from direct alignments. For example, 
in Harpur's poem Eva Gray he writes in the c-version:

    Through Memory’s echoes Passion’s wrong

which he then revises to:

    Through Passion’s wrong Memory’s echoes

Here "Memory's echoes" and "Passion's wrong" swap places, while the text 
in the middle is empty. In most cases, however, something divides the 
two halves of the transposition, as in:

    In the ranks of war

which he revised to:

    In the war-like ranks

Here "war" is transposed around "-like" or "of" depending on which 
version you read.

In real world texts transpositions like this are pretty rare. A manual 
survey of the first 151 poems of Harpur revealed just 47 cases, around 
one per three poems. Typically, the suffix tree will detect dozens of 
small transpositions between the start and end of the text that a human 
would consider invalid. In practice transpositions are mostly 
short-range affairs. Applying the statistics of these real-world 
examples, based on the length of the transposition and the distance 
between the two halves, to the myriad of cases detected by the 
suffix tree, and discarding most of them, results in a much more 
accurate alignment.

## Synchro-scroll
The test rig contains a synchro-scroller module, which vertically aligns 
the left and right versions as the user scrolls in either version. The 
module is separate from the main code and can be re-used elsewhere. 
However, it does require that all aligned segments on the left and right 
are labelled with corresponding IDs: e.g. d123a on the left and a123a on 
the right. The number indicates which run of aligned plain text 
corresponds on each side. d123 would contain exactly the same text as 
a123. Since formatting on each side may differ, each aligned section is 
broken up into sub-sections, hence d123a is followed by d123b etc. The 
segmentation on left and right may not precisely correspond, and so the 
synchro-scrolling may not be smooth or precise. Some improvement here 
may yet be made.

## Recursion
When the same text is repeated multiple times in a document, for 
example, the refrain of a song or poem, the suffix tree only records the 
first such alignment between left and right. Subsequent instances of 
the same text will be flagged as deleted/added. The only way around this 
limitation is to re-apply the suffix tree calculation to all unaligned 
parts of the text. Such repetitions, now isolated from the other 
instances, can be aligned because they are locally unique.

## Myers' algorithm
I have added Myers' algorithm as an alternative to Ukkonen's. It is 
widely considered as the most efficient diff algorithm, although it 
does not compute transpositions. The user can compare the speed of the 
two. For short poems there is not much visible difference but for 
longer works with more variation such as h080, The Creek of the Four 
Graves, it took several seconds to finish, whereas Ukkonen's algorithm 
is about 100 times faster. The time taken to do the comparison is 
printed in the Javascript console, if you turn it on. When comparing 
versions h080f to h080h Myers' algorithm took 4636 milliseconds – 4.6 
seconds to complete the comparison – and Ukkonen's algorithm took only 
34 milliseconds – less than the blink of an eye. 

You can see the time taken in the Javascript console of any browser. 

## The future
I hope to extend this to N versions. If we have N versions then the 
number of two-way comparisons that can be done is N(N-1)/2. So for 30 
versions this is only 435. That is a lot, but once the results of all 
two-way comparisons are known it should be possible to build an accurate 
MVD, or multi-version document, which is just a partial order of text 
fragments belonging to subsets of the total number of versions. Once in 
the MVD format it will be possible to instantly display a table of all 
differences between all versions or between a selection of them.

## Installation
Download the release or clone the repository, then move it inside a web 
server's documents root. Navigate to index.html. There is a 
[demo site](https://uk-compare.ecdosis.org) 
that already implements the most recent version of the code.

[1] Ukkonen, E. (1995). "On-line construction of suffix trees" (PDF). 
Algorithmica. 14 (3): 249–260

[2] Myers, E. (1986). An O(ND) Difference Algorithm and Its Variations," 
Algorithmica Vol. 1 No. 2, 1986, pp. 251-266.

[3] D. Schmidt (2013). [Ukkonen's suffix tree algorithm ](https://programmerspatch.blogspot.com/2013/02/ukkonens-suffix-tree-algorithm.html)
