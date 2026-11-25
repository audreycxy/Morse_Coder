# Morse_Coder

Morse_Coder is an app that translates between plain text and Morse code.

## Website

The `web/` folder holds a website version. It runs entirely in the browser, with nothing to install. Open `web/index.html` directly, or serve it:

```powershell
python -m http.server 8000 --directory web
```

Then visit http://localhost:8000. The site:

- Translates live as you type, in either direction (auto-detected, or pick one).
- Plays the Morse code as beeps, with a flashing signal lamp and each letter highlighted as it plays. Speed and pitch are adjustable.
- Has a clickable reference chart: click a character to hear it and add it to your message.
- Works on phones and follows your system's light or dark mode.

Shortcuts: <kbd>Ctrl</kbd> + <kbd>Enter</kbd> plays or stops, and <kbd>Esc</kbd> stops.

## Command Line

### Requirements

Python 3.9 or newer. There are no other dependencies.

### Usage

Pass a message and Morse_Coder works out which way to translate it:

```powershell
python morse.py "Hello World"
# .... . .-.. .-.. --- / .-- --- .-. .-.. -..

python morse.py "... --- ... / .... . .-.. .--."
# SOS HELP
```

Run it with no message for interactive mode. Type a line and press Enter to translate it. Press Enter on an empty line to quit.

```powershell
python morse.py
```

You can also pipe text in. Each line is translated on its own:

```powershell
Get-Content message.txt | python morse.py
```

### Options

| Option           | What it does                                                                 |
| ---------------- | ---------------------------------------------------------------------------- |
| `-e`, `--encode` | Always translate text → Morse (e.g. so `...` is read as three periods)        |
| `-d`, `--decode` | Always translate Morse → text                                                 |
| `--strict`       | Exit with an error if anything can't be translated, instead of printing `?`   |
| `-h`, `--help`   | Show help                                                                     |

### Using it from Python

```python
from morse import text_to_morse, morse_to_text

text_to_morse("Hi")     # '.... ..'
morse_to_text(".... ..")  # 'HI'
```

### Running the Tests

```powershell
python -m unittest -v
```

## Features

- **Text → Morse:** Type a message and get its Morse code equivalent.
- **Morse → Text:** Paste Morse code and decode it back into readable text.
- **Case-insensitive input:** `Hello` and `HELLO` translate the same way.
- **Auto-detect:** Input made only of dots, dashes, slashes and spaces is decoded. Anything else is encoded.
- **Clear handling of unknown characters:** Characters with no Morse equivalent show up as `?` instead of being silently dropped. Use `--strict` to make them an error instead.

## Morse Code Format

The app uses International Morse Code with these conventions:

| Element              | Representation         | Example                  |
| -------------------- | ---------------------- | ------------------------ |
| Dot (short signal)   | `.`                    | `E` → `.`                |
| Dash (long signal)   | `-`                    | `T` → `-`                |
| Between letters      | single space ` `       | `HI` → `.... ..`         |
| Between words        | slash ` / `            | `HI MOM` → `.... .. / -- --- --` |

### Example

```
Text:  SOS HELP
Morse: ... --- ... / .... . .-.. .--.
```

## Supported Characters

### Letters

| Char | Code   | Char | Code   | Char | Code   |
| ---- | ------ | ---- | ------ | ---- | ------ |
| A    | `.-`   | J    | `.---` | S    | `...`  |
| B    | `-...` | K    | `-.-`  | T    | `-`    |
| C    | `-.-.` | L    | `.-..` | U    | `..-`  |
| D    | `-..`  | M    | `--`   | V    | `...-` |
| E    | `.`    | N    | `-.`   | W    | `.--`  |
| F    | `..-.` | O    | `---`  | X    | `-..-` |
| G    | `--.`  | P    | `.--.` | Y    | `-.--` |
| H    | `....` | Q    | `--.-` | Z    | `--..` |
| I    | `..`   | R    | `.-.`  |      |        |

### Numbers

| Char | Code    | Char | Code    |
| ---- | ------- | ---- | ------- |
| 0    | `-----` | 5    | `.....` |
| 1    | `.----` | 6    | `-....` |
| 2    | `..---` | 7    | `--...` |
| 3    | `...--` | 8    | `---..` |
| 4    | `....-` | 9    | `----.` |

### Punctuation

| Char | Code      | Char | Code      |
| ---- | --------- | ---- | --------- |
| `.`  | `.-.-.-`  | `!`  | `-.-.--`  |
| `,`  | `--..--`  | `/`  | `-..-.`   |
| `?`  | `..--..`  | `(`  | `-.--.`   |
| `'`  | `.----.`  | `)`  | `-.--.-`  |
| `:`  | `---...`  | `&`  | `.-...`   |
| `;`  | `-.-.-.`  | `=`  | `-...-`   |
| `+`  | `.-.-.`   | `-`  | `-....-`  |
| `"`  | `.-..-.`  | `@`  | `.--.-.`  |

## Possible Future Features

- Decode Morse from audio input (microphone)
- Tap out Morse with a key or button and have it decoded
- Audio playback in the command-line version

## License

No license has been chosen yet.
