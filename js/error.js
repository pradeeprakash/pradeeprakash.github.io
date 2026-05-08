(function () {
  'use strict';
  var path = window.location.pathname || '/';
  if (path.length > 64) path = path.slice(0, 61) + '...';
  var nodes = document.querySelectorAll('[data-error-path]');
  for (var i = 0; i < nodes.length; i++) nodes[i].textContent = path;
}());
