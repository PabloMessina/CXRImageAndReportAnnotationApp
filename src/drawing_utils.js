const _20COLORS = [
    '#1abc9c', // turquoise
    '#2ecc71', // emerald
    '#3498db', // peter river
    '#9b59b6', // amethyst
    '#34495e', // wet asphalt
    '#16a085', // green sea
    '#27ae60', // nephritis
    '#2980b9', // belize hole
    '#8e44ad', // wisteria
    '#2c3e50', // midnight blue
    '#f1c40f', // sun flower
    '#e67e22', // carrot
    '#e74c3c', // alizarin
    '#ecf0f1', // clouds
    '#95a5a6', // concrete
    '#f39c12', // orange
    '#d35400', // pumpkin
    '#c0392b', // pomegranate
    '#bdc3c7', // silver
    '#7f8c8d' // asbestos
];

function drawPolygon(context, points, color, close = true, number = null, text = null) {
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
        context.lineTo(points[i][0], points[i][1]);
    }
    if (close) context.closePath();
    context.lineWidth = 2;
    context.strokeStyle = color;
    context.stroke();
    if (number !== null || text !== null) {
        // find the center of the polygon
        let sumX = 0;
        let sumY = 0;
        for (let i = 0; i < points.length; i++) {
            sumX += points[i][0];
            sumY += points[i][1];
        }
        const centerX = sumX / points.length;
        const centerY = sumY / points.length;
        if (number !== null) {
            // draw a number in the center of the polygon
            context.font = '30px Arial';
            context.fillStyle = color;
            // calculate the width and height of the number when drawn
            const numberWidth = context.measureText(number).width;
            const numberHeight = context.measureText('M').width;
            context.fillText(number, centerX - numberWidth / 2, centerY + numberHeight / 2);
        }
        if (text !== null) {
            // draw a text in the center of the polygon
            context.font = '13px Arial';
            context.fillStyle = color;
            // calculate the width and height of the text
            const textWidth = context.measureText(text).width;
            const textHeight = context.measureText('M').width;
            context.fillText(text, centerX - textWidth / 2, centerY + textHeight / 2);
        }
    }
}

function drawMultiplePolygons(context, polygons, label_names = null, colors = _20COLORS) {
    for (let i = 0; i < polygons.length; i++) { // for each label
        for (let j = 0; j < polygons[i].length; j++) { // for each polygon
            if (label_names !== null) {
                drawPolygon(context, polygons[i][j], colors[i % colors.length], true, null, label_names[i]);
            } else {
                drawPolygon(context, polygons[i][j], colors[i % colors.length]);
            }
        }
    }
}

function euclideanDistance(x1, y1, x2, y2, w=1, h=1) {
    // denormalize coordinates
    x1 *= w; y1 *= h; x2 *= w; y2 *= h;
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

export { drawPolygon, drawMultiplePolygons, euclideanDistance };