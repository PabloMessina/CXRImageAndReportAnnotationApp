import React, { useEffect, useState, useRef } from "react";
import styles from "./ImageAnnotationModal.css";
import store from '../store';

function drawPolygon(context, points, color, close = true, number = null) {
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
        context.lineTo(points[i][0], points[i][1]);
    }
    if (close) context.closePath();
    context.lineWidth = 2;
    context.strokeStyle = color;
    context.stroke();
    if (number !== null) {
        // draw a number in the center of the polygon
        let sumX = 0;
        let sumY = 0;
        for (let i = 0; i < points.length; i++) {
            sumX += points[i][0];
            sumY += points[i][1];
        }
        const centerX = sumX / points.length;
        const centerY = sumY / points.length;
        context.font = '30px Arial';
        context.fillStyle = color;
        context.fillText(number, centerX - 15, centerY);
    }
}

function drawScene(context, image, polygons, partialPolygon) {
    context.drawImage(image, 0, 0);
    for (let i = 0; i < polygons.length; i++) {
        drawPolygon(context, polygons[i], 'red', true, i+1);
    }
    if (partialPolygon.length > 0) {
        drawPolygon(context, partialPolygon, 'blue', false);
    }
}

function euclideanDistance(x1, y1, x2, y2) {
    return Math.sqrt(
        (x1 - x2) * (x1 - x2) +
        (y1 - y2) * (y1 - y2)
    );
}

function getDeletePolygonButtonCallback(report_data, labelName, dicomId, index, setNumberOfPolygons,
                                        canvasRef, imageRef, currentPolygonRef) {
    return () => {
        report_data.delete_polygon_for_gt_label(labelName, dicomId, index);
        const polygon_list = report_data.get_polygons_for_gt_label(labelName, dicomId);
        const context = canvasRef.current.getContext('2d');
        const image = imageRef.current;
        const currentPolygon = currentPolygonRef.current;
        setNumberOfPolygons(polygon_list.length);
        drawScene(context, image, polygon_list, currentPolygon);
    };
}

function ImageAnnotationModal({ labelName, imageMetadata, onClose }) {
    const { partId, subjectId, studyId, dicomId, viewPos } = imageMetadata;
    const header_text = `High Resolution Image (viewPos: ${viewPos}, partId: ${partId}, ` +
                        `subjectId: ${subjectId}, studyId: ${studyId}, dicomId: ${dicomId})`;
    const imageUrl = `/api/images-large/${partId}/${subjectId}/${studyId}/${dicomId}`;

    const report_data = store.get('report_data');

    let polygon_list = report_data.get_polygons_for_gt_label(labelName, dicomId);
    
    const canvasRef = useRef(null);
    const imageRef = useRef(null);
    const currentPolygonRef = useRef([]);
    const [numberOfPolygons, setNumberOfPolygons] = useState(polygon_list.length);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const image = new Image();
        image.src = imageUrl;
        image.onload = () => {
            canvas.width = image.width;
            canvas.height = image.height;
            drawScene(context, image, polygon_list, currentPolygonRef.current);
        };
        imageRef.current = image;
        
        const handleMouseDown = event => {
            // console.log(`handleMouseDown, event: ${event}`);
            const { offsetX, offsetY } = event;
            if (currentPolygonRef.current.length > 0) {
                if (currentPolygonRef.current.length > 3) { // polygon must have at least 3 points
                    // compute distance from first point to last point
                    const [firstX, firstY] = currentPolygonRef.current[0];
                    const dist_from_first = euclideanDistance(firstX, firstY, offsetX, offsetY);
                    if (dist_from_first < 10) { // if close enough, then close the polygon
                        const currentPolygon = currentPolygonRef.current.slice();
                        currentPolygon.pop(); // remove last point, which is (approximately) the same as first point
                        // add polygon to report data
                        report_data.add_polygon_for_gt_label(labelName, dicomId, currentPolygon);
                        polygon_list = report_data.get_polygons_for_gt_label(labelName, dicomId);
                        setNumberOfPolygons(polygon_list.length);
                        // reset current polygon
                        currentPolygonRef.current = [];
                        // re-draw image with new polygon
                        drawScene(context, image, polygon_list, currentPolygonRef.current);
                        return;
                    }
                }
                // check if new point is too close to any existing point
                let too_close = false;
                for (let i = 0; i < currentPolygonRef.current.length-1; i++) {
                    const [x, y] = currentPolygonRef.current[i];
                    const dist = euclideanDistance(x, y, offsetX, offsetY);
                    if (dist < 10) {
                        too_close = true;
                        break;
                    }
                }
                if (too_close) return;
                // remove draggable point
                currentPolygonRef.current.pop();
                // add point to current polygon twice
                currentPolygonRef.current.push([offsetX, offsetY]);
                currentPolygonRef.current.push([offsetX, offsetY]); // the second point will be dragged around on mousemove
                // re-draw image with new point
                drawScene(context, image, polygon_list, currentPolygonRef.current);
                return;
            }
            // add point to current polygon twice
            currentPolygonRef.current.push([offsetX, offsetY]);
            currentPolygonRef.current.push([offsetX, offsetY]); // the second point will be dragged around on mousemove
            // re-draw image with new point
            drawScene(context, image, polygon_list, currentPolygonRef.current);
        };

        const handleMouseMove = event => {
            // console.log('handleMouseMove');
            if (currentPolygonRef.current.length === 0) return;
            const { offsetX, offsetY } = event;
            // update last point in current polygon
            currentPolygonRef.current[currentPolygonRef.current.length-1] = [offsetX, offsetY];
            // re-draw image with new point
            drawScene(context, image, polygon_list, currentPolygonRef.current);
        };

        const handleKeyDown = event => {
            if (event.ctrlKey && event.key === 'z') {
                event.preventDefault();
                if (currentPolygonRef.current.length > 2) {
                    const lastPoint = currentPolygonRef.current.pop();
                    const secondLastPoint = currentPolygonRef.current.pop();
                    if (euclideanDistance(lastPoint[0], lastPoint[1], secondLastPoint[0], secondLastPoint[1]) < 10) {
                        // if last point is close enough to second last point, then remove the third last point
                        currentPolygonRef.current.pop();
                    }
                    currentPolygonRef.current.push(lastPoint); // put the last point back in because
                    // it's the one that's being dragged around on mousemove
                } else {
                    // empty current polygon
                    currentPolygonRef.current = [];
                }
                // re-draw image with new point
                drawScene(context, image, polygon_list, currentPolygonRef.current);
            } else if (event.key === 'Escape') {
                // empty current polygon
                currentPolygonRef.current = [];
                // re-draw image with new point
                drawScene(context, image, polygon_list, currentPolygonRef.current);
            }
        };
      
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    let deletePolygonButtons = [];
    for (let i = 0; i < numberOfPolygons; i++) {
        const callback = getDeletePolygonButtonCallback(
            report_data, labelName, dicomId, i, setNumberOfPolygons, 
            canvasRef, imageRef, currentPolygonRef);
        deletePolygonButtons.push(
            <button key={i} onClick={callback}>Delete Polygon {i+1}</button>
        );
    }
    
    return (
        <div className={styles["modal-overlay"]}>
            <div className={styles["modal-content"]}>
                <div className={styles["modal-header"]}> {header_text} </div>
                <div className={styles["modal-body"]}>
                    <div className={styles["split-container"]}>
                        <div className={styles["sidebar"]}>
                            <h3>Finding visual evidence for "{labelName}" label</h3>
                            <h3>Instructions</h3>
                            <span>
                                Click to add points and draw polygons around areas where <b>"{labelName}"</b> is present.
                                Use Ctrl-Z to undo individual points. Use Esc to fully clear current polygon.
                            </span>
                            <h3>Number of polygons: {numberOfPolygons}</h3>
                            {deletePolygonButtons}
                        </div>
                        <div className={styles["canvas-container"]}>
                            <canvas ref={canvasRef} />
                        </div>
                    </div>
                </div>
            </div>
            <button className={styles["upper-right-corner-fixed-button"]} onClick={onClose}>Close</button>
        </div>
    );
}

export default ImageAnnotationModal;