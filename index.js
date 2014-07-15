var progress    = require('browser-workshopper-progress')
var sidebar     = require('browser-workshopper-sidebar')

var highlight   = require('highlight.js').highlight
var remove      = require('remove-element')
var fonts       = require('google-fonts')
var slice       = require('sliced')
var marked      = require('marked')
var xhr         = require('xhr')
var fs          = require('fs')

var markedOpts = {
  highlight: function(code, lang) {
    if (!lang) return code

    code = highlight(lang, code).value
    return code
  }
}

var buttons = document.body.appendChild(document.createElement('ul'))
  , homeBtn = buttons.appendChild(document.createElement('li'))
  , openBtn = buttons.appendChild(document.createElement('li'))

module.exports = function(opts) {
  opts = opts || {}

  setupNotifications()
  setupButtons()

  fonts.add({
    'Source Code Pro': [200, 600]
  })

  var side = sidebar()

  if (opts.description) {
    side.content.innerHTML = marked(opts.description, markedOpts)
    openHook(side.content)
  }

  var hamburger = side.el.querySelector('.browser-workshopper-hide')

  hamburger.classList.add('flashing')
  hamburger.addEventListener('click', function() {
    hamburger.classList.remove('flashing')
  }, false)

  side.on('test', function() {
    if (!opts.test) {
      return console.warn('No test function specified for this lesson yet...')
    }

    opts.test(function(err, result) {
      if (err) throw err

      if (result) {
        progress.set(opts.dirname, true)
        side.status = 'passed!'
        side.statusColor = '#57FF8A'
        homeBtn.classList.add('flashing')
      } else {
        side.status = 'try again?'
        side.statusColor = '#FF6E57'
      }
    })
  })
}

function setupNotifications() {
  var notify = require('apprise')({
    top: false,
    right: true
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
  buttons.classList.add('buttons')
  homeBtn.classList.add('button-home')
  openBtn.classList.add('button-open')

  homeBtn.setAttribute('title', 'Return to menu')
  homeBtn.addEventListener('click', function(e) {
    window.location = '/'
  }, false)

  openBtn.setAttribute('title', 'open exercise solution directory')
  openBtn.addEventListener('click', function(e) {
    var src = '/open' + window.location.pathname

    xhr(src, function(err) {
      if (err) throw err
    })
  }, false)
}
