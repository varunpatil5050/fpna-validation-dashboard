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

    // Add print-specific CSS
    const style = document.createElement('style');
    style.innerHTML = `
      @page {
        size: A4 portrait;
        margin: 12mm 10mm;
      }
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
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
        margin-top: 10px !important;
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

  // Emulate print media
  await page.emulateMediaType('screen');

  const artifactDir = '/Users/varunpatil/.gemini/antigravity-ide/brain/bb210ab9-bf2e-4c22-b9ac-454ab1c4071d';
  const artifactPdfPath = path.join(artifactDir, 'fpna_dashboard_report.pdf');
  const localPdfPath = path.resolve(__dirname, 'fpna_market_validation_report.pdf');

  // Also create a presentation continuous PDF (1440px wide) that looks exactly like the live website
  const continuousPdfPath = path.resolve(__dirname, 'fpna_dashboard_continuous.pdf');

  console.log('Generating paginated A4 executive report PDF...');
  await page.pdf({
    path: localPdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '12mm',
      bottom: '12mm',
      left: '10mm',
      right: '10mm'
    }
  });

  // Save copy to artifact dir
  fs.copyFileSync(localPdfPath, artifactPdfPath);

  console.log('Generating full-width continuous presentation PDF...');
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  await page.pdf({
    path: continuousPdfPath,
    width: '1440px',
    height: `${bodyHeight + 50}px`,
    printBackground: true,
    margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' }
  });

  console.log('PDFs generated successfully:');
  console.log('1. A4 Executive Report:', localPdfPath);
  console.log('2. Continuous Full-Width Presentation:', continuousPdfPath);

  await browser.close();
})();
