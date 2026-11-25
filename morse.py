"""Morse_Coder: translate between plain text and International Morse Code.

Conventions:
    - Letters are separated by a single space.
    - Words are separated by " / ".

Run `python morse.py --help` for command-line usage.
"""

from __future__ import annotations

import argparse
import re
import sys

TEXT_TO_MORSE: dict[str, str] = {
    # Letters
    "A": ".-", "B": "-...", "C": "-.-.", "D": "-..", "E": ".",
    "F": "..-.", "G": "--.", "H": "....", "I": "..", "J": ".---",
    "K": "-.-", "L": ".-..", "M": "--", "N": "-.", "O": "---",
    "P": ".--.", "Q": "--.-", "R": ".-.", "S": "...", "T": "-",
    "U": "..-", "V": "...-", "W": ".--", "X": "-..-", "Y": "-.--",
    "Z": "--..",
    # Numbers
    "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
    "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
    # Punctuation
    ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.",
    "!": "-.-.--", "/": "-..-.", "(": "-.--.", ")": "-.--.-",
    "&": ".-...", ":": "---...", ";": "-.-.-.", "=": "-...-",
    "+": ".-.-.", "-": "-....-", '"': ".-..-.", "@": ".--.-.",
}

MORSE_TO_TEXT: dict[str, str] = {code: char for char, code in TEXT_TO_MORSE.items()}

UNKNOWN = "?"  # Placeholder shown in place of characters that can't be translated
_MORSE_CHARS = set(".-/ \t\r\n")


class TranslationError(ValueError):
    """Raised in strict mode when input contains characters that can't be translated."""

    def __init__(self, message: str, unknown: list[str]):
        super().__init__(message)
        self.unknown = unknown


def text_to_morse(text: str, strict: bool = False) -> str:
    """Encode plain text as Morse code.

    Unknown characters become `UNKNOWN` (or raise TranslationError if strict).
    """
    words = text.upper().split()
    encoded_words: list[str] = []
    unknown: list[str] = []
    for word in words:
        codes = []
        for char in word:
            code = TEXT_TO_MORSE.get(char)
            if code is None:
                unknown.append(char)
                code = UNKNOWN
            codes.append(code)
        encoded_words.append(" ".join(codes))
    if strict and unknown:
        raise TranslationError(_unknown_message("character", unknown), unknown)
    return " / ".join(encoded_words)


def morse_to_text(morse: str, strict: bool = False) -> str:
    """Decode Morse code into plain text.

    Letters are split on whitespace and words on "/". Unknown code groups
    become `UNKNOWN` (or raise TranslationError if strict).
    """
    decoded_words: list[str] = []
    unknown: list[str] = []
    for word in morse.strip().split("/"):
        letters = word.split()
        if not letters:
            continue
        chars = []
        for code in letters:
            char = MORSE_TO_TEXT.get(code)
            if char is None:
                unknown.append(code)
                char = UNKNOWN
            chars.append(char)
        decoded_words.append("".join(chars))
    if strict and unknown:
        raise TranslationError(_unknown_message("Morse sequence", unknown), unknown)
    return " ".join(decoded_words)


def looks_like_morse(text: str) -> bool:
    """Return True if the input is made only of dots, dashes, slashes and spaces."""
    stripped = text.strip()
    return bool(stripped) and bool(re.search(r"[.-]", stripped)) and set(stripped) <= _MORSE_CHARS


def translate(text: str, strict: bool = False) -> str:
    """Auto-detect the direction and translate."""
    if looks_like_morse(text):
        return morse_to_text(text, strict=strict)
    return text_to_morse(text, strict=strict)


def _unknown_message(kind: str, unknown: list[str]) -> str:
    unique = list(dict.fromkeys(unknown))
    listed = ", ".join(repr(u) for u in unique)
    return f"Unknown {kind}{'s' if len(unique) > 1 else ''}: {listed}"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="morse.py",
        description="Translate between plain text and Morse code.",
    )
    direction = parser.add_mutually_exclusive_group()
    direction.add_argument("-e", "--encode", action="store_true", help="text -> Morse")
    direction.add_argument("-d", "--decode", action="store_true", help="Morse -> text")
    parser.add_argument(
        "--strict", action="store_true",
        help="fail on untranslatable input instead of printing '?'",
    )
    parser.add_argument(
        "message", nargs="*",
        help="message to translate (reads standard input if omitted)",
    )
    args = parser.parse_args(_separate_flags(sys.argv[1:] if argv is None else argv))

    if args.message:
        inputs = [" ".join(args.message)]
    elif sys.stdin.isatty():
        return _interactive(args)
    else:
        inputs = sys.stdin.read().splitlines()

    try:
        for line in inputs:
            print(_run(line, args))
    except TranslationError as err:
        print(f"error: {err}", file=sys.stderr)
        return 1
    return 0


_FLAGS = {"-e", "--encode", "-d", "--decode", "--strict", "-h", "--help"}


def _separate_flags(argv: list[str]) -> list[str]:
    """Move everything that isn't a known flag after "--".

    Morse code like `-.-` or `---` starts with a dash, so argparse would
    otherwise mistake it for an option.
    """
    flags = [a for a in argv if a in _FLAGS]
    message = [a for a in argv if a not in _FLAGS and a != "--"]
    return flags + ["--"] + message


def _run(line: str, args: argparse.Namespace) -> str:
    if args.encode:
        return text_to_morse(line, strict=args.strict)
    if args.decode:
        return morse_to_text(line, strict=args.strict)
    return translate(line, strict=args.strict)


def _interactive(args: argparse.Namespace) -> int:
    print("Morse_Coder - type text or Morse code. Press Enter on an empty line to quit.")
    while True:
        try:
            line = input("> ")
        except (EOFError, KeyboardInterrupt):
            print()
            return 0
        if not line.strip():
            return 0
        try:
            print(_run(line, args))
        except TranslationError as err:
            print(f"error: {err}")


if __name__ == "__main__":
    sys.exit(main())
