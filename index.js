var progress    = require('browser-workshopper-progress')
var sidebar     = require('browser-workshopper-sidebar')

var highlight   = require('highlight.js').highlight
var remove      = require('remove-element')
var fonts       = require('google-fonts')
var slice       = require('sliced')
var marked      = require('marked')
var xhr         = require('xhr')

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

var buttons = document.body.appendChild(document.createElement('ul'))
  , homeBtn = buttons.appendChild(document.createElement('li'))
  , openBtn = buttons.appendChild(document.createElement('li'))

module.exports = function(ex) {
  setupNotifications()
  setupButtons()

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
    var success = document.body.appendChild(document.createElement('div'))
    success.classList.add('success-msg')
    success.innerHTML = marked(ex.success)
  }

  var hamburger = side.el.querySelector('.bw-sidebar-hide')

  hamburger.classList.add('flashing')
  hamburger.addEventListener('click', function() {
    hamburger.classList.remove('flashing')
  }, false)

  function init() {
    side.on('test', function() {
      if (!ex.test) {
        return console.warn('No test function specified for this lesson yet...')
      }

      ex.test(function(err, result) {
        if (result) {
          progress.set(ex.dirname, true)
          side.pass('passed!')
          document.body.classList.add('success')
          homeBtn.classList.add('flashing')
        } else {
          side.fail('try again?')
        }
        if (err) throw err
      })
    })
  }

  if (ex.setup) {
    ex.setup(init)
  } else {
    init();
  }
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
