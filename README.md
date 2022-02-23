# CS110 Gradebook Mods

These are a collection of user scripts written for the CS110/CS107 gradebook
tooling, which improve the grading experience. Hopefully at some point they'll
be incorporated into the tooling itself.

## [Popover](cs110_popover.user.js)

Provides a small floating button that can be used to bring the criteria into a
fixed floating window (avoids needing to scroll up/down to update the criteria
or overall comment)

## [Autocompleter](autocompleter.user.js)

Provides a `localStorage`-backed autocomplete for assignments, doing fuzzy-matching
on all the comments you've written so far and allowing you to insert them quickly
and easily.

Autocompleter depends on [farzher/fuzzysort](https://github.com/farzher/fuzzysort)

## [CS110.md](cs110_markdown.user.js)

Automatically renders markdown within gradebook comments

CS110.md depends on [cure53/DOMPurify](https://github.com/cure53/DOMPurify) and [markedjs/marked](https://github.com/markedjs/marked)
