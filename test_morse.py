import io
import unittest
from contextlib import redirect_stdout, redirect_stderr

import morse


class TextToMorseTests(unittest.TestCase):
    def test_letters_and_words(self):
        self.assertEqual(morse.text_to_morse("SOS HELP"), "... --- ... / .... . .-.. .--.")

    def test_case_insensitive(self):
        self.assertEqual(morse.text_to_morse("Hello"), morse.text_to_morse("HELLO"))

    def test_numbers_and_punctuation(self):
        self.assertEqual(morse.text_to_morse("2 + 2 = 4!"), "..--- / .-.-. / ..--- / -...- / ....- -.-.--")

    def test_extra_whitespace_collapses(self):
        self.assertEqual(morse.text_to_morse("  HI   MOM  "), ".... .. / -- --- --")

    def test_unknown_character_flagged(self):
        self.assertEqual(morse.text_to_morse("HI#"), ".... .. ?")

    def test_unknown_character_strict(self):
        with self.assertRaises(morse.TranslationError) as ctx:
            morse.text_to_morse("A#B~", strict=True)
        self.assertEqual(ctx.exception.unknown, ["#", "~"])

    def test_empty(self):
        self.assertEqual(morse.text_to_morse(""), "")


class MorseToTextTests(unittest.TestCase):
    def test_letters_and_words(self):
        self.assertEqual(morse.morse_to_text("... --- ... / .... . .-.. .--."), "SOS HELP")

    def test_tolerates_spacing_around_slash(self):
        self.assertEqual(morse.morse_to_text(".... ../-- --- --"), "HI MOM")

    def test_unknown_sequence_flagged(self):
        self.assertEqual(morse.morse_to_text(".... ........"), "H?")

    def test_unknown_sequence_strict(self):
        with self.assertRaises(morse.TranslationError):
            morse.morse_to_text("........", strict=True)


class RoundTripTests(unittest.TestCase):
    def test_every_supported_character(self):
        for char in morse.TEXT_TO_MORSE:
            with self.subTest(char=char):
                self.assertEqual(morse.morse_to_text(morse.text_to_morse(char)), char)

    def test_codes_are_unique(self):
        self.assertEqual(len(morse.TEXT_TO_MORSE), len(morse.MORSE_TO_TEXT))


class AutoDetectTests(unittest.TestCase):
    def test_detects_morse(self):
        self.assertEqual(morse.translate(".... .."), "HI")

    def test_detects_text(self):
        self.assertEqual(morse.translate("hi"), ".... ..")


class CliTests(unittest.TestCase):
    def run_cli(self, *argv):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            code = morse.main(list(argv))
        return code, out.getvalue().strip(), err.getvalue().strip()

    def test_auto(self):
        self.assertEqual(self.run_cli("hello", "world")[1], ".... . .-.. .-.. --- / .-- --- .-. .-.. -..")

    def test_decode_flag(self):
        self.assertEqual(self.run_cli("-d", "...", "---", "...")[1], "SOS")

    def test_encode_flag_forces_text(self):
        # "..." would auto-detect as Morse; -e treats it as three periods.
        self.assertEqual(self.run_cli("-e", "...")[1], ".-.-.- .-.-.- .-.-.-")

    def test_strict_error(self):
        code, _, err = self.run_cli("--strict", "a#")
        self.assertEqual(code, 1)
        self.assertIn("'#'", err)


if __name__ == "__main__":
    unittest.main()
