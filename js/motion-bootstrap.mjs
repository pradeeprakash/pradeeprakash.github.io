// Pinned Motion ESM bootstrap. Imported by index.html as a module so the
// inline-script loophole in CSP can stay closed (`script-src` no longer needs
// 'unsafe-inline'). Exposes window.Motion for the IIFE scripts that follow.
import * as Motion from 'https://cdn.jsdelivr.net/npm/motion@11.13.5/+esm';
window.Motion = Motion;
