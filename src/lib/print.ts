export function printFileUrl(url: string): void {
  const printWindow = window.open(url, "_blank", "noopener,noreferrer");

  if (printWindow) {
    printWindow.addEventListener("load", () => {
      printWindow.focus();
      printWindow.print();
    });
    return;
  }

  window.location.href = url;
}
