var progress    = require('browser-workshopper-progress')
  , sidebar     = require('browser-workshopper-sidebar')
  , highlight   = require('highlight.js').highlight
  , apprise     = require('apprise')
  , remove      = require('remove-element')
  , fonts       = require('google-fonts')
  , slice       = require('sliced')
  , marked      = require('marked')
  , xhr         = require('xhr')

var fs          = require('fs')

var html = fs.readFileSync(__dirname + '/index.html', 'utf8')

var renderer = new marked.Renderer();
var anchorRender = {
    options:{
      sanitize: true
    }
  , render: marked.Renderer.prototype.link
};
// open links in new window
renderer.link = function(href, title, text){
  var anchor = anchorRender.render(href, title, text);
  return anchor.replace('<a', '<a target="_blank"');
}
marked.setOptions({
    renderer: renderer
  , highlight: function(code, lang) {
      if (!lang) return code

      code = highlight(lang, code).value
      return code
    }
})

module.exports = function(ex) {
  setupPage()
  setupNotifications()
  setupButtons()
  setupSliders()

  fonts.add({
    'Source Code Pro': [200, 600]
  })

  var side = sidebar()

  if (ex.title) {
    document.title = ex.title
  }

  if (ex.description) {
    side.content.innerHTML = marked(ex.description)
    openHook(side.content)
  }

  if (ex.success) {
    var success = document.querySelector('.success-msg')
    success.innerHTML = marked(ex.success)
  } else {
    remove(document.querySelector('.success-container'))
  }

  // var hamburger = side.el.querySelector('.bw-sidebar-hide')

  // hamburger.classList.add('flashing')
  // hamburger.addEventListener('click', function() {
  //   hamburger.classList.remove('flashing')
  // }, false)

  function init() {
    var timeoutTID, testingTID;
    side.on('test', function() {
      if (!ex.test) {
        return console.warn('No test function specified for this lesson yet...')
      }
      clearTimeout(timeoutTID)
      side.reset()
      ex.test(function(err, result) {
        clearTimeout(timeoutTID)
        clearTimeout(testingTID)
        if (result) {
          progress.setProgress(ex.dirname, true)
          side.pass('passed!')
          timeoutTID = setTimeout(function () {
            document.body.classList.add('success')
            // homeBtn.classList.add('flashing')
            side.enabled = false
          }, 1000)
        } else {
          side.fail('try again?')
        }
        if (err) throw (err.message ? err : new Error(err))
      })
      testingTID = setTimeout(function () {
        side.status = 'testing...'
      }, 100)
      if (ex.testTimeout !== false) {
        timeoutTID = setTimeout(function () {
          side.fail('timeout :(')
        }, ex.testTimeout || 5000)
      }
    })
  }

  if (ex.setup) {
    ex.setup(init)
  } else {
    init();
  }
}

function setupNotifications() {
  var notify = apprise({
    top: false,
    right: false
  }).on('enter', function(node) {
    node.classList.add('notification')
  }).on('exit', function(node) {
    previous = null
    node.classList.add('closing')
    setTimeout(function() {
      remove(node)
    }, 1000)
  })

  var previous = null
  window.onerror = function(message, source, line, ch, err) {
    if (err.message === previous) return
    var error = notify(10000)
    error.innerHTML = previous = String(err.message)
    setTimeout(function() {
      error.classList.add('opening')
    }, 1)
  }
}

// For opening directory links cleanly without requiring a temporary
// window: override the click event to send an XHR request to the page
// instead. Will still be fine if opened through other means, but slightly
// cleaner.
function openHook(content) {
  var links = slice(content.querySelectorAll('a[href^="/open/"]'))

  links.forEach(function(link) {
    return link.addEventListener('click', function(e) {
      var href = link.getAttribute('href')
      xhr(href, function(err) {
        if (err) throw err
      })

      e.preventDefault()
      e.stopPropagation()
      return false
    }, false)
  })
}

// homeBtn/openBtn Buttons
function setupButtons() {
  var toggleButtons = document.querySelector('.toggle-buttons')
  function togglePane(name, disabled) {
    document.body.classList.toggle(name + '-disabled', disabled)
  }
  toggleButtons.addEventListener('click', function(event) {
    var btn = event.target
    if (btn.classList.contains('toggle')) {
      btn.classList.toggle('disabled')
      togglePane(btn.dataset.toggle, btn.classList.contains('disabled'))
    }
  }, false)
}

function hasClass(el, c) {
  return el.classList.contains(c)
}

function contains(el, child) {
  do {
    if (child === el) return true
  } while ((child = child.parentNode))
  return false
}

function setupPage() {
  var container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)
  var successEl = container.querySelector('.success-msg')
  container.addEventListener('click', function (ev) {
    if (contains(successEl, ev.target)) {
      return
    }
    document.body.classList.remove('success')
  })
}

// homeBtn/openBtn Buttons
function setupSliders() {
  var sliderColumn = document.querySelector('.slider-column')
    , sliderRow = document.querySelector('.slider-row')
    , sidebar = document.querySelector('.sidebar')
    , display = document.querySelector('.display')

  sliderColumn.addEventListener('mousedown', startColumnSliding, false)
  sliderRow.addEventListener('mousedown', startRowSliding, false)

  sliderColumn.addEventListener('dblclick', resetColumn, false)
  sliderRow.addEventListener('dblclick', resetRow, false)

  var minRow = display.offsetTop + 80
    , minCol = 80

  var colPos = progress.get('column-position')
    , rowPos = progress.get('row-position')

  function slideColumnTo(x) {
    if (!x) return
    var max = window.innerWidth - 80
    x = Math.min(max, Math.max(minCol, x))
    sidebar.style.maxWidth = (x - 2) + 'px'
    sidebar.style.minWidth = (x - 2) + 'px'
    colPos = x
    progress.set('column-position', x)
  }
  function slideRowTo(y) {
    if (!y) return
    var max = window.innerHeight - display.offsetTop - 80
    y = Math.min(max, Math.max(minRow, y))
    display.style.maxHeight = (y - 2) + 'px'
    display.style.minHeight = (y - 2) + 'px'
    rowPos = y
    progress.set('row-position', y)
  }

  function resetColumn() {
    sidebar.style.maxWidth = ''
    sidebar.style.minWidth = ''
    progress.set('column-position', null)
  }

  function resetRow() {
    display.style.maxHeight = ''
    display.style.minHeight = ''
    progress.set('row-position', null)
  }

  slideColumnTo(colPos)
  slideRowTo(rowPos)

  window.addEventListener('resize', function () {
    slideRowTo(rowPos)
    slideColumnTo(colPos)
  })

  function startColumnSliding() {
    function move(event) {
      slideColumnTo(event.clientX)
      event.preventDefault()
    }
    function up(event) {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move, false)
    document.addEventListener('mouseup', up, false)
  }

  function startRowSliding() {
    function move(event) {
      slideRowTo(event.clientY - display.offsetTop)
      event.preventDefault()
    }
    function up(event) {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move, false)
    document.addEventListener('mouseup', up, false)
  }
}
