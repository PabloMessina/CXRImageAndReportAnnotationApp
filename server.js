const express = require('express');
const app = express();
const port = 3001;
const APP_NAME = 'cxr_annotations_v2';

// load some environment variables from .env file
require('dotenv').config();
const MIMICCXR_JPG_IMAGES_LARGE_DIR = process.env.MIMICCXR_JPG_IMAGES_LARGE_DIR;
const MIMICCXR_JPG_IMAGES_MEDIUM_DIR = process.env.MIMICCXR_JPG_IMAGES_MEDIUM_DIR;
const MIMICCXR_JPG_IMAGES_SMALL_DIR = process.env.MIMICCXR_JPG_IMAGES_SMALL_DIR;

console.log(`MIMICCXR_JPG_IMAGES_LARGE_DIR: ${MIMICCXR_JPG_IMAGES_LARGE_DIR}`)
console.log(`MIMICCXR_JPG_IMAGES_MEDIUM_DIR: ${MIMICCXR_JPG_IMAGES_MEDIUM_DIR}`)
console.log(`MIMICCXR_JPG_IMAGES_SMALL_DIR: ${MIMICCXR_JPG_IMAGES_SMALL_DIR}`)

// Serve static files from the React app
let staticDir;
if (process.env.NODE_ENV === 'production') {
    staticDir = 'build';
} else {
    staticDir = 'public';
}
app.use(express.static(staticDir));

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// If we receive any GET request, log it and pass it on
app.get('*', (req, res, next) => {
    console.log('GET *');
    next();
});

// API endpoint to get the default metadata
function get_default_metadata(req, res) {
    // load json file from local directory
    const metadata = require('./report_metadata.json');
    res.json(metadata);
}
app.get('/api/default_metadata', get_default_metadata);
app.get(`/${APP_NAME}/api/default_metadata`, get_default_metadata);

// API endpoint for serving large images
function get_large_image(req, res) {
    const { partId, subjectId, studyId, dicomId } = req.params;
    const imagePath = `${MIMICCXR_JPG_IMAGES_LARGE_DIR}/p${partId}/p${subjectId}/s${studyId}/${dicomId}.jpg`;
    console.log(`Sending image ${imagePath}`);
    res.sendFile(imagePath);
}
app.get('/api/images-large/:partId/:subjectId/:studyId/:dicomId', get_large_image);
app.get(`/${APP_NAME}/api/images-large/:partId/:subjectId/:studyId/:dicomId`, get_large_image);

// API endpoint for serving medium images
function get_medium_image(req, res) {
    const { partId, subjectId, studyId, dicomId } = req.params;
    const imagePath = `${MIMICCXR_JPG_IMAGES_MEDIUM_DIR}/p${partId}/p${subjectId}/s${studyId}/${dicomId}.jpg`;
    console.log(`Sending image ${imagePath}`);
    res.sendFile(imagePath);
}
app.get('/api/images-medium/:partId/:subjectId/:studyId/:dicomId', get_medium_image);
app.get(`/${APP_NAME}/api/images-medium/:partId/:subjectId/:studyId/:dicomId`, get_medium_image);

// API endpoint for serving small images
function get_small_image(req, res) {
    const { partId, subjectId, studyId, dicomId } = req.params;
    const imagePath = `${MIMICCXR_JPG_IMAGES_SMALL_DIR}/p${partId}/p${subjectId}/s${studyId}/${dicomId}.jpg`;
    console.log(`Sending image ${imagePath}`);
    res.sendFile(imagePath);
}
app.get('/api/images-small/:partId/:subjectId/:studyId/:dicomId', get_small_image);
app.get(`/${APP_NAME}/api/images-small/:partId/:subjectId/:studyId/:dicomId`, get_small_image);
