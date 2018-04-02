const bwipjs = require('bwip-js');
const PDFDocument = require('pdfkit');
const fs = require('fs');

let packageBarcode = {
    bcid: 'code128',       // Barcode type
    text: '0123456789',    // Text to encode
    scale: 3,               // 3x scaling factor
    height: 10,              // Bar height, in millimeters
    includetext: true,            // Show human-readable text
    textxalign: 'center',        // Always good to set this
};
createPDF({printables: {packageBarcode,
                        serialBarcode: packageBarcode,
                        anumBarcode: packageBarcode}})
    .then(result => {
        console.log(result);
    });

async function createPDF({printables: {packageBarcode, 
                                       serialBarcode,
                                       anumBarcode,
                                       toAddress,
                                       fromAddress,
                                       stamp},
                            writeStream}){
    //Create promises for multi barcode creations, and then run inside Promise.all
    let packagePromise = barcodePromise({barcodeOptions: packageBarcode});
    let serialPromise = barcodePromise({barcodeOptions: serialBarcode});
    let anumPromise = barcodePromise({barcodeOptions: anumBarcode});

    //Check promises are completed before finalizing the pdf.
    return Promise.all([packagePromise, serialPromise, anumPromise])
        .then(([packageBar, serialBar, anumBar]) => {
            return finalizePDF({pngs: {packageBar, serialBar, anumBar},
                                writeStream});
        })
        .then(result => {
            return result;
        })
        .catch(error => {
            return error;
        });
};

function barcodePromise({barcodeOptions}) {
    return new Promise((resolve, reject) => {
        bwipjs.toBuffer(barcodeOptions, function (err, png) {
            if (err) {
                // Decide how to handle the error
                // `err` may be a string or Error object
                reject(err);
            } else {
                // `png` is a Buffer
                // png.length           : PNG file length
                // png.readUInt32BE(16) : PNG image width
                // png.readUInt32BE(20) : PNG image height
                resolve(png);
            }
        });
    });
};

//Need to provide either a writeStream or a save location.
function finalizePDF({pngs: {packageBar, serialBar, anumBar},
                      writeStream,
                      saveLoc = __dirname + "/test.pdf" }){
    return new Promise((resolve, reject) => {
        try{
            let doc = new PDFDocument();
            if (writeStream) {
                //do some logic to use the buffer instead of filesystem
                doc.pipe(writeStream); //will be the response for http
            } else {
                doc.pipe(fs.createWriteStream(saveLoc));
            }
            doc.image(packageBar, { width: 100 })
                .image(serialBar, {width: 100})
                .image(anumBar, {width: 80});
            doc.end();
            resolve("PDF creation successful.")
        } catch(error){
            reject(error);
        }
    });
};