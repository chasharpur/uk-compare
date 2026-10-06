## How to prepare samples
To create a new sample folder do the following:

1. create the folder in the topmost samples directory of the uk-compare repository. 
The name should not contain spaces. You can use _ for a space.

2. create a file default.css in the topmost level of that folder, and add to it 
classes intended to format &lt;p&gt; or &lt;span&gt; elements. You can copy formats 
from the default.css files in the harpur or digital_variants folders, for example 
for poetry there are classes for p.stanza and span.line.

3. create some folder hierarchy within the sample folder - it doesn't matter what 
it is, except that each folder hierarchy must end with a folder whose name 
represents the version and within that there must be a number of folders called 
layer-1, layer-2 etc up to layer-final

4. In each layer folder place one layer file called index.html containing the HTML 
text of the layer of the version within which is is situated. A layer file can only 
contain the elements &lt;p&gt; and &lt;span&gt;. A description of what a layer is 
is provided below.

5. Create an index file index.json, also at the top level of your sample directory. The 
format is described below, but you can copy it from the examples in harpur or 
digital_variants.

6. Add the name of your sample directory to the master index.json file in the top 
level of samples. It is just a JSON array of quoted names. It will then appear in 
the sample dropdown of test rig.

## How to add a file to an existing sample directory
Create a folder hierarchy to house your layers. Each version must contain at least 
a folder called layer-final. If there is only one layer put your index.html file in 
there. The name of the version will be the folder that contains the layer-final 
folder.

## How to create a layer file
A layer is a linear text transcription recording all the local temporal states of 
each revision site for some time t. If t is 1 then this is layer-1 and it 
represents the first state of the text before any corrections have been made, for 
example, the text on the baseline. Each subsequent alteration is assigned to a 
higher time t, such as 2, 3 etc up to the last state of the document called 
layer-final. Any unaltered text in the document is assigned to all layers. Any text 
in layer 2, if there are no further alterations to that revision site, is inherited 
by later layers, 

Only the tags &lt;p&gt; and &lt;span&gt; are allowed. Neither may nest. If you need 
a combined format then define that, say underlined and wavy underlining. Give it a 
class name and create that format in default.css for the sample. e.g.

    <span class="wavy+double">Really important stuff!</span>

No &lt;del&gt; or &lt;add&gt; tags are allowed, and all crossed-out text is to be 
un-crossed out in the layer file to which it belongs. Any text present in a lower 
level layer file is assumed by the software to be deleted in a later layer if it is 
not present there. Likewise any text appearing in a layer but not present in the 
previous layer is considered inserted. Any text present in a lower layer but left out of subsequent later and not crossed out is an open variant. In such cases format the open variant is some special way in default.css such as underlining it in some way.

## Revision campaigns
If ink colour indicates layers of revision, assign these to separate versions and 
record any corrections within the revision campaign as layers within that version. 
So a document could in complex cases have many versions hidden within it.

## Currente calamo corrections
When the author abandons the text he/she was writing and there is no continuation 
in the sentence, and the text is crossed out, assign it to layer-1 and add ... 
after it. You may continue the text on the baseline where it resumes. It won't make 
sense but that does not matter.

## default.css
The stylesheet for the sample set follows the rules for CSS, except that you should 
specify which class names belong to &lt;p&gt;-elements and which to 
&lt;span&gt;-elements. Only class names are permitted. There are no IDs or other 
css instructions needed. Formatting of the web page containing the text of the 
edition needs to be stored somewhere else.

## deletions, additions and transpositions
The formats for these are contained in the file diffs.css at the top level of uk-compare.

## test rig formats
The test rig is deliberately ugly so that no one is inspired to copy it. Its 
formatting is contained in the file style.css at the top level of uk-compare.

## index.json
Each sample directory must contain an index.json file, containing an array of 
objects, each representing one layer file and containing the properties: 

1. "layer": the name of the layer such as "layer-1" etc

2. "version": the name of the version which will appear in the menu of test-rig. It 
can be different from the name of the folder containing the layer's version.

3. "work": the name of the work which can be anything. This will appear in the work 
menu of test-rig. Keep the work name consistent for all its versions and layers as 
this is the deduced name used in the works menu.

4. "path": the relative path to the layer's index.html file including all folder 
names from the first folder within the sample directory. You can obtain these paths 
by running the Linux find command, searching for index.html

5. Check the JSON file for syntax errors in a JSON lint checker.

## Converting XML files to layers
You can use the Ecdosis splitter tool to generate separate layer files from a
TEI-XML file containing version markup such as subst, add, del, app, rdg etc. 
This tool will be made available soon on chasharpur.
