// menube function to create a menu using the file specified in menuFile
module.exports = function (menuFile, settings) {
  settings = settings || {};
  var path = require('path');
  var events = require('events');
  var emitter = new events.EventEmitter();
  var menu = null; // the loaded menu
  var activeMenu = menu; // reference to active menu branch
  var currentSelect = [0]; // index of currently selected menu items
  var topLine = 0; // the top most line of the menu to display

  // Notes on currentSelect:
  // The currentSelect array keeps track of both the currently selected menu item
  // and the branch. The integer is the selected item and the depth of the array
  // is the point out on a branch.
  // I.E. The first element in currentSelect is an integer of the selected item
  // in the root branch. Assuming the selected item is a submenu then activating
  // this item will push a new integer onto the currentSelect array with the new
  // integer being the item selected within the submenu.

  // load the menu json file with recursive calls if needed
  function loadMenu(menuFile) {
    // load the menu file json
    var menu = require(menuFile[0] === path.sep ? menuFile : process.cwd() + path.sep + menuFile);

    // function to recursively check menu branches for further menu files to load
    var loadMenuFiles = function (menu, i) {
      if (i >= menu.length) {
        // finished loading this menu file
        return;
      }
      if (menu[i].menuFile) {
        // this menu item is defined by another menu file
        menu[i].menu = loadMenu(menu[i].menuFile);
      }
      // next menu item
      loadMenuFiles(menu, i + 1);
    };

    if (Array.isArray(menu)) {
      // load any menuFile items in this menu item array
      loadMenuFiles(menu, 0);
    }

    return menu;
  }


  // activate the selected menu item
  function activateSelect() {
    var s = getCurrentSelect();

    // submenu
    if (s.menu && s.menu.length) {
      console.log('IS MENU: ', s.menu)
      // submenu selected
      currentSelect.push(0);
      emitter.emit('menu_changed');
    }

    // execute command
    else if (s.command) {
      // shell command selected
      require('child_process').exec(s.command, function (err, stdout, stderr) {
        if (s.emit) {
          emitter.emit(s.emit, err, stdout, stderr);
        }
        emitter.emit('menu_command');
      });
    }

    // emit event
    else if (s.emit) {
      // emit event selected
      var args = [];
      if (typeof s.emit === "string") {
        // simple event
        args.push(s.emit);
      }
      else {
        // complex event
        args.push(s.emit.name);
        if (s.emit.arguments) {
          args = args.concat(s.emit.arguments);
        }
      }
      emitter.emit.apply(emitter, args);
      emitter.emit('menu_emit');
    }

    // dynamic options menu item from script
    else if (s.options) {
      // shell command to get options
      require('child_process').exec(s.options, function (err, stdout, stderr) {
        var options = stdout.split("\n");
        var optionsMenu = [];
        options.forEach(function (option) {
          if (option.length) {
            optionsMenu.push({ label: option, optionsItem: true });
          }
        })
        // splice in the options at our options item
        var am = getActiveBranch();
        am.splice(currentSelect[currentSelect.length - 1], 0, {
          label: s.label,
          selectScript: s.selectScript,
          emit: s.selectEmit,
          menu: optionsMenu,
          optionsMenu: true
        });
        activateSelect();
      });
    }

    // options item selected
    else if (s.optionsItem) {
      var cs = getCurrentSelect();
      var ps = getParentSelect();
      _menuBack();
      require('child_process').exec(ps.selectScript + ' ' + cs.label, function (err, stdout, stderr) {
        if (ps.emit) {
          emitter.emit(ps.emit, err, stdout, stderr);
        }
        emitter.emit('menu_command');
      });
    }
  }


  // move menu selection back from sub-menu
  function menuBack() {
    if (currentSelect.length > 1) {
      _menuBack();
      emitter.emit('menu_changed');
      return true;
    }
    return false;
  }


  function _menuBack() {
    var ps = getParentSelect();
    currentSelect.pop();
    if (ps.optionsMenu) {
      // clean up dynamic options menu
      var am = getActiveBranch();
      am.splice(currentSelect[currentSelect.length -1], 1);
    }
  }


  // move menu selection up through menu
  function menuUp() {
    var i = currentSelect[currentSelect.length - 1] - 1;
    if (i < 0) {
      i = 0;
      return false;
    }
    currentSelect[currentSelect.length - 1] = i;
    emitter.emit('menu_changed');
    return true;
  }


  // move menu selection down through menu
  function menuDown() {
    var i = currentSelect[currentSelect.length - 1] + 1;
    if (i >= getActiveBranch().length) {
      i -= 1;
      return false;
    }
    currentSelect[currentSelect.length - 1] = i;
    emitter.emit('menu_changed');
    return true;
  }


  // get the active menu branch
  function getActiveBranch() {
    return currentSelect.reduce(function (cur, val, ci) {
      // before the last select item return the indexed menu branch, if at the end then return the final menu
      return (ci + 1 < currentSelect.length ? cur.menu[val] : cur.menu);
    }, {menu: menu});
  }


  // get active menu, trimmed if necessary
  function getActiveMenu() {
    var selected = currentSelect[currentSelect.length - 1];
    var activeMenu = getActiveBranch();
    activeMenu = JSON.parse(JSON.stringify(activeMenu));
    activeMenu.map(function (item, index) {
      if (index === selected) {
        item.selected = true;
      }
      return item;
    });
    if (!settings.displayLines || activeMenu.length <= settings.displayLines) {
      return activeMenu;
    }
    else {
      return trimMenu(activeMenu, selected, settings.displayLines);
    }
  }


  // trim menu to fit display
  function trimMenu(targetMenu, selected, menuLength) {
    // top trim at selection only if selected is past second item
    var menuStart = selected > 1 ? selected : 0;
    // prevent top trim from under displaying menu
    menuStart = menuStart + menuLength - 1 <= targetMenu.length ? menuStart : targetMenu.length - menuLength + 1;
    var finalMenu = (menuStart > 1 ? [{ label: (settings.moreUpLabel ? settings.moreUpLabel : "..."), menuMore: true }] : []);
    finalMenu = finalMenu.concat(targetMenu.slice(menuStart, menuStart + menuLength - finalMenu.length));
    if (finalMenu.length + menuStart <= targetMenu.length) {
      finalMenu[finalMenu.length - 1] = { label: (settings.moreDownLabel ? settings.moreDownLabel : "..."), menuMore: true };
    }
    return finalMenu;
  }


  // get the parent selected menu item
  function getParentSelect() {
    if (currentSelect.length === 1) {
      // at root, no parent
      return null;
    }
    return currentSelect.reduce(function (cur, val, ci) {
      return (
        ci + 2 < currentSelect.length ?
        cur.menu[val] : (
          ci + 2 === currentSelect.length ?
          cur.menu :
          cur[currentSelect[currentSelect.length - 2]]
        )
      );
    }, {menu: menu});
  }


  // get the currently selected menu item
  function getCurrentSelect() {
    return getActiveBranch()[currentSelect[currentSelect.length - 1]];
  }


  // export functions
  emitter.menuUp = menuUp;
  emitter.menuDown = menuDown;
  emitter.activateSelect = activateSelect;
  emitter.menuBack = menuBack;
  emitter.getCurrentSelect = getCurrentSelect;
  emitter.getParentSelect = getParentSelect;
  emitter.getActiveMenu = getActiveMenu;
  emitter.getActiveBranch = getActiveBranch;

  // load menu in this instance
  menu = loadMenu(menuFile);
  return emitter;
};
