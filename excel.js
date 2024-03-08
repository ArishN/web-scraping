const fs = require('fs');
const axios = require('axios');
const xlsx = require('xlsx');
const cheerio = require('cheerio');

async function downloadAndConvertToJSON() {
    try {
        // Make a request to RBI's website to get the Excel file URLs
        const response = await axios.get('https://rbi.org.in/Scripts/bs_viewcontent.aspx?Id=2009');
        const excelFileUrls = extractExcelUrls(response.data).slice(35);

        // Define the batch size
        const batchSize = 5;

        // Split the Excel file URLs into batches
        const batches = splitIntoBatches(excelFileUrls, batchSize);

        // Process each batch
        for (const batch of batches) {
            // Process each Excel file in the batch sequentially
            for (const url of batch) {
                try {
                    const excelData = (await axios.get(url.url, { responseType: 'arraybuffer' })).data;
                    const dataArray = await readExcelData(excelData);
                    const jsonData = convertArrayToJson(dataArray);
                    storeJsonFile(jsonData, url.text);
                } catch (error) {
                    console.error(`Error processing Excel file from URL: ${url.url}`, error);
                    continue;
                }
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
function extractExcelUrls(html) {
    const $ = cheerio.load(html);
    const excelUrls = [];

    $('a[href$=".xlsx"]').each((index, element) => {
        const url = $(element).attr('href');
        const text = $(element).text();
        excelUrls.push({ url, text });
    });

    return excelUrls;
}

function splitIntoBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
        batches.push(array.slice(i, i + batchSize));
    }
    return batches;
}

async function readExcelData(excelData) {
    // Create a temporary file with the Excel data
    const tempFilePath = 'temp.xlsx';
    fs.writeFileSync(tempFilePath, excelData);

    // Read the Excel file
    const workbook = xlsx.readFile(tempFilePath);

    // Assume the first sheet is the relevant one
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    // Convert worksheet to JSON array
    const dataArray = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // Delete the temporary file
    fs.unlinkSync(tempFilePath);

    return dataArray;
}

function convertArrayToJson(dataArray) {
    const keys = dataArray[0];
    const jsonData = dataArray.slice(1).map(row => {
        const obj = {};
        row.forEach((value, index) => {
            obj[keys[index]] = value;
        });
        return obj;
    });
    return JSON.stringify(jsonData, null, 2);
}

function storeJsonFile(jsonData, filename) {
    const filePath = `${filename}.json`;
    fs.writeFileSync(filePath, jsonData);
}

// Call the function to start the process
downloadAndConvertToJSON();
