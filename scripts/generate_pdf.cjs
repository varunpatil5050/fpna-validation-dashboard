const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('Launching Chrome for PDF generation...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  // Wait for fonts and styles to settle
  await new Promise((r) => setTimeout(r, 1500));

  // Prepare page styling for PDF export:
  // - Make header static so it sits cleanly at the top of page 1
  // - Ensure background colors and gradients print with full fidelity
  await page.evaluate(() => {
    const header = document.querySelector('.header');
    if (header) {
      header.style.position = 'static';
    }

    // Add print-specific CSS for landscape zero-margin presentation
    const style = document.createElement('style');
    style.innerHTML = `
      @page {
        size: A4 landscape;
        margin: 0;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background: #0b0f17 !important;
      }
      .shell {
        max-width: 100% !important;
        padding: 20px 40px 40px !important;
      }
      .header {
        position: static !important;
        max-width: 100% !important;
        padding: 0 40px !important;
      }
      .section {
        break-inside: avoid;
        page-break-inside: avoid;
        margin-bottom: 24px !important;
        padding-top: 24px !important;
      }
      .hero {
        break-inside: avoid;
        page-break-inside: avoid;
        margin-top: 16px !important;
      }
      .card, .hyp-row-card, .problem, .unit-card, .proposition-diagram-col {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .export-btn, .icon-btn {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  });

  // Emulate screen media so charts and CSS grid render with full rich aesthetics
  await page.emulateMediaType('screen');

  const artifactDir = '/Users/varunpatil/.gemini/antigravity-ide/brain/bb210ab9-bf2e-4c22-b9ac-454ab1c4071d';
  const artifactPdfPath = path.join(artifactDir, 'fpna_market_validation_landscape.pdf');
  const localPdfPath = path.resolve(__dirname, '../fpna_market_validation_report.pdf');
  const exportsPdfPath = path.resolve(__dirname, '../exports/fpna_market_validation_report.pdf');
  const publicPdfPath = path.resolve(__dirname, '../public/exports/fpna_market_validation_report.pdf');

  console.log('Generating A4 Landscape zero-margin executive PDF...');
  await page.pdf({
    path: localPdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: {
      top: '0px',
      bottom: '0px',
      left: '0px',
      right: '0px'
    }
  });

  // Save copies to exports, public, and artifact directories
  fs.copyFileSync(localPdfPath, artifactPdfPath);
  fs.copyFileSync(localPdfPath, exportsPdfPath);
  fs.copyFileSync(localPdfPath, publicPdfPath);

  console.log('PDF generated successfully:');
  console.log('Landscape Zero-Margin Executive Report:', localPdfPath);

  await browser.close();
})();
