**Matematycznie równe nie znaczy równe dla oka.**

Pokazujemy, że kształty o tych samych wymiarach nie wyglądają na równe. Korygujemy je optycznie, a o tym, ile przesunąć, decyduje masa kształtu, nie bounding box.

- Kwadrat vs koło 24×24: kwadrat wygląda na większy, koło lekko wychodzi poza linię (overshoot)
- Ikonka play w kółku: wszyscy przesuwaliśmy trójkąt, żeby był optycznie na środku
- Ikony: korekta zależy od masy, jaką mają w rogach
  - keyline ikon Material: kwadrat 18×18, koło Ø 20, prostokąty 16×20 / 20×16
  - ikona = symbol + area: pole optyczne, nie bounding box
- Grubość linii: 2 px przy 24 px; Material Symbols mają optical size 20 / 24 / 40 / 48
- Typografia: „O”, „S”, „e” wychodzą pod linię bazową i ponad x-height
- Tekst w przycisku centrujemy optycznie, nie po bounding boxie
