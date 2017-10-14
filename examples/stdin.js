// example node application that uses keyboard events to control a menu
// arrow keys are used to control the menu
//   up and down arrows move the menu item selection up and down through the active menu
//   left and right arrows move back to a parent menu or activate the currently selected menu item
//   the q key is used to exit the example
// the menu is displayed in the console.

// load the menu
var path = require('path');
var menu = require('../index.js')(
  path.resolve(__dirname, 'menu.json'),
  {
    displayLines: 5,
    moreUpLabel: "  ^^^",
    moreDownLabel: "  vvv"
  }
);

// add listeners to menu
menu
.on('menu_changed', function () {
  // show a fresh menu any time the menu changes
  showMenu();
})
.on('text', function (txt) {
  console.log('EVENT text: ', txt);
})
.on('show_date', function (error, stdout, stderr) {
  console.log('EVENT show_date: ');
  console.log('stdout: ', stdout);
  console.log('stderr: ', stderr);
  console.log('error: ', error);
})
.on('shutdown', function () {
  console.log('EVENT: shutdown');
  process.exit();
})
.on('exit', function () {
  console.log('EVENT: exit');
  process.exit();
})
.on('selected', function (error, stdout, stderr) {
  console.log(stdout);
});

// setup keyboard keypress listener
const readline = require('readline');
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

// process key prosses to control menu
process.stdin.on('keypress', (str, key) => {
  switch (key.name) {
    case 'up': // arrow up
    menu.menuUp();
    break;

    case 'down': // arrow down
    menu.menuDown();
    break;

    case 'left': // arrow left
    menu.menuBack();
    break;

    case 'right': // arrow right
    menu.activateSelect();
    break;

    case 'q':
    process.exit();
    break;
  }
});


// print out the active menu branch with the selected menu item marked
function showMenu() {
  var p = menu.getParentSelect();
  console.log('\r\n\r\n--- Menu' + (p ? ' (' + p.label + ')' : '') + ' ---');
  menu.getActiveMenu().forEach(function (m) {
    // show menu item, add an asterisk is the item is currently selected
    console.log(m.label, m.selected ? '*' : '');
  });
  console.log('------------');
}

// a little help message
console.log('\r\n\r\nq to exit');
console.log('Arrow keys to move through menu.');
// show the menu the first time
showMenu();
