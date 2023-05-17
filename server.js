const express = require('express');
const app = express();
const port = 3000;

// load some environment variables from .env file
require('dotenv').config();
const MIMICCXR_JPG_IMAGES_LARGE_DIR = process.env.MIMICCXR_JPG_IMAGES_LARGE_DIR;
const MIMICCXR_JPG_IMAGES_MEDIUM_DIR = process.env.MIMICCXR_JPG_IMAGES_MEDIUM_DIR;
const MIMICCXR_JPG_IMAGES_SMALL_DIR = process.env.MIMICCXR_JPG_IMAGES_SMALL_DIR;

console.log(`MIMICCXR_JPG_IMAGES_LARGE_DIR: ${MIMICCXR_JPG_IMAGES_LARGE_DIR}`)
console.log(`MIMICCXR_JPG_IMAGES_MEDIUM_DIR: ${MIMICCXR_JPG_IMAGES_MEDIUM_DIR}`)
console.log(`MIMICCXR_JPG_IMAGES_SMALL_DIR: ${MIMICCXR_JPG_IMAGES_SMALL_DIR}`)

app.use(express.static('public'));

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// If /api or any nested route is requested, print a message and delegate to the next middleware
app.get('/api/*', (req, res, next) => {
    console.log('GET /api/*');
    next();
});

// API endpoint to get the default metadata
app.get('/api/default_metadata', (req, res) => {
    console.log('GET /api/default_metadata');
    // load json file from local directory
    const metadata = require('./report_metadata.json');
    res.json(metadata);
});

// API endpoint for serving large images
app.get('/api/images-large/:partId/:subjectId/:studyId/:dicomId', (req, res) => {
    const { partId, subjectId, studyId, dicomId } = req.params;
    const imagePath = `${MIMICCXR_JPG_IMAGES_LARGE_DIR}/p${partId}/p${subjectId}/s${studyId}/${dicomId}.jpg`;
    console.log(`Sending image ${imagePath}`);
    res.sendFile(imagePath);
});

// API endpoint for serving medium images
app.get('/api/images-medium/:partId/:subjectId/:studyId/:dicomId', (req, res) => {
    const { partId, subjectId, studyId, dicomId } = req.params;
    const imagePath = `${MIMICCXR_JPG_IMAGES_MEDIUM_DIR}/p${partId}/p${subjectId}/s${studyId}/${dicomId}.jpg`;
    console.log(`Sending image ${imagePath}`);
    res.sendFile(imagePath);
});

// API endpoint for serving small images
app.get('/api/images-small/:partId/:subjectId/:studyId/:dicomId', (req, res) => {
    const { partId, subjectId, studyId, dicomId } = req.params;
    const imagePath = `${MIMICCXR_JPG_IMAGES_SMALL_DIR}/p${partId}/p${subjectId}/s${studyId}/${dicomId}.jpg`;
    console.log(`Sending image ${imagePath}`);
    res.sendFile(imagePath);
});
