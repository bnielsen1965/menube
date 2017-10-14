Menu Backend
================================

## Application
The menube module is a backend tool used to create and manage an
application menu. Menu structure and actions are defined in JSON files
which are loaded when a menube instance is created.

Methods are provided for the application user interface to list available
menu items with their defined labels and controls to enable menu traversal
and taking action on menu items.

Results from menu item actions are communicated through events where defined
in the menu JSON files.


## Install
Use npm to install the package from the npm repository or directly from the
git repository.

`npm install menube --save`


## Menu Instance
A menu object is created by calling menube with the path to the JSON file containing
the menu definition and optional settings.

> require('menube')(Path String, [Settings Object])

I.E. To create a menube menu that uses a JSON file in the current path named menu.json
and the display where the menu is used is limited to 5 display lines, the menube
object would be instantiated using the following method...

```javascript
var menu = require('menube')('./menu.json'), {
  displayLines: 5,
  moreUpLabel: "  ^^^",
  moreDownLabel: "  vvv"
});
```

The menu object can then be used in the application where user input directs calls
to the menuUp(), menuDown(), menuBack(), and activateSelect() methods while listening
for menu events that indicate when the application should call getActiveMenu() and
display the menu labels to the user.


### Menu Instance Options
The optional second argument passed to the menube constructor is an object with
settings to be used in the menu instance.


#### displayLines
The displayLines settings is used to tell menube the maximum number of lines that
are available in the display where the menu will be used. When the getActiveMenu()
method is called to retrieve the menu to be displayed it will be trimmed to fit
within the displayLines limit.


#### moreUpLabel
If the getActiveMenu() method has trimmed the menu to fit within the displayLines
and there are more menu options above the top display line then the top line in
the active menu will be a label that indicates there are more menu options above.
The text of the label can be customized by setting the moreUpLabel to a string
to be used as the label.


#### moreDownLabel
When the getActiveMenu() method trims the menu to fit in the displayLines limit and
there are more menu items below the bottom of the display then the last line in the
menu will be a label to indicate there are more menu items below. Setting the
moreDownLabel option to a string will set a custom label to be displayed in place
of the default label.



## Menu Construction
Menus are defined in JSON files where each file contains an array of menu items.
Each menu item includes a label to be used by the menu display mechanism while
the rest of the menu item defines the function of the menu item.

The follow is a simple example that emits events based on the selected menu
item. An event listener attached to the menu instance would need to act on
each event.
```JSON
[
  {
    "label": "Say Hi",
    "emit": {
      "name": "text",
      "arguments": ["Hello World"]
    }
  },
  {
    "label": "Say Bye",
    "emit": {
      "name": "text",
      "arguments": ["Good Bye"]
    }
  },
  {
    "label": "Exit",
    "emit": "exit"
  }
]
```


## Menu Item Types

### menu
A menu type menu item is used to define a sub menu. The menu property must be an
array of menu items that make up the sub menu.

In the following example the menu item with the label "System" has a property
named "menu" with an array of menu items. This property specifies that the
System menu opens a sub-menu when selected. The sub-menu is defined by the array
of menu items defined in the menu property.
```json
{
  "label": "System",
  "menu": [
    {
      "label": "Test",
      "emit": {
        "name": "text",
        "arguments": ["Text test."]
      }
    },
    {
      "label": "Date",
      "command": "date"
    }
  ]
}
```


### menuFile
The "menuFile" is another type of sub-menu but in this case the value of the
property is a file path where the sub-menu is defined.

In this example the "Level2" menu item will open a sub-menu that is defined in
the json file level2.json.
```json
{
  "label": "Level2",
  "menuFile": "./level2.json"
}
```


### command
The "command" menu item type is used to execute a shell command. If the menu item
definition includes an "emit" property with the name of the event to be emitted
then an event will be emitted with the error, stdout, and stderr values resulting
from the shell command.

NOTE: Shell commands that are bash scripts must be executable. Use chmod a+x on
a shell script to make it executable.

The following example is a menu item "Date" that when selected will execute the
date command with the results delivered through an event named "show_date".
```json
{
  "label": "Date",
  "command": "date",
  "emit": "show_date"
}
```
The code used to listen for the "show_date" event in the previous example may
look something like the following...
```javascript
menu.on('show_date', function (error, stdout, stderr) {
  console.log('stdout: ', stdout);
  console.log('stderr: ', stderr);
  console.log('error: ', error);
});
```


### emit
Emit an event. This menu item will emit an event when selected. The emit may be
defined as a string with the event name or as an object with the event name and
an array of arguments for a more complex event.

A simple event with no arguments may look like the following...
```json
{
  "label": "Shutdown",
  "emit": "shutdown"
}
```
The following example menu item will show up as *Test* on the menu and when
selected will emit an event named *text*. The event will include the string
*"Text test."* as the first argument passed with the event.
```json
{
  "label": "Test",
  "emit": {
    "name": "text",
    "arguments": ["Text test."]
  }
}
```
A listener for the previous example may look something like the following...
```javascript
menu.on('text', function (txt) {
  console.log('TEXT: ', txt);
});
```


### options
Create a dynamic list of items from which the user can select. The items are
generated from a provided shell command and the selected item will be submitted
to a provided select script. The results of the select script can then be emitted in the
same way a command item emits results.

NOTE: Shell commands that are bash scripts must be executable. Use chmod a+x on
a shell script to make it executable.

The following example is an access point selection menu item. The getaps.sh script
returns a list of access point names in
```json
{
  "label": "Select AP",
  "options": "./scripts/getaps.sh",
  "selectScript": "./scripts/selectap.sh",
  "selectEmit": "showoutput"
}
```
Assuming a menu was created with the previous menu item, a listener that displays
the output from the selectap.sh script may look like the following...
```javascript
menu.on('showoutput', function (message) {
  console.log('Select AP Message: ', message);
});
```


## Methods
The menube module provides methods to request current menu states and control
menu interaction.

### getActiveMenu()
The currently active menu branch is returned by the getActiveMenu() method. The
branch is an array of menu items and can be used to display menu item labels in
the user interface.

If the optional displayLines setting was used when creating the menube instance
then the getActiveMenu() method will return a trimmed menu if the branch is too
long to fit within the specified number of display lines.


### getActiveBranch()
If the displayLines setting is used but the application needs the non-trimmed
menu branch then the getActiveBranch() method can be used to retrieve the complete
menu branch that is currently active.


### getCurrentSelect()
An active menu branch will always have one selected menu item. The currently
selected menu item in the active branch is returned by the getCurrentSelect()
method.


### menuDown()
The application user interface calls the menuDown() method when a user selects
the next menu item. This will update the currently selected menu item in the
active menu branch.

Returns true if menu changed, false if no change because menu selection is already
at the bottom of a branch.


### menuUp()
The application user interface calls the menuUp() method to move the menu
selection to the previous item in the active menu branch.

Returns true if menu changed, false if no change because menu selection is already
at the top of a branch.


### menuBack()
When in a sub-menu the menuBack() method will take menube back one menu branch
and will change the current item selection to the item which led to the sub-menu.

Returns true if menu changed, false if no change because menu selection is already
at the menu root.


### activateSelect()
Maybe need a better name for this method.


## Events

In addition to any events that may be emitted by an activated menu selection as
defined in the menu definition, the menu itself has some events that it will
emit as the menu changes.


### 'menu_changed'

Any action that results in a change to the menu, i.e. selecting a new menu branch
or change the current menu item selection, will result in a 'menu_changed' event.


### 'menu_command'

If an activated menu item executes a command then a 'menu_command' event will be
emitted along with any events that are created by the command.


### 'menu_emit'

Activated menu items that are defined as event emitters will also result in the
'menu_emit' event.
