const { jsPDF } = require("jspdf");

// read the ts file directly to extract the base64 string
const fs = require('fs');
const tsContent = fs.readFileSync('./src/fonts/bengaliFont.ts', 'utf8');
const match = tsContent.match(/const fontBase64 = "(.*?)";/);
if (!match) throw new Error("Font not found");
const fontBase64 = match[1];

const doc = new jsPDF();
doc.addFileToVFS('NotoSansBengali-Regular.ttf', fontBase64);
doc.addFont('NotoSansBengali-Regular.ttf', 'NotoSansBengali', 'normal');
doc.setFont('NotoSansBengali', 'normal');
doc.text("অফিসিয়াল ডকুমেন্ট", 20, 20);
doc.save("test_bengali.pdf");
console.log("Saved test_bengali.pdf");
