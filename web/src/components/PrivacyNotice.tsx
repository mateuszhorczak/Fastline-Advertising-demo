export function PrivacyNotice() {
  return (
    <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700">
      <strong className="font-semibold text-slate-900">Prywatność:</strong> tekst z pliku (a dla
      stron bez tekstu — ich obraz) jest wysyłany przez nasz serwer do Google Gemini API w celu
      analizy. Przy darmowym planie Google może wykorzystywać przesłane dane do ulepszania swoich
      usług, dlatego nie wgrywaj dokumentów poufnych. Serwer nie zapisuje plików; historia analiz
      jest przechowywana wyłącznie w Twojej przeglądarce.
    </p>
  )
}
