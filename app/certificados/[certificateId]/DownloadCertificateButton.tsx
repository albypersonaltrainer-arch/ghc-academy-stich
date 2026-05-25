'use client';

export default function DownloadCertificateButton() {
  function handleDownload() {
    window.print();
  }

  return (
    <button type="button" className="download-diploma-button" onClick={handleDownload}>
      Descargar diploma
    </button>
  );
}
