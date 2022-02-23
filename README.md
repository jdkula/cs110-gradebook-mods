# CS110 Gradebook Mods

These are a collection of user scripts written for the CS110/CS107 gradebook
tooling, which improve the grading experience. Hopefully at some point they'll
be incorporated into the tooling itself.

## [Popover](cs110_popover.user.js)

Provides a small floating button that can be used to bring the criteria into a
fixed floating window (avoids needing to scroll up/down to update the criteria
or overall comment)

**Usage**: You can use Alt+` as a keyboard shortcut to toggle it.

## [Hoverloader](cs110_hoverloader.user.js)

No more "Saving..." text at the top of the screen; instead, there'll be a nice
subtle indicator in the top-right anywhere while you're scrolling through.

## [Autocompleter](autocompleter.user.js)

Provides a `localStorage`-backed autocomplete for assignments, doing fuzzy-matching
on all the comments you've written so far and allowing you to insert them quickly
and easily.

**Usage**: Automatically saves content when text-boxes go away. Start typing to search, then use up/down arrow keys (or mouse) to select, and press enter (or click) to autocomplete. If you want to remove a suggestion, you can highlight it and press Delete (Fn+Delete on Mac) to remove it.

Autocompleter depends on [farzher/fuzzysort](https://github.com/farzher/fuzzysort)

## [CS110.md](cs110_markdown.user.js)

Automatically renders markdown within gradebook comments

CS110.md depends on [cure53/DOMPurify](https://github.com/cure53/DOMPurify) and [markedjs/marked](https://github.com/markedjs/marked)
