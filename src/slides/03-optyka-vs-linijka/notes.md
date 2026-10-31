**Matematycznie równe nie znaczy równe dla oka.**

- Kwadrat vs koło 24×24: kwadrat wygląda na większy
  - koło musi lekko wyjść poza linię (overshoot)
  - keyline ikon Material: kwadrat 18×18, koło Ø 20, prostokąty 16×20 / 20×16
- Ikona = symbol + area: pole optyczne, nie bounding box
- Grubość linii vs rozmiar ikony: 2 px przy 24 px, przy skalowaniu linia też musi się zmieniać
  - Material Symbols: optical size 20 / 24 / 40 / 48
  - eksport SVG: skalowanie grubości linii (ciekawostka techniczna)
- Typografia: „O”, „S”, „e” zjeżdżają brzuszkiem pod linię bazową i ponad x-height
- Przykłady z UI: trójkąt „play” przesunięty w prawo, tekst w przycisku centrowany optycznie, nie po bounding boxie
